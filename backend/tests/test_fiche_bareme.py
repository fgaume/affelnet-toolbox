"""Tests for fiche-barème parser and seuils consolidation."""

import json
import shutil
from pathlib import Path

import pytest

from parser.fiche_bareme import clean_text, extract_seuils
from services.seuils_store import SEUILS_PATH, SEUILS_BOURSIERS_PATH, consolidate_seuils

# Example from REQ11: messy PDF copy/paste with broken lines (boursier: bonus 600)
RAW_TEXT = """
1 0 0 0.000 0.000 0.000 HENRI IV
2NDE GENERALE ET
TECHNOLOGIQUE Affecté(e) 0
2 32640 0 600 3290.823 41330.823 VICTOR HUGO
2NDE GENERALE ET
TECHNOLOGIQUE
40738.994
3 17760 0 600 3290.823 26450.823 SOPHIE GERMAIN
2NDE GENERALE ET
TECHNOLOGIQUE
40730.823
4 32640 0 600 3290.823 41330.823 ARAGO
2NDE GENERALE ET
TECHNOLOGIQUE
40531.641
5 17760 0 600 3290.823 26450.823 HELENE BOUCHER
2NDE GENERALE ET
TECHNOLOGIQUE
40466.493
6 32640 0 600 3290.823 41330.823 MAURICE RAVEL
2NDE GENERALE ET
TECHNOLOGIQUE
25850.823
7 32640 0 600 3290.823 41330.823 PAUL VALERY
2NDE GENERALE ET
TECHNOLOGIQUE
16800.000
8 32640 0 600 3290.823 41330.823 SIMONE WEIL
2NDE GENERALE ET
TECHNOLOGIQUE
39154.499
"""


class TestCleanText:
    def test_messy_text_produces_8_lines(self) -> None:
        lines = clean_text(RAW_TEXT)
        assert len(lines) == 8

    def test_each_line_starts_with_rank(self) -> None:
        lines = clean_text(RAW_TEXT)
        for i, line in enumerate(lines, 1):
            assert line.startswith(f"{i} "), f"Line {i}: {line!r}"

    def test_lines_contain_formation(self) -> None:
        lines = clean_text(RAW_TEXT)
        for line in lines:
            assert "2NDE GENERALE ET TECHNOLOGIQUE" in line

    def test_already_clean_text(self) -> None:
        clean = (
            "1 0 0 0.000 0.000 0.000 HENRI IV 2NDE GENERALE ET TECHNOLOGIQUE Affecté(e) 0\n"
            "2 32640 0 600 3290.823 41330.823 VICTOR HUGO 2NDE GENERALE ET TECHNOLOGIQUE 40738.994\n"
        )
        lines = clean_text(clean)
        assert len(lines) == 2


class TestExtractSeuils:
    def test_extract_from_messy_text(self) -> None:
        lines = clean_text(RAW_TEXT)
        voeux = extract_seuils(lines)
        assert len(voeux) == 8

        assert voeux[0].rang == 1
        assert voeux[0].nom_lycee == "HENRI IV"
        assert voeux[0].seuil == 0.0
        assert voeux[0].is_boursier is False  # bonus_boursier = 0

        assert voeux[1].rang == 2
        assert voeux[1].nom_lycee == "VICTOR HUGO"
        assert voeux[1].seuil == 40738.994
        assert voeux[1].is_boursier is True  # bonus_boursier = 600

    def test_all_lycee_names(self) -> None:
        lines = clean_text(RAW_TEXT)
        voeux = extract_seuils(lines)
        names = [v.nom_lycee for v in voeux]
        assert names == [
            "HENRI IV",
            "VICTOR HUGO",
            "SOPHIE GERMAIN",
            "ARAGO",
            "HELENE BOUCHER",
            "MAURICE RAVEL",
            "PAUL VALERY",
            "SIMONE WEIL",
        ]

    def test_boursier_detection(self) -> None:
        lines = clean_text(RAW_TEXT)
        voeux = extract_seuils(lines)
        # Voeu 1 has bonus_boursier=0, voeux 2-8 have bonus_boursier=600
        assert voeux[0].is_boursier is False
        for v in voeux[1:]:
            assert v.is_boursier is True


