import asyncio
import base64
import json
import logging
import uuid
from typing import Callable, Optional

import aiohttp

logger = logging.getLogger("comfyui_client")


class ComfyClient:
    def __init__(self, base_url: str = "http://127.0.0.1:8188"):
        self._base_url = base_url
        self._ws_url = base_url.replace("http://", "ws://").replace("https://", "wss://")
        self._client_id = str(uuid.uuid4())
        self._session: Optional[aiohttp.ClientSession] = None

    @property
    def base_url(self) -> str:
        return self._base_url

    def set_base_url(self, url: str):
        self._base_url = url
        self._ws_url = url.replace("http://", "ws://").replace("https://", "wss://")

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session

    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None

    async def upload_image(
        self,
        image_data: bytes,
        filename: str,
        image_type: str = "input",
        overwrite: bool = True,
    ) -> dict:
        session = await self._get_session()
        data = aiohttp.FormData()
        data.add_field(
            "image",
            image_data,
            filename=filename,
            content_type="image/png",
        )
        data.add_field("type", image_type)
        data.add_field("overwrite", "true" if overwrite else "false")

        async with session.post(
            f"{self._base_url}/upload/image",
            data=data,
        ) as response:
            if response.status != 200:
                text = await response.text()
                raise RuntimeError(f"Upload failed: {response.status} - {text}")

            return await response.json()

    async def upload_image_base64(
        self,
        base64_data: str,
        filename: str,
        **kwargs,
    ) -> dict:
        if "," in base64_data:
            base64_data = base64_data.split(",", 1)[1]
        image_bytes = base64.b64decode(base64_data)
        return await self.upload_image(image_bytes, filename, **kwargs)

    async def queue_prompt(self, workflow: dict) -> str:
        session = await self._get_session()
        payload = {"prompt": workflow, "client_id": self._client_id}
        async with session.post(
            f"{self._base_url}/prompt",
            json=payload,
        ) as response:
            if response.status != 200:
                text = await response.text()
                raise RuntimeError(f"Queue failed: {response.status} - {text}")
            result = await response.json()
            return result.get("prompt_id")

    async def get_history(self, prompt_id: str) -> Optional[dict]:
        session = await self._get_session()
        async with session.get(
            f"{self._base_url}/history/{prompt_id}",
        ) as response:
            if response.status != 200:
                return None
            result = await response.json()
            return result.get(prompt_id)

    async def get_image(
        self,
        filename: str,
        subfolder: str = "",
        folder_type: str = "output",
    ) -> bytes:
        session = await self._get_session()
        params = {
            "filename": filename,
            "subfolder": subfolder,
            "type": folder_type,
        }
        async with session.get(
            f"{self._base_url}/view",
            params=params,
        ) as response:
            if response.status != 200:
                raise RuntimeError(f"Failed to get image: {response.status}")
            return await response.read()

    async def wait_for_completion(
        self,
        prompt_id: str,
        on_progress: Optional[Callable[[float, str], None]] = None,
        timeout: float = 600.0,
    ) -> dict:
        ws_url = f"{self._ws_url}/ws?clientId={self._client_id}"
        async with aiohttp.ClientSession() as session:
            async with session.ws_connect(ws_url) as ws:
                start_time = asyncio.get_event_loop().time()
                async for msg in ws:
                    if (asyncio.get_event_loop().time() - start_time) > timeout:
                        raise asyncio.TimeoutError("Execution timeout")

                    if msg.type == aiohttp.WSMsgType.TEXT:
                        data = json.loads(msg.data)
                        msg_type = data.get("type")
                        msg_data = data.get("data", {})

                        if msg_type == "progress":
                            value = msg_data.get("value", 0)
                            max_val = msg_data.get("max", 100)
                            progress = value / max_val if max_val > 0 else 0
                            if on_progress:
                                on_progress(progress, f"Step {value}/{max_val}")

                        elif msg_type == "executing":
                            node_id = msg_data.get("node")
                            if node_id is None and msg_data.get("prompt_id") == prompt_id:
                                if on_progress:
                                    on_progress(1.0, "完成")
                                history = await self.get_history(prompt_id)
                                return history or {}

                        elif msg_type == "execution_error":
                            if msg_data.get("prompt_id") == prompt_id:
                                error = msg_data.get("exception_message", "Unknown error")
                                raise RuntimeError(f"Execution error: {error}")

                    elif msg.type == aiohttp.WSMsgType.ERROR:
                        raise RuntimeError(f"WebSocket error: {ws.exception()}")
        return {}

    async def get_output_images(self, history: dict) -> list[bytes]:
        images: list[bytes] = []
        outputs = history.get("outputs", {})
        for node_output in outputs.values():
            if "images" in node_output:
                for image_info in node_output["images"]:
                    filename = image_info.get("filename")
                    subfolder = image_info.get("subfolder", "")
                    folder_type = image_info.get("type", "output")
                    if filename:
                        image_data = await self.get_image(
                            filename,
                            subfolder,
                            folder_type,
                        )
                        images.append(image_data)
        return images

    async def get_system_stats(self) -> dict:
        session = await self._get_session()
        async with session.get(f"{self._base_url}/system_stats") as response:
            if response.status != 200:
                raise RuntimeError(f"Failed to get stats: {response.status}")
            return await response.json()

    async def get_queue_status(self) -> dict:
        session = await self._get_session()
        async with session.get(f"{self._base_url}/prompt") as response:
            if response.status != 200:
                raise RuntimeError(f"Failed to get queue: {response.status}")
            return await response.json()

    async def interrupt(self) -> bool:
        session = await self._get_session()
        async with session.post(f"{self._base_url}/interrupt") as response:
            return response.status == 200

    async def clear_queue(self) -> bool:
        session = await self._get_session()
        async with session.post(
            f"{self._base_url}/queue",
            json={"clear": True},
        ) as response:
            return response.status == 200


_comfy_client: Optional[ComfyClient] = None


def get_comfy_client() -> ComfyClient:
    global _comfy_client
    if _comfy_client is None:
        _comfy_client = ComfyClient()
    return _comfy_client
