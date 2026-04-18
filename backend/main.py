"""Backend de réception des fiches-barèmes Affelnet."""

from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from parser.fiche_bareme import clean_text, extract_seuils
from parser.notes_harmonisees import extract_notes
from services.notes_store import append_notes
from services.seuils_store import consolidate_seuils

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

    # Save raw file to disk
    dest = UPLOAD_DIR / _safe_filename(file.filename or "upload")
    dest.write_bytes(content)

    result: dict = {
        "filename": dest.name,
        "original_filename": file.filename,
        "size": len(content),
    }

    # For text uploads: auto-detect type and parse
    if suffix == ".txt":
        text = content.decode("utf-8", errors="replace")

        # Try fiche-barème first (starts with rank + bonus_secteur)
        cleaned_lines = clean_text(text)
        if cleaned_lines:
            cleaned_dest = dest.with_suffix(".cleaned.txt")
            cleaned_dest.write_text("\n".join(cleaned_lines), encoding="utf-8")

            voeux = extract_seuils(cleaned_lines)
            matched = consolidate_seuils(voeux)
            result["type"] = "fiche_bareme"
            result["parsed_voeux"] = len(voeux)
            result["matched_lycees"] = matched
        else:
            # Try notes harmonisées (discipline + 2 floats)
            notes = extract_notes(text)
            if notes:
                count = append_notes(notes)
                result["type"] = "notes_harmonisees"
                result["parsed_notes"] = count

    return result