# Real user data: 7 numeric fields, non-boursier (bonus_boursier=0)
RAW_TEXT_7FIELDS = """1 32640 0 0 4560.000 2899.866 40099.866 VOLTAIRE
2NDE GENERALE ET
TECHNOLOGIQUE Affecté(e) 38813.931
2 32640 0 0 4560.000 2899.866 40099.866 SIMONE WEIL 2NDE GENERALE ET TECHNOLOGIQUE 39154.499
3 17760 0 0 4560.000 2899.866 25219.866 LAMARTINE 2NDE GENERALE ET TECHNOLOGIQUE 40167.386
4 17760 0 0 4560.000 2899.866 25219.866 RODIN 2NDE GENERALE ET TECHNOLOGIQUE 38954.916
5 17760 0 0 4560.000 2899.866 25219.866 ARAGO 2NDE GENERALE ET TECHNOLOGIQUE 40531.641
6 32640 0 0 4560.000 2899.866 40099.866 CHARLEMAGNE 2NDE GENERALE ET TECHNOLOGIQUE 40672.751
7 32640 0 0 4560.000 2899.866 40099.866 SOPHIE GERMAIN 2NDE GENERALE ET TECHNOLOGIQUE 40730.823
8 32640 0 0 4560.000 2899.866 40099.866 VICTOR HUGO 2NDE GENERALE ET TECHNOLOGIQUE 40738.994
9 17760 0 0 4560.000 2899.866 25219.866 RACINE 2NDE GENERALE ET TECHNOLOGIQUE 40306.790
10 17760 0 0 4560.000 2899.866 25219.866 VICTOR DURUY 2NDE GENERALE ET TECHNOLOGIQUE 39902.805
"""


class TestCleanText7Fields:
    def test_produces_10_lines(self) -> None:
        lines = clean_text(RAW_TEXT_7FIELDS)
        assert len(lines) == 10

    def test_first_line_contains_voltaire(self) -> None:
        lines = clean_text(RAW_TEXT_7FIELDS)
        assert "VOLTAIRE" in lines[0]
        assert "2NDE GENERALE ET TECHNOLOGIQUE" in lines[0]

    def test_each_line_starts_with_rank(self) -> None:
        lines = clean_text(RAW_TEXT_7FIELDS)
        for i, line in enumerate(lines, 1):
            assert line.startswith(f"{i} "), f"Line {i}: {line!r}"


class TestExtractSeuils7Fields:
    def test_extract_all_10(self) -> None:
        lines = clean_text(RAW_TEXT_7FIELDS)
        voeux = extract_seuils(lines)
        assert len(voeux) == 10

    def test_lycee_names(self) -> None:
        lines = clean_text(RAW_TEXT_7FIELDS)
        voeux = extract_seuils(lines)
        names = [v.nom_lycee for v in voeux]
        assert names == [
            "VOLTAIRE", "SIMONE WEIL", "LAMARTINE", "RODIN", "ARAGO",
            "CHARLEMAGNE", "SOPHIE GERMAIN", "VICTOR HUGO", "RACINE", "VICTOR DURUY",
        ]

    def test_seuils_values(self) -> None:
        lines = clean_text(RAW_TEXT_7FIELDS)
        voeux = extract_seuils(lines)
        assert voeux[0].seuil == 38813.931  # VOLTAIRE
        assert voeux[4].seuil == 40531.641  # ARAGO

    def test_all_non_boursier(self) -> None:
        lines = clean_text(RAW_TEXT_7FIELDS)
        voeux = extract_seuils(lines)
        for v in voeux:
            assert v.is_boursier is False


