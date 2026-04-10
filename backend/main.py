"""Backend de réception des fiches-barèmes Affelnet."""

from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Affelnet Upload", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 Mo

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".txt"}


def _safe_filename(original: str) -> str:
    """Prefix filename with a timestamp to avoid collisions."""
    stem = Path(original).stem
    suffix = Path(original).suffix.lower()
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    # Keep only safe characters in stem
    safe_stem = "".join(c if c.isalnum() or c in "-_" else "_" for c in stem)
    return f"{ts}_{safe_stem}{suffix}"


@app.post("/upload")
async def upload_file(file: UploadFile) -> dict:
    # Validate extension
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Type non autorisé ({suffix}). Acceptés : {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Read content and check size
    content = await file.read()
    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Fichier trop volumineux ({len(content) / 1024 / 1024:.1f} Mo). Maximum : 10 Mo.",
        )

    # Save to disk
    dest = UPLOAD_DIR / _safe_filename(file.filename or "upload")
    dest.write_bytes(content)

    return {
        "filename": dest.name,
        "original_filename": file.filename,
        "size": len(content),
    }
