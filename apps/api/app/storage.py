import os
from pathlib import Path

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
API_BASE = "http://127.0.0.1:8000"


def presign_put_url(object_key: str, content_type: str = "") -> str:
    return f"{API_BASE}/files/upload/{object_key}"


def presign_get_url(object_key: str, expires_seconds: int = 3600) -> str:
    return f"{API_BASE}/files/download/{object_key}"
