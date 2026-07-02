"""Tests de l'endpoint /seuil (contribution manuelle de seuil)."""

import json

import pytest
from httpx import ASGITransport, AsyncClient

from main import app
from services.pending_seuils_store import PENDING_PATH


@pytest.fixture(autouse=True)
def _clean_pending():
    """Supprime le fichier de file d'attente avant et après chaque test."""
    if PENDING_PATH.exists():
        PENDING_PATH.unlink()
    yield
    if PENDING_PATH.exists():
        PENDING_PATH.unlink()


async def _post(payload: dict):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        return await client.post("/seuil", json=payload)


VALID = {
    "code": "0750654D",
    "nom": "HENRI IV",
    "seuil": 40500.5,
    "is_boursier": False,
    "annee": 2026,
}


@pytest.mark.anyio
async def test_seuil_valide_est_mis_en_attente():
    response = await _post(VALID)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "pending"
    assert body["record"]["code"] == "0750654D"
    assert body["record"]["seuil"] == 40500.5
    assert "recu_le" in body["record"]
    # Persisté dans le fichier de file d'attente.
    stored = json.loads(PENDING_PATH.read_text(encoding="utf-8"))
    assert len(stored) == 1
    assert stored[0]["nom"] == "HENRI IV"


@pytest.mark.anyio
async def test_seuils_successifs_s_empilent():
    await _post(VALID)
    await _post({**VALID, "is_boursier": True, "seuil": 39000})
    stored = json.loads(PENDING_PATH.read_text(encoding="utf-8"))
    assert len(stored) == 2


@pytest.mark.anyio
async def test_seuil_hors_plage_refuse():
    response = await _post({**VALID, "seuil": 99999})
    assert response.status_code == 400
    assert not PENDING_PATH.exists()


@pytest.mark.anyio
async def test_code_uai_invalide_refuse():
    response = await _post({**VALID, "code": "XYZ"})
    assert response.status_code == 400
    assert not PENDING_PATH.exists()
