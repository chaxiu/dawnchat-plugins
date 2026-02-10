import logging
from typing import Any, Optional, TYPE_CHECKING

from .host_exceptions import HostAPIError
from .host_transport import DEFAULT_TIMEOUT, ProgressCallback

logger = logging.getLogger("dawnchat_sdk")

if TYPE_CHECKING:
    from .host_client import HostClient


class BrowserCapability:
    def __init__(self, host_client: "HostClient"):
        self._client = host_client

    async def login(
        self,
        url: str = "https://passport.bilibili.com/login",
        wait_for_cookie: str = "",
        timeout: int = 300,
        cookie_filename: str = "cookies.txt",
    ) -> dict[str, Any]:
        return await self._client.tools.call(
            "dawnchat.browser.login_and_export_cookies",
            arguments={
                "url": url,
                "wait_for_cookie": wait_for_cookie,
                "timeout": timeout,
                "cookie_filename": cookie_filename,
            },
        )

    async def get_cookie_info(self, filename: str = "cookies.txt") -> dict[str, Any]:
        return await self._client.tools.call(
            "dawnchat.browser.get_cookie_info",
            arguments={"filename": filename},
        )


class AICapability:
    def __init__(self, host_client: "HostClient"):
        self._client = host_client

    async def chat(
        self,
        messages: list[dict[str, Any]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "messages": messages,
            "temperature": temperature,
        }
        if model:
            payload["model"] = model
        if max_tokens:
            payload["max_tokens"] = max_tokens
        logger.debug(f"[AI.chat] Sending tool request: model={model}, messages_count={len(messages)}")
        response = await self._client._call_tool("dawnchat.ai.chat", arguments=payload)
        if isinstance(response, dict):
            if response.get("code") != 200:
                raise HostAPIError(response.get("message", "AI chat failed"))
            data = response.get("data") or {}
            return {
                "status": "success",
                "content": data.get("content", ""),
                "model": data.get("model"),
                "finish_reason": data.get("finish_reason"),
                "usage": data.get("usage"),
            }
        return response

    async def embedding(
        self,
        text: str,
        model: Optional[str] = None,
    ) -> list[float]:
        payload: dict[str, Any] = {"text": text}
        if model:
            payload["model"] = model
        response = await self._client._call_tool("dawnchat.ai.embedding", arguments=payload)
        if isinstance(response, dict):
            if response.get("code") != 200:
                raise HostAPIError(response.get("message", "Embedding failed"))
            data = response.get("data") or {}
            return data.get("embedding", [])
        return []

    async def vision_chat(
        self,
        image_path: str,
        prompt: str,
        model: Optional[str] = None,
        max_side: int = 1024,
        quality: int = 85,
    ) -> dict[str, Any]:
        args = {
            "image_path": image_path,
            "prompt": prompt,
            "max_side": max_side,
            "quality": quality,
        }
        if model is not None and str(model).strip():
            args["model"] = str(model).strip()
        return await self._client.tools.call("dawnchat.ai.vision_chat", arguments=args)


class StorageCapability:
    def __init__(self, host_client: "HostClient"):
        self._client = host_client
        self.kv = self.KV(host_client)
        self.db = self.DB(host_client)

    class KV:
        def __init__(self, host_client: "HostClient"):
            self._client = host_client

        async def get(self, key: str) -> Optional[Any]:
            response = await self._client._call_tool(
                "dawnchat.storage.kv_get",
                arguments={"key": key},
            )
            if isinstance(response, dict):
                data = response.get("data") or {}
                return data.get("value")
            return None

        async def set(self, key: str, value: Any) -> bool:
            response = await self._client._call_tool(
                "dawnchat.storage.kv_set",
                arguments={"key": key, "value": value},
            )
            if isinstance(response, dict):
                return response.get("code") == 200
            return False

        async def delete(self, key: str) -> bool:
            response = await self._client._call_tool(
                "dawnchat.storage.kv_delete",
                arguments={"key": key},
            )
            if isinstance(response, dict):
                data = response.get("data") or {}
                return bool(data.get("deleted"))
            return False

    class DB:
        def __init__(self, host_client: "HostClient"):
            self._client = host_client

        async def query(self, sql: str, params: Optional[list[Any]] = None) -> list[dict[str, Any]]:
            response = await self._client._call_tool(
                "dawnchat.storage.db_query",
                arguments={"sql": sql, "params": params or []},
            )
            if isinstance(response, dict):
                data = response.get("data") or {}
                return data.get("rows", [])
            return []


class ASRCapability:
    def __init__(self, host_client: "HostClient"):
        self._client = host_client

    async def transcribe(
        self,
        audio_path: str,
        language: Optional[str] = None,
        model_size: Optional[str] = None,
        vad_filter: bool = True,
        vad_parameters: Optional[dict[str, Any]] = None,
        word_timestamps: bool = False,
        output_format: str = "segments",
        initial_prompt: Optional[str] = None,
        hotwords: Optional[str] = None,
        prefix: Optional[str] = None,
        chunk_length: Optional[int] = None,
        condition_on_previous_text: Optional[bool] = None,
        temperature: Optional[float] = None,
        beam_size: Optional[int] = None,
        on_progress: Optional[ProgressCallback] = None,
    ) -> dict[str, Any]:
        args: dict[str, Any] = {
            "audio_path": audio_path,
            "vad_filter": vad_filter,
            "output_format": output_format,
        }
        if language is not None:
            args["language"] = language
        if model_size is not None:
            args["model_size"] = model_size
        if vad_parameters is not None:
            args["vad_parameters"] = vad_parameters
        if word_timestamps:
            args["word_timestamps"] = word_timestamps
        if initial_prompt is not None:
            args["initial_prompt"] = initial_prompt
        if hotwords is not None:
            args["hotwords"] = hotwords
        if prefix is not None:
            args["prefix"] = prefix
        if chunk_length is not None:
            args["chunk_length"] = chunk_length
        if condition_on_previous_text is not None:
            args["condition_on_previous_text"] = condition_on_previous_text
        if temperature is not None:
            args["temperature"] = temperature
        if beam_size is not None:
            args["beam_size"] = beam_size
        return await self._client.tools.call(
            "dawnchat.asr.transcribe",
            arguments=args,
            on_progress=on_progress,
        )

    async def diarize(
        self,
        audio_path: str,
        num_speakers: Optional[int] = None,
        min_speakers: Optional[int] = None,
        max_speakers: Optional[int] = None,
    ) -> dict[str, Any]:
        args: dict[str, Any] = {"audio_path": audio_path}
        if num_speakers is not None:
            args["num_speakers"] = num_speakers
        if min_speakers is not None:
            args["min_speakers"] = min_speakers
        if max_speakers is not None:
            args["max_speakers"] = max_speakers
        return await self._client.tools.call("dawnchat.asr.diarize", arguments=args)

    async def transcribe_with_speakers(
        self,
        audio_path: str,
        language: Optional[str] = None,
        model_size: Optional[str] = None,
        num_speakers: Optional[int] = None,
    ) -> dict[str, Any]:
        transcribe_result = await self.transcribe(
            audio_path=audio_path,
            language=language,
            model_size=model_size,
            output_format="segments",
        )
        if transcribe_result.get("code") != 200:
            return transcribe_result
        diarize_result = await self.diarize(
            audio_path=audio_path,
            num_speakers=num_speakers,
        )
        if diarize_result.get("code") != 200:
            return transcribe_result
        merge_result = await self._client.tools.call(
            "dawnchat.asr.merge_speakers",
            arguments={
                "diarization_segments": diarize_result.get("data", {}).get("segments", []),
                "transcription_segments": transcribe_result.get("data", {}).get("segments", []),
            },
        )
        if merge_result.get("code") == 200:
            return {
                "code": 200,
                "message": "success",
                "data": {
                    "segments": merge_result.get("data", {}).get("segments", []),
                    "speakers": diarize_result.get("data", {}).get("speakers", []),
                    "text": transcribe_result.get("data", {}).get("text", ""),
                    "language": transcribe_result.get("data", {}).get("language"),
                    "duration": transcribe_result.get("data", {}).get("duration"),
                },
            }
        return transcribe_result

    async def list_models(self) -> dict[str, Any]:
        return await self._client.tools.call("dawnchat.asr.list_models")

    async def status(self) -> dict[str, Any]:
        return await self._client.tools.call("dawnchat.asr.status")


class MediaCapability:
    def __init__(self, host_client: "HostClient"):
        self._client = host_client

    async def extract_frames(
        self,
        video_path: str,
        output_dir: str,
        fps: int = 1,
    ) -> dict[str, Any]:
        return await self._client.tools.call(
            "dawnchat.media.extract_frames",
            arguments={
                "video_path": video_path,
                "output_dir": output_dir,
                "fps": fps,
            },
        )

    async def extract_audio(
        self,
        video_path: str,
        output_path: str,
        sample_rate: int = 16000,
        channels: int = 1,
        audio_format: str = "wav",
    ) -> dict[str, Any]:
        return await self._client.tools.call(
            "dawnchat.media.extract_audio",
            arguments={
                "video_path": video_path,
                "output_path": output_path,
                "sample_rate": sample_rate,
                "channels": channels,
                "audio_format": audio_format,
            },
        )

    async def ensure_standard(
        self,
        media_path: str,
        output_dir: str,
        sample_rate: int = 16000,
        channels: int = 1,
        keep_video: bool = True,
    ) -> dict[str, Any]:
        return await self._client.tools.call(
            "dawnchat.media.ensure_standard",
            arguments={
                "media_path": media_path,
                "output_dir": output_dir,
                "sample_rate": sample_rate,
                "channels": channels,
                "keep_video": keep_video,
            },
        )

    async def get_info(self, media_path: str) -> dict[str, Any]:
        return await self._client.tools.call(
            "dawnchat.media.get_info",
            arguments={"media_path": media_path},
        )

    async def normalize_audio(
        self,
        audio_path: str,
        output_path: str,
        target_loudness: float = -23.0,
    ) -> dict[str, Any]:
        return await self._client.tools.call(
            "dawnchat.media.normalize_audio",
            arguments={
                "audio_path": audio_path,
                "output_path": output_path,
                "target_loudness": target_loudness,
            },
        )

    async def extract_frame_at(
        self,
        video_path: str,
        output_path: str,
        timestamp: float,
        quality: int = 2,
    ) -> dict[str, Any]:
        return await self._client.tools.call(
            "dawnchat.media.extract_frame_at",
            arguments={
                "video_path": video_path,
                "output_path": output_path,
                "timestamp": timestamp,
                "quality": quality,
            },
        )

    async def extract_frames_batch(
        self,
        video_path: str,
        output_dir: str,
        timestamps: list[float],
        quality: int = 2,
    ) -> dict[str, Any]:
        return await self._client.tools.call(
            "dawnchat.media.extract_frames_batch",
            arguments={
                "video_path": video_path,
                "output_dir": output_dir,
                "timestamps": timestamps,
                "quality": quality,
            },
        )

    async def scene_detect(
        self,
        video_path: str,
        threshold: float = 27.0,
        min_scene_len: int = 15,
    ) -> dict[str, Any]:
        return await self._client.tools.call(
            "dawnchat.media.scene_detect",
            arguments={
                "video_path": video_path,
                "threshold": threshold,
                "min_scene_len": min_scene_len,
            },
        )

    async def download(
        self,
        url: str,
        output_dir: str,
        audio_only: bool = False,
        format_spec: Optional[str] = None,
        subtitle_langs: Optional[list[str]] = None,
        cookies_path: Optional[str] = None,
        download_subtitles: bool = True,
        download_thumbnail: bool = True,
        download_video: bool = True,
    ) -> dict[str, Any]:
        args: dict[str, Any] = {
            "url": url,
            "output_dir": output_dir,
            "audio_only": audio_only,
            "format_spec": format_spec,
            "download_subtitles": download_subtitles,
            "download_thumbnail": download_thumbnail,
            "download_video": download_video,
        }
        if subtitle_langs is not None:
            args["subtitle_langs"] = subtitle_langs
        if cookies_path is not None:
            args["cookies_path"] = cookies_path
        return await self._client.tools.call(
            "dawnchat.media.download",
            arguments=args,
        )

    async def get_video_info(self, url: str) -> dict[str, Any]:
        return await self._client.tools.call(
            "dawnchat.media.get_video_info",
            arguments={"url": url},
        )

    async def create_video(
        self,
        image_path: str,
        audio_path: str,
        output_path: str,
    ) -> dict[str, Any]:
        return await self._client.tools.call(
            "dawnchat.media.create_video",
            arguments={
                "image_path": image_path,
                "audio_path": audio_path,
                "output_path": output_path,
            },
        )

    async def check_ffmpeg(self, install_if_missing: bool = False) -> dict[str, Any]:
        return await self._client.tools.call(
            "dawnchat.media.check_ffmpeg",
            arguments={"install_if_missing": install_if_missing},
        )


class ImageGenCapability:
    def __init__(self, host_client: "HostClient"):
        self._client = host_client

    async def text_to_image(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 1024,
        height: int = 1024,
        steps: int = 20,
        cfg_scale: float = 7.0,
        seed: int = -1,
        model_name: Optional[str] = None,
        workflow_id: Optional[str] = None,
        on_progress: Optional[ProgressCallback] = None,
    ) -> dict[str, Any]:
        args: dict[str, Any] = {
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "width": width,
            "height": height,
            "steps": steps,
            "cfg_scale": cfg_scale,
            "seed": seed,
        }
        if model_name:
            args["model_name"] = model_name
        if workflow_id:
            args["workflow_id"] = workflow_id
        return await self._client.tools.call(
            "dawnchat.image_gen.text_to_image",
            arguments=args,
            on_progress=on_progress,
        )

    async def image_to_image(
        self,
        image_path: str,
        prompt: str,
        negative_prompt: str = "",
        strength: float = 0.6,
        steps: int = 20,
        model_name: Optional[str] = None,
        workflow_id: Optional[str] = None,
        on_progress: Optional[ProgressCallback] = None,
    ) -> dict[str, Any]:
        args: dict[str, Any] = {
            "image_path": image_path,
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "strength": strength,
            "steps": steps,
        }
        if model_name:
            args["model_name"] = model_name
        if workflow_id:
            args["workflow_id"] = workflow_id
        return await self._client.tools.call(
            "dawnchat.image_gen.image_to_image",
            arguments=args,
            on_progress=on_progress,
        )

    async def inpaint(
        self,
        image_path: str,
        mask_path: str,
        prompt: str,
        negative_prompt: str = "",
        strength: float = 0.8,
        steps: int = 25,
        model_name: Optional[str] = None,
        workflow_id: Optional[str] = None,
        on_progress: Optional[ProgressCallback] = None,
    ) -> dict[str, Any]:
        args: dict[str, Any] = {
            "image_path": image_path,
            "mask_path": mask_path,
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "strength": strength,
            "steps": steps,
        }
        if model_name:
            args["model_name"] = model_name
        if workflow_id:
            args["workflow_id"] = workflow_id
        return await self._client.tools.call(
            "dawnchat.image_gen.inpaint",
            arguments=args,
            on_progress=on_progress,
        )

    async def upscale(
        self,
        image_path: str,
        scale: int = 4,
        model_name: Optional[str] = None,
        workflow_id: Optional[str] = None,
    ) -> dict[str, Any]:
        args: dict[str, Any] = {
            "image_path": image_path,
            "scale": scale,
        }
        if model_name:
            args["model_name"] = model_name
        if workflow_id:
            args["workflow_id"] = workflow_id
        return await self._client.tools.call(
            "dawnchat.image_gen.upscale",
            arguments=args,
        )

    async def get_status(self) -> dict[str, Any]:
        return await self._client._request(
            "GET",
            "/api/image-gen/status",
        )

    async def start_service(self) -> dict[str, Any]:
        return await self._client._request(
            "POST",
            "/api/image-gen/start",
        )

    async def stop_service(self) -> dict[str, Any]:
        return await self._client._request(
            "POST",
            "/api/image-gen/stop",
        )

    async def list_models(
        self,
        task_type: Optional[str] = None,
        installed_only: bool = False,
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {}
        if task_type:
            params["task_type"] = task_type
        if installed_only:
            params["installed_only"] = "true"
        response = await self._client._request(
            "GET",
            "/api/image-gen/models",
            params=params,
        )
        return response.get("models", [])

    async def download_model(self, model_id: str) -> dict[str, Any]:
        return await self._client._request(
            "POST",
            f"/api/image-gen/models/{model_id}/download",
        )

    async def list_workflows(
        self,
        task_type: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {}
        if task_type:
            params["task_type"] = task_type
        response = await self._client._request(
            "GET",
            "/api/image-gen/workflows",
            params=params,
        )
        return response.get("workflows", [])

    async def generate(
        self,
        workflow_id: str,
        prompt: str,
        output_dir: Optional[str] = None,
        params: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "workflow_id": workflow_id,
            "prompt": prompt,
        }
        if output_dir:
            payload["output_dir"] = output_dir
        if params:
            payload["params"] = params
        return await self._client._request(
            "POST",
            "/api/image-gen/generate",
            json=payload,
        )

    async def cancel(self, task_id: str) -> dict[str, Any]:
        return await self._client._request(
            "POST",
            f"/api/image-gen/tasks/{task_id}/cancel",
        )

    async def get_task(self, task_id: str) -> dict[str, Any]:
        return await self._client._request(
            "GET",
            f"/api/image-gen/tasks/{task_id}",
        )


class ScoringCapability:
    def __init__(self, host_client: "HostClient"):
        self._client = host_client

    async def get_status(self) -> dict[str, Any]:
        return await self._client._request("GET", "/scoring/status")

    async def list_models(self) -> list[dict[str, Any]]:
        response = await self._client._request("GET", "/scoring/models")
        return response.get("models", [])

    async def download_model(self, model_id: str) -> dict[str, Any]:
        return await self._client._request("POST", f"/scoring/models/{model_id}/download")

    async def delete_model(self, model_id: str) -> dict[str, Any]:
        return await self._client._request("DELETE", f"/scoring/models/{model_id}")

    async def get_download_progress(self, model_id: str) -> dict[str, Any]:
        response = await self._client._request(
            "GET",
            f"/scoring/models/{model_id}/progress",
        )
        return response

    async def list_installed(self) -> dict[str, Any]:
        models = await self.list_models()
        installed_models = [m for m in models if m.get("installed")]
        try:
            status = await self.get_status()
            default_model = status.get("default_model", "base")
        except Exception:
            default_model = "base"
        return {
            "models": installed_models,
            "default": default_model,
            "total": len(installed_models),
        }

    async def ensure_ready(self, model_id: str = "base") -> bool:
        status = await self.get_status()
        if status.get("available"):
            installed = status.get("installed_models", [])
            if model_id in installed or len(installed) > 0:
                return True
        logger.warning(f"Scoring model '{model_id}' is not ready. Please download it first.")
        return False


class ModelsCapability:
    def __init__(self, host_client: "HostClient"):
        self._client = host_client

    async def list_all(self) -> dict[str, Any]:
        response = await self._client._request(
            "GET",
            "/sdk/models/available",
        )
        return response

    async def list_local(self) -> list[dict[str, Any]]:
        response = await self._client._request(
            "GET",
            "/sdk/models/local",
        )
        return response.get("models", [])

    async def list_cloud(self) -> dict[str, Any]:
        response = await self._client._request(
            "GET",
            "/sdk/models/cloud",
        )
        return response.get("providers", {})


class ToolsCapability:
    def __init__(self, host_client: "HostClient"):
        self._client = host_client

    async def call(
        self,
        tool_name: str,
        arguments: Optional[dict[str, Any]] = None,
        timeout: float = DEFAULT_TIMEOUT,
        on_progress: Optional[ProgressCallback] = None,
    ) -> Any:
        return await self._client._call_tool(
            tool_name=tool_name,
            arguments=arguments,
            timeout=timeout,
            on_progress=on_progress,
        )

    async def list(
        self,
        namespace: Optional[str] = None,
        include_unavailable: bool = False,
    ) -> list[dict[str, Any]]:
        return await self._client._list_tools(
            namespace=namespace,
            include_unavailable=include_unavailable,
        )
