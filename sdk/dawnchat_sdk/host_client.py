import os
import logging
from typing import Any, Optional

from .host_capabilities import (
    AICapability,
    ASRCapability,
    BrowserCapability,
    ImageGenCapability,
    MediaCapability,
    ModelsCapability,
    ScoringCapability,
    StorageCapability,
    ToolsCapability,
)
from .host_transport import DEFAULT_TIMEOUT, HttpTransport, InProcessTransport, ProgressCallback
from .tool_gateway import ToolGateway

logger = logging.getLogger("dawnchat_sdk")


class HostClient:
    _instance: Optional["HostClient"] = None

    def __new__(cls) -> "HostClient":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._host_port = int(os.environ.get("DAWNCHAT_HOST_PORT", "8000"))
        self._host_url = f"http://127.0.0.1:{self._host_port}"
        self._plugin_id = os.environ.get("DAWNCHAT_PLUGIN_ID", "unknown")
        self._timeout = DEFAULT_TIMEOUT
        http_transport = HttpTransport(
            host_url=self._host_url,
            host_port=self._host_port,
            plugin_id=self._plugin_id,
            timeout=self._timeout,
        )
        self._transport = (
            InProcessTransport(self._plugin_id, http_transport)
            if self._detect_inprocess()
            else http_transport
        )
        self.ai = AICapability(self)
        self.browser = BrowserCapability(self)
        self.storage = StorageCapability(self)
        self.tools = ToolsCapability(self)
        self.asr = ASRCapability(self)
        self.media = MediaCapability(self)
        self.models = ModelsCapability(self)
        self.image_gen = ImageGenCapability(self)
        self.scoring = ScoringCapability(self)
        self.gateway = ToolGateway(self)
        self._initialized = True
        logger.info(f"HostClient initialized: {self._host_url}, plugin_id={self._plugin_id}")

    def _detect_inprocess(self) -> bool:
        flag = os.environ.get("DAWNCHAT_INPROCESS", "").lower()
        return flag in {"1", "true", "yes"}

    @property
    def host_url(self) -> str:
        return self._host_url

    @property
    def plugin_id(self) -> str:
        return self._plugin_id

    async def _request(
        self,
        method: str,
        path: str,
        json: Optional[dict[str, Any]] = None,
        params: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        return await self._transport.request(method, path, json=json, params=params)

    async def _call_tool(
        self,
        tool_name: str,
        arguments: Optional[dict[str, Any]] = None,
        timeout: float = DEFAULT_TIMEOUT,
        on_progress: Optional[ProgressCallback] = None,
    ) -> Any:
        return await self._transport.call_tool(
            tool_name=tool_name,
            arguments=arguments,
            timeout=timeout,
            on_progress=on_progress,
        )

    async def _list_tools(
        self,
        namespace: Optional[str] = None,
        include_unavailable: bool = False,
    ) -> list[dict[str, Any]]:
        return await self._transport.list_tools(
            namespace=namespace,
            include_unavailable=include_unavailable,
        )

    async def close(self):
        await self._transport.close()

    async def __aenter__(self) -> "HostClient":
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()


host = HostClient()
