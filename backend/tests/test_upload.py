"""Tests for the upload endpoint."""

import io
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

from main import app, UPLOAD_DIR


@pytest.fixture(autouse=True)
def _clean_uploads():
    """Remove test files after each test."""
    yield
    for f in UPLOAD_DIR.iterdir():
        if f.name != ".gitkeep":
            f.unlink()


@pytest.mark.anyio
async def test_upload_pdf():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        content = b"%PDF-1.4 fake pdf content"
        response = await client.post(
            "/upload",
            files={"file": ("fiche.pdf", io.BytesIO(content), "application/pdf")},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["original_filename"] == "fiche.pdf"
    assert data["size"] == len(content)
    assert Path(UPLOAD_DIR / data["filename"]).exists()


@pytest.mark.anyio
async def test_upload_image():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        content = b"\x89PNG\r\n\x1a\n fake png"
        response = await client.post(
            "/upload",
            files={"file": ("photo.png", io.BytesIO(content), "image/png")},
        )
    assert response.status_code == 200
    assert response.json()["original_filename"] == "photo.png"


@pytest.mark.anyio
async def test_upload_txt():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/upload",
            files={"file": ("notes.txt", io.BytesIO(b"mes notes"), "text/plain")},
        )
    assert response.status_code == 200


@pytest.mark.anyio
async def test_reject_bad_extension():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/upload",
            files={"file": ("virus.exe", io.BytesIO(b"bad"), "application/octet-stream")},
        )
    assert response.status_code == 400
    assert "non autorisé" in response.json()["detail"]


@pytest.mark.anyio
async def test_reject_too_large():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        content = b"x" * (10 * 1024 * 1024 + 1)
        response = await client.post(
            "/upload",
            files={"file": ("big.pdf", io.BytesIO(content), "application/pdf")},
        )
    assert response.status_code == 413
    assert "trop volumineux" in response.json()["detail"]
