"""Consolidation des notes harmonisées dans un fichier CSV global."""

import csv
from datetime import datetime, timezone
from pathlib import Path

from parser.notes_harmonisees import NoteHarmonisee

DATA_DIR = Path(__file__).parent.parent / "data"
NOTES_CSV_PATH = DATA_DIR / "notes-harmonisees.csv"

_FIELDNAMES = ["timestamp", "discipline", "note_brute", "note_harmonisee"]


def append_notes(notes: list[NoteHarmonisee]) -> int:
    """Append extracted notes to the global CSV file.

    Creates the file with a header if it doesn't exist.
    Returns the number of notes appended.
    """
    if not notes:
        return 0

    write_header = not NOTES_CSV_PATH.exists()
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    with NOTES_CSV_PATH.open("a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=_FIELDNAMES)
        if write_header:
            writer.writeheader()
        for note in notes:
            writer.writerow({
                "timestamp": ts,
                "discipline": note.discipline,
                "note_brute": note.note_brute,
                "note_harmonisee": note.note_harmonisee,
            })

    return len(notes)
