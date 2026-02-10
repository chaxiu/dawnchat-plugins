import asyncio
import logging
import os
import platform
import socket
import subprocess
import sys
from pathlib import Path
from typing import Optional

import aiohttp

logger = logging.getLogger("comfyui_manager")


class ComfyUIManager:
    def __init__(self, base_dir: Path):
        self._base_dir = base_dir
        self._process: Optional[subprocess.Popen] = None
        self._host = "127.0.0.1"
        self._port: Optional[int] = None
        self._starting = False

    @property
    def base_url(self) -> str:
        port = self._port or 0
        return f"http://{self._host}:{port}"

    def _comfyui_dir(self) -> Path:
        return self._base_dir / "comfyui"

    def _pick_port(self) -> int:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.bind((self._host, 0))
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            return int(sock.getsockname()[1])

    def _get_data_dir(self) -> Path:
        env_dir = os.getenv("DAWNCHAT_DATA_DIR", "").strip()
        if env_dir:
            return Path(env_dir).expanduser()
        system = platform.system()
        if system == "Darwin":
            base = Path.home() / "Library" / "Application Support"
        elif system == "Windows":
            appdata = os.getenv("APPDATA")
            if appdata:
                base = Path(appdata)
            else:
                localappdata = os.getenv("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
                base = Path(localappdata)
        else:
            base = Path(os.getenv("XDG_DATA_HOME") or (Path.home() / ".local" / "share"))
        return base / "DawnChat"

    def is_running(self) -> bool:
        return self._process is not None and self._process.poll() is None

    async def is_ready(self) -> bool:
        if not self.is_running():
            return False
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/system_stats",
                    timeout=aiohttp.ClientTimeout(total=2),
                ) as response:
                    return response.status == 200
        except Exception:
            return False

    async def _wait_for_ready(self, timeout: float = 120.0) -> bool:
        start_time = asyncio.get_event_loop().time()
        while (asyncio.get_event_loop().time() - start_time) < timeout:
            if not self.is_running():
                return False
            if await self.is_ready():
                return True
            await asyncio.sleep(1.0)
        return False

    async def start(self) -> bool:
        if self.is_running():
            return True
        if self._starting:
            return False
        self._starting = True
        try:
            comfyui_dir = self._comfyui_dir()
            main_py = comfyui_dir / "main.py"
            if not main_py.exists():
                raise FileNotFoundError(f"ComfyUI main.py not found: {main_py}")

            self._port = self._port or self._pick_port()
            cmd = [
                sys.executable,
                str(main_py),
                "--listen",
                self._host,
                "--port",
                str(self._port),
                "--disable-auto-launch",
            ]
            models_dir = self._get_data_dir() / "comfyui" / "models"
            if models_dir.exists():
                extra_config_path = self._get_data_dir() / "comfyui" / "extra_model_paths.yaml"
                extra_config_path.parent.mkdir(parents=True, exist_ok=True)
                import importlib
                yaml = importlib.import_module("yaml")
                config_content = {
                    "dawnchat": {
                        "base_path": str(models_dir),
                        "checkpoints": "checkpoints",
                        "clip": "clip",
                        "clip_vision": "clip_vision",
                        "configs": "configs",
                        "controlnet": "controlnet",
                        "embeddings": "embeddings",
                        "loras": "loras",
                        "upscale_models": "upscale_models",
                        "vae": "vae",
                        "inpaint": "inpaint",
                    }
                }
                with open(extra_config_path, "w") as f:
                    yaml.dump(config_content, f)
                cmd.extend(["--extra-model-paths-config", str(extra_config_path)])

            env = os.environ.copy()
            env["PYTHONPATH"] = str(comfyui_dir)
            if platform.system() == "Darwin":
                env["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"

            logger.info("Starting ComfyUI: %s", " ".join(cmd))
            self._process = subprocess.Popen(
                cmd,
                cwd=str(comfyui_dir),
                env=env,
                stdout=sys.stderr,
                stderr=sys.stderr,
                stdin=subprocess.DEVNULL,
            )
            if await self._wait_for_ready():
                return True
            await self.stop()
            return False
        finally:
            self._starting = False

    async def stop(self, timeout: float = 10.0) -> bool:
        if self._process is None:
            return True
        if self._process.poll() is not None:
            self._process = None
            return True
        self._process.terminate()
        try:
            loop = asyncio.get_event_loop()
            await asyncio.wait_for(loop.run_in_executor(None, self._process.wait), timeout=timeout)
        except asyncio.TimeoutError:
            self._process.kill()
            await asyncio.sleep(1)
        self._process = None
        return True

    async def ensure_running(self) -> bool:
        if await self.is_ready():
            return True
        return await self.start()
