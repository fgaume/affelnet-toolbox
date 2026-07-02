"""File d'attente des seuils saisis manuellement par les utilisateurs.

Ces seuils ne sont PAS des données vérifiées : ils sont simplement journalisés
ici pour relecture/validation manuelle avant d'être intégrés aux datasets
publiés. Ne touche jamais aux fichiers de seuils consolidés.
"""

import json
from datetime import datetime, timezone
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
PENDING_PATH = DATA_DIR / "pending_seuils.json"

# Garde-fou de plausibilité : plage large des barèmes Affelnet.
SEUIL_MIN = 400
SEUIL_MAX = 42000


def is_plausible_seuil(seuil: float) -> bool:
    """Vrai si le seuil est dans la plage réaliste des barèmes Affelnet."""
    return SEUIL_MIN <= seuil <= SEUIL_MAX


def _load() -> list[dict]:
    if not PENDING_PATH.exists():
        return []
    return json.loads(PENDING_PATH.read_text(encoding="utf-8"))


def add_pending_seuil(
    code: str, nom: str, seuil: float, is_boursier: bool, annee: int
) -> dict:
    """Journalise une contribution de seuil en attente de validation.

    Retourne l'enregistrement créé. Ne fait aucune validation de plausibilité
    (à la charge de l'appelant) — se contente de persister.
    """
    DATA_DIR.mkdir(exist_ok=True)
    records = _load()
    record = {
        "code": code,
        "nom": nom,
        "seuil": seuil,
        "is_boursier": is_boursier,
        "annee": annee,
        "recu_le": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    records.append(record)
    PENDING_PATH.write_text(
        json.dumps(records, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    return record
