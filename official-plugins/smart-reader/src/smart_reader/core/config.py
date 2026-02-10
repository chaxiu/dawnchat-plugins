import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[3]
DATA_DIR = Path(os.environ.get("SMART_READER_DATA_DIR", BASE_DIR / "data"))
LIBRARY_DIR = DATA_DIR / "library"
INDEX_DIR = DATA_DIR / "indexes"


def ensure_data_dirs() -> None:
    LIBRARY_DIR.mkdir(parents=True, exist_ok=True)
    INDEX_DIR.mkdir(parents=True, exist_ok=True)
