"""Tests for notes harmonisées parser and CSV consolidation."""

import csv
from pathlib import Path

import pytest

from parser.notes_harmonisees import extract_notes, DISCIPLINES
from services.notes_store import NOTES_CSV_PATH, append_notes

RAW_TEXT = """ARTS 14.00 97.169
EPS 15.00 102.069
FRANCAIS 11.33 96.997
HISTOIRE-GEO 11.33 95.979
LANGUES VIVANTES 12.67 98.295
MATHEMATIQUES 11.33 98.611
SCIENCES-TECHNO-DP 12.78 99.496
"""


class TestExtractNotes:
    def test_extracts_all_7_disciplines(self) -> None:
        notes = extract_notes(RAW_TEXT)
        assert len(notes) == 7

    def test_discipline_names(self) -> None:
        notes = extract_notes(RAW_TEXT)
        names = {n.discipline for n in notes}
        assert names == DISCIPLINES

    def test_values(self) -> None:
        notes = extract_notes(RAW_TEXT)
        arts = next(n for n in notes if n.discipline == "ARTS")
        assert arts.note_brute == 14.0
        assert arts.note_harmonisee == 97.169

        maths = next(n for n in notes if n.discipline == "MATHEMATIQUES")
        assert maths.note_brute == 11.33
        assert maths.note_harmonisee == 98.611

    def test_empty_text(self) -> None:
        assert extract_notes("") == []

    def test_unknown_discipline_ignored(self) -> None:
        text = "MUSIQUE 12.00 95.000\nARTS 14.00 97.169\n"
        notes = extract_notes(text)
        assert len(notes) == 1
        assert notes[0].discipline == "ARTS"

    def test_partial_text(self) -> None:
        text = "EPS 15.00 102.069\nMATHEMATIQUES 11.33 98.611\n"
        notes = extract_notes(text)
        assert len(notes) == 2

    def test_not_confused_with_fiche_bareme(self) -> None:
        """Fiche-barème text should not produce notes."""
        fiche = "1 32640 0 0 4560.000 2899.866 40099.866 VOLTAIRE 2NDE GENERALE ET TECHNOLOGIQUE 38813.931"
        notes = extract_notes(fiche)
        assert notes == []

    def test_comma_decimal_separator(self) -> None:
        """French users may use ',' as decimal separator."""
        text = "ARTS 14,00 97,169\n"
        notes = extract_notes(text)
        assert len(notes) == 1
        assert notes[0].note_brute == 14.0
        assert notes[0].note_harmonisee == 97.169

    def test_nine_decimals_dot(self) -> None:
        """Up to 9 decimals must be preserved with '.' separator."""
        text = "FRANCAIS 12.123456789 98.987654321\n"
        notes = extract_notes(text)
        assert len(notes) == 1
        assert notes[0].note_brute == pytest.approx(12.123456789)
        assert notes[0].note_harmonisee == pytest.approx(98.987654321)

    def test_nine_decimals_comma(self) -> None:
        """Up to 9 decimals must be preserved with ',' separator."""
        text = "FRANCAIS 12,123456789 98,987654321\n"
        notes = extract_notes(text)
        assert len(notes) == 1
        assert notes[0].note_brute == pytest.approx(12.123456789)
        assert notes[0].note_harmonisee == pytest.approx(98.987654321)

    def test_mixed_separators(self) -> None:
        """A line with mixed '.' and ',' separators is supported."""
        text = "EPS 15,5 102.069\n"
        notes = extract_notes(text)
        assert len(notes) == 1
        assert notes[0].note_brute == 15.5
        assert notes[0].note_harmonisee == 102.069


@pytest.fixture()
def _csv_sandbox(tmp_path: Path):
    """Redirect CSV writes to a temp file."""
    import services.notes_store as store

    orig = store.NOTES_CSV_PATH
    store.NOTES_CSV_PATH = tmp_path / "notes-harmonisees.csv"
    yield store
    store.NOTES_CSV_PATH = orig


class TestAppendNotes:
    def test_creates_csv_with_header(self, tmp_path: Path, _csv_sandbox) -> None:
        store = _csv_sandbox
        notes = extract_notes(RAW_TEXT)
        count = append_notes(notes)

        assert count == 7
        assert store.NOTES_CSV_PATH.exists()

        with store.NOTES_CSV_PATH.open(encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        assert len(rows) == 7
        assert set(reader.fieldnames) == {"timestamp", "discipline", "note_brute", "note_harmonisee"}

    def test_appends_without_duplicate_header(self, tmp_path: Path, _csv_sandbox) -> None:
        store = _csv_sandbox
        notes = extract_notes(RAW_TEXT)
        append_notes(notes)
        append_notes(notes)

        with store.NOTES_CSV_PATH.open(encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        assert len(rows) == 14  # 7 + 7, no duplicate header

    def test_empty_notes_returns_zero(self, _csv_sandbox) -> None:
        assert append_notes([]) == 0

    def test_csv_values(self, tmp_path: Path, _csv_sandbox) -> None:
        store = _csv_sandbox
        notes = extract_notes("ARTS 14.00 97.169\n")
        append_notes(notes)

        with store.NOTES_CSV_PATH.open(encoding="utf-8") as f:
            reader = csv.DictReader(f)
            row = next(reader)

        assert row["discipline"] == "ARTS"
        assert float(row["note_brute"]) == 14.0
        assert float(row["note_harmonisee"]) == 97.169
        assert "T" in row["timestamp"]  # ISO format
