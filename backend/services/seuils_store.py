"""Consolidation des seuils d'admission dans les fichiers JSON globaux."""

import json
from pathlib import Path

from parser.fiche_bareme import VoeuResult

DATA_DIR = Path(__file__).parent.parent / "data"
SEUILS_PATH = DATA_DIR / "affelnet-paris-seuils-admission-lycees.json"
SEUILS_BOURSIERS_PATH = DATA_DIR / "affelnet-paris-seuils-admission-lycees-boursiers.json"

# Number of historical seuils per file (before 2026 uploads).
# Non-boursiers: 5 years (2021-2025). Boursiers: 1 year (2025).
HISTORICAL_COUNT = 5
HISTORICAL_COUNT_BOURSIERS = 1


def _load_json(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def _save_json(path: Path, data: list[dict]) -> None:
    path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def _build_name_index(data: list[dict]) -> dict[str, int]:
    """Build a case-insensitive name → index mapping."""
    return {entry["nom"].upper(): i for i, entry in enumerate(data)}


def _append_seuil(entry: dict, seuil: float, historical_count: int) -> bool:
    """Append seuil if not already present in the new (post-historical) entries.

    Returns True if the seuil was appended.
    """
    new_seuils = entry["seuils"][historical_count:]
    if seuil in new_seuils:
        return False
    entry["seuils"].append(seuil)
    return True


def consolidate_seuils(voeux: list[VoeuResult]) -> dict[str, float]:
    """Append extracted seuils to the appropriate JSON file (boursier or not).

    Returns a dict of {lycee_name: seuil} for successfully matched lycées.
    """
    data = _load_json(SEUILS_PATH)
    data_boursiers = _load_json(SEUILS_BOURSIERS_PATH)
    name_index = _build_name_index(data)
    name_index_boursiers = _build_name_index(data_boursiers)

    matched: dict[str, float] = {}
    modified = False
    modified_boursiers = False

    for voeu in voeux:
        if voeu.is_boursier:
            idx = name_index_boursiers.get(voeu.nom_lycee)
            if idx is not None:
                if _append_seuil(data_boursiers[idx], voeu.seuil, HISTORICAL_COUNT_BOURSIERS):
                    modified_boursiers = True
                matched[voeu.nom_lycee] = voeu.seuil
        else:
            idx = name_index.get(voeu.nom_lycee)
            if idx is not None:
                if _append_seuil(data[idx], voeu.seuil, HISTORICAL_COUNT):
                    modified = True
                matched[voeu.nom_lycee] = voeu.seuil

    if modified:
        _save_json(SEUILS_PATH, data)
    if modified_boursiers:
        _save_json(SEUILS_BOURSIERS_PATH, data_boursiers)

    return matched
