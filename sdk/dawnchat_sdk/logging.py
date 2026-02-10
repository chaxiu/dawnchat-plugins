import logging
import os
from pathlib import Path
from typing import Optional


def setup_plugin_logging(
    name: str = "dawnchat_plugin",
    *,
    level: int = logging.INFO,
    plugin_id: Optional[str] = None,
    log_dir: Optional[str] = None,
) -> logging.Logger:
    resolved_plugin_id = plugin_id or os.getenv("DAWNCHAT_PLUGIN_ID") or name
    resolved_log_dir = log_dir or os.getenv("DAWNCHAT_PLUGIN_LOG_DIR")
    logger = logging.getLogger(name)
    logger.setLevel(level)
    logger.propagate = False

    formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")

    if not any(isinstance(h, logging.StreamHandler) for h in logger.handlers):
        stream_handler = logging.StreamHandler()
        stream_handler.setLevel(level)
        stream_handler.setFormatter(formatter)
        logger.addHandler(stream_handler)

    if resolved_log_dir:
        log_path = Path(resolved_log_dir) / f"{resolved_plugin_id}.log"
        if not any(
            isinstance(h, logging.FileHandler) and getattr(h, "baseFilename", "") == str(log_path)
            for h in logger.handlers
        ):
            log_path.parent.mkdir(parents=True, exist_ok=True)
            file_handler = logging.FileHandler(log_path, encoding="utf-8")
            file_handler.setLevel(level)
            file_handler.setFormatter(formatter)
            logger.addHandler(file_handler)

    sdk_logger = logging.getLogger("dawnchat_sdk")
    sdk_logger.setLevel(level)
    sdk_logger.propagate = True

    return logger
