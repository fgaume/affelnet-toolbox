"""Parser de notes harmonisées Affelnet (texte copié/collé)."""

import re
from dataclasses import dataclass

DISCIPLINES = frozenset({
    "ARTS",
    "EPS",
    "FRANCAIS",
    "HISTOIRE-GEO",
    "LANGUES VIVANTES",
    "MATHEMATIQUES",
    "SCIENCES-TECHNO-DP",
})

# Matches: <DISCIPLINE> <note_brute> <note_harmonisee>
_LINE_PATTERN = re.compile(
    r"^([A-Z][A-Z \-]+?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*$",
    re.MULTILINE,
)


@dataclass(frozen=True)
class NoteHarmonisee:
    """Une note brute et sa note harmonisée pour un champ disciplinaire."""

    discipline: str
    note_brute: float
    note_harmonisee: float


def extract_notes(text: str) -> list[NoteHarmonisee]:
    """Extract discipline grades from pasted text.

    Returns a non-empty list only if at least one known discipline is found.
    Unknown discipline names are silently ignored.
    """
    results: list[NoteHarmonisee] = []

    for m in _LINE_PATTERN.finditer(text):
        discipline = m.group(1).strip()
        if discipline not in DISCIPLINES:
            continue
        note_brute = float(m.group(2))
        note_harmonisee = float(m.group(3))
        results.append(NoteHarmonisee(
            discipline=discipline,
            note_brute=note_brute,
            note_harmonisee=note_harmonisee,
        ))

    return results