# Real boursier data: bonus_boursier=600 at index 2, with socle column (4800)
RAW_TEXT_BOURSIER = """1 32640 600 0 4800.000 3137.430 41177.430 HENRI BERGSON
2NDE GENERALE ET
TECHNOLOGIQUE Affecté(e) 40689.429
2 32640 600 0 4800.000 3137.430 41177.430 VOLTAIRE
2NDE GENERALE ET
TECHNOLOGIQUE
40042.431
3 17760 600 0 4800.000 3137.430 26297.430 COLBERT
2NDE GENERALE ET
TECHNOLOGIQUE
40062.875
4 17760 600 0 4800.000 3137.430 26297.430 LAMARTINE
2NDE GENERALE ET
TECHNOLOGIQUE
40480.602
5 17760 600 0 4800.000 3137.430 26297.430 VICTOR HUGO
2NDE GENERALE ET
TECHNOLOGIQUE
25160.656
6 17760 600 0 4800.000 3137.430 26297.430 TURGOT
2NDE GENERALE ET
TECHNOLOGIQUE
40310.043
7 17760 600 0 4800.000 3137.430 26297.430 CONDORCET
2NDE GENERALE ET
TECHNOLOGIQUE
26411.519
8 32640 600 0 4800.000 3137.430 41177.430 HELENE BOUCHER
2NDE GENERALE ET
TECHNOLOGIQUE
39741.772
9 32640 600 0 4800.000 3137.430 41177.430 SOPHIE GERMAIN
2NDE GENERALE ET
TECHNOLOGIQUE
24738.072
10 32640 600 0 4800.000 3137.430 41177.430 SIMONE WEIL
2NDE GENERALE ET
TECHNOLOGIQUE
38486.323
"""


class TestRealBoursierData:
    def test_produces_10_lines(self) -> None:
        lines = clean_text(RAW_TEXT_BOURSIER)
        assert len(lines) == 10

    def test_extract_all_10(self) -> None:
        lines = clean_text(RAW_TEXT_BOURSIER)
        voeux = extract_seuils(lines)
        assert len(voeux) == 10

    def test_all_boursier(self) -> None:
        lines = clean_text(RAW_TEXT_BOURSIER)
        voeux = extract_seuils(lines)
        for v in voeux:
            assert v.is_boursier is True, f"{v.nom_lycee} should be boursier"

    def test_lycee_names(self) -> None:
        lines = clean_text(RAW_TEXT_BOURSIER)
        voeux = extract_seuils(lines)
        names = [v.nom_lycee for v in voeux]
        assert names == [
            "HENRI BERGSON", "VOLTAIRE", "COLBERT", "LAMARTINE", "VICTOR HUGO",
            "TURGOT", "CONDORCET", "HELENE BOUCHER", "SOPHIE GERMAIN", "SIMONE WEIL",
        ]

    def test_seuils_values(self) -> None:
        lines = clean_text(RAW_TEXT_BOURSIER)
        voeux = extract_seuils(lines)
        assert voeux[0].seuil == 40689.429  # HENRI BERGSON
        assert voeux[1].seuil == 40042.431  # VOLTAIRE
        assert voeux[9].seuil == 38486.323  # SIMONE WEIL

    def test_consolidation_goes_to_boursier_file(self, tmp_path: Path) -> None:
        import services.seuils_store as store

        backup = tmp_path / "seuils.json"
        backup_b = tmp_path / "seuils-boursiers.json"
        shutil.copy(SEUILS_PATH, backup)
        shutil.copy(SEUILS_BOURSIERS_PATH, backup_b)
        orig, orig_b = store.SEUILS_PATH, store.SEUILS_BOURSIERS_PATH
        store.SEUILS_PATH = backup
        store.SEUILS_BOURSIERS_PATH = backup_b

        lines = clean_text(RAW_TEXT_BOURSIER)
        voeux = extract_seuils(lines)
        matched = consolidate_seuils(voeux)

        store.SEUILS_PATH = orig
        store.SEUILS_BOURSIERS_PATH = orig_b

        assert "HENRI BERGSON" in matched
        assert "SIMONE WEIL" in matched

        # Verify boursier file was updated
        data_b = json.loads(backup_b.read_text(encoding="utf-8"))
        bergson = next(e for e in data_b if e["nom"] == "HENRI BERGSON")
        # 1 historical (2025 seed) + 1 new (2026)
        assert len(bergson["seuils"]) == 2
        assert bergson["seuils"][-1] == 40689.429

        # Verify main file was NOT touched
        data = json.loads(backup.read_text(encoding="utf-8"))
        voltaire = next(e for e in data if e["nom"] == "VOLTAIRE")
        assert len(voltaire["seuils"]) == 5  # Unchanged


