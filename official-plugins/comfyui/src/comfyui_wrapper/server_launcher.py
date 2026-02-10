"""
ComfyUI Server Launcher

This module handles launching the ComfyUI server as a subprocess.
This wrapper code is part of DawnChat and is licensed under MIT.
ComfyUI itself is licensed under GPL-3.0.

Copyright (c) 2024 DawnChat Team
"""

import os
import sys
import subprocess
import signal
from pathlib import Path
from typing import Optional


class ComfyUILauncher:
    """
    Launcher for the ComfyUI server process.
    
    Manages the lifecycle of the ComfyUI server, including:
    - Starting with appropriate arguments
    - Health checking
    - Graceful shutdown
    """
    
    def __init__(
        self,
        comfyui_path: Path,
        host: str = "127.0.0.1",
        port: int = 8188,
        extra_model_paths: Optional[Path] = None
    ):
        self.comfyui_path = comfyui_path
        self.host = host
        self.port = port
        self.extra_model_paths = extra_model_paths
        self.process: Optional[subprocess.Popen] = None
    
    def build_command(self) -> list[str]:
        """Build the command to launch ComfyUI."""
        python_exe = sys.executable
        main_py = self.comfyui_path / "main.py"
        
        cmd = [
            python_exe,
            str(main_py),
            "--listen", self.host,
            "--port", str(self.port),
            "--disable-auto-launch",  # Don't open browser
        ]
        
        if self.extra_model_paths:
            cmd.extend(["--extra-model-paths-config", str(self.extra_model_paths)])
        
        return cmd
    
    def start(self) -> bool:
        """
        Start the ComfyUI server.
        
        Returns:
            True if started successfully
        """
        if self.process is not None and self.process.poll() is None:
            return True  # Already running
        
        cmd = self.build_command()
        
        env = os.environ.copy()
        # Set PYTHONPATH to include ComfyUI
        env["PYTHONPATH"] = str(self.comfyui_path)
        
        try:
            self.process = subprocess.Popen(
                cmd,
                cwd=str(self.comfyui_path),
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                stdin=subprocess.DEVNULL
            )
            return True
        except Exception as e:
            print(f"Failed to start ComfyUI: {e}")
            return False
    
    def stop(self, timeout: float = 10.0) -> bool:
        """
        Stop the ComfyUI server gracefully.
        
        Args:
            timeout: Seconds to wait before force killing
            
        Returns:
            True if stopped successfully
        """
        if self.process is None:
            return True
        
        if self.process.poll() is not None:
            self.process = None
            return True
        
        # Send SIGTERM for graceful shutdown
        self.process.terminate()
        
        try:
            self.process.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            # Force kill
            self.process.kill()
            self.process.wait(timeout=5)
        
        self.process = None
        return True
    
    def is_running(self) -> bool:
        """Check if the server process is running."""
        return self.process is not None and self.process.poll() is None
    
    @property
    def base_url(self) -> str:
        """Get the base URL of the server."""
        return f"http://{self.host}:{self.port}"


if __name__ == "__main__":
    # Simple test
    import argparse
    
    parser = argparse.ArgumentParser()
    parser.add_argument("--comfyui-path", required=True)
    parser.add_argument("--port", type=int, default=8188)
    args = parser.parse_args()
    
    launcher = ComfyUILauncher(
        comfyui_path=Path(args.comfyui_path),
        port=args.port
    )
    
    print(f"Starting ComfyUI on port {args.port}...")
    if launcher.start():
        print(f"ComfyUI running at {launcher.base_url}")
        try:
            launcher.process.wait()
        except KeyboardInterrupt:
            print("\nStopping...")
            launcher.stop()
    else:
        print("Failed to start ComfyUI")
        sys.exit(1)

