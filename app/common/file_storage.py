import os
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

UPLOAD_ROOT = Path("uploads")
USER_IMAGE_DIR = UPLOAD_ROOT / "users"
SETTLEMENT_IMAGE_DIR = UPLOAD_ROOT / "settlements"
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
MAX_IMAGE_SIZE = 2 * 1024 * 1024


def save_user_image(file: UploadFile) -> str:
    content_type = file.content_type or ""
    extension = ALLOWED_IMAGE_TYPES.get(content_type)

    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image type. Allowed types: jpeg, png, webp, gif."
        )

    contents = file.file.read()
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image size must be 2 MB or less."
        )

    USER_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{extension}"
    file_path = USER_IMAGE_DIR / filename
    file_path.write_bytes(contents)

    return f"/uploads/users/{filename}"


def save_settlement_image(file: UploadFile) -> str:
    content_type = file.content_type or ""
    extension = ALLOWED_IMAGE_TYPES.get(content_type)

    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image type. Allowed types: jpeg, png, webp, gif."
        )

    contents = file.file.read()
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image size must be 2 MB or less."
        )

    SETTLEMENT_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{extension}"
    file_path = SETTLEMENT_IMAGE_DIR / filename
    file_path.write_bytes(contents)

    return f"/uploads/settlements/{filename}"


def delete_file_if_exists(file_url: str | None) -> None:
    if not file_url:
        return

    relative_path = file_url.lstrip("/").replace("/", os.sep)
    path = Path(relative_path)
    if path.exists() and path.is_file():
        path.unlink()