@pytest.fixture()
def _backup_both(tmp_path: Path):
    """Work on copies of both seuils JSON files."""
    import services.seuils_store as store

    backup = tmp_path / "seuils.json"
    backup_b = tmp_path / "seuils-boursiers.json"
    shutil.copy(SEUILS_PATH, backup)
    shutil.copy(SEUILS_BOURSIERS_PATH, backup_b)
    orig_path = store.SEUILS_PATH
    orig_path_b = store.SEUILS_BOURSIERS_PATH
    store.SEUILS_PATH = backup
    store.SEUILS_BOURSIERS_PATH = backup_b
    yield store
    store.SEUILS_PATH = orig_path
    store.SEUILS_BOURSIERS_PATH = orig_path_b


class TestConsolidateNonBoursier:
    def test_appends_to_main_file(self, tmp_path: Path, _backup_both) -> None:
        store = _backup_both
        lines = clean_text(RAW_TEXT_7FIELDS)
        voeux = extract_seuils(lines)
        matched = consolidate_seuils(voeux)

        assert "ARAGO" in matched

        data = json.loads(store.SEUILS_PATH.read_text(encoding="utf-8"))
        arago = next(e for e in data if e["nom"] == "ARAGO")
        assert len(arago["seuils"]) == 6  # 5 historical + 1 new

    def test_does_not_touch_boursier_file(self, tmp_path: Path, _backup_both) -> None:
        store = _backup_both
        lines = clean_text(RAW_TEXT_7FIELDS)
        voeux = extract_seuils(lines)
        consolidate_seuils(voeux)

        # Boursier file should be unchanged
        data_b = json.loads(store.SEUILS_BOURSIERS_PATH.read_text(encoding="utf-8"))
        simone = next(e for e in data_b if e["nom"] == "SIMONE WEIL")
        assert len(simone["seuils"]) == 1  # Only the 2025 seed

    def test_dedup_on_2026(self, tmp_path: Path, _backup_both) -> None:
        store = _backup_both
        lines = clean_text(RAW_TEXT_7FIELDS)
        voeux = extract_seuils(lines)
        consolidate_seuils(voeux)
        consolidate_seuils(voeux)

        data = json.loads(store.SEUILS_PATH.read_text(encoding="utf-8"))
        arago = next(e for e in data if e["nom"] == "ARAGO")
        assert len(arago["seuils"]) == 6  # No duplicate


class TestConsolidateBoursier:
    def test_appends_to_boursier_file(self, tmp_path: Path, _backup_both) -> None:
        store = _backup_both
        lines = clean_text(RAW_TEXT)
        voeux = extract_seuils(lines)
        matched = consolidate_seuils(voeux)

        # Voeux 2-8 are boursier, should go to boursier file
        assert "VICTOR HUGO" in matched

        data_b = json.loads(store.SEUILS_BOURSIERS_PATH.read_text(encoding="utf-8"))
        vh = next(e for e in data_b if e["nom"] == "VICTOR HUGO")
        assert len(vh["seuils"]) == 2  # 1 seed (2025) + 1 new

    def test_non_boursier_voeu_goes_to_main(self, tmp_path: Path, _backup_both) -> None:
        store = _backup_both
        lines = clean_text(RAW_TEXT)
        voeux = extract_seuils(lines)
        consolidate_seuils(voeux)

        # Voeu 1 (HENRI IV, bonus_boursier=0) should go to main file
        data = json.loads(store.SEUILS_PATH.read_text(encoding="utf-8"))
        h4 = next((e for e in data if e["nom"] == "HENRI IV"), None)
        if h4:
            assert 0.0 in h4["seuils"]
