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
# Decimal separator: '.' (English) or ',' (French). Up to 9 decimals.
_NUMBER_RE = r"\d+(?:[.,]\d{1,9})?"
_LINE_PATTERN = re.compile(
    rf"^([A-Z][A-Z \-]+?)\s+({_NUMBER_RE})\s+({_NUMBER_RE})\s*$",
    re.MULTILINE,
)


@dataclass(frozen=True)
class NoteHarmonisee:
    """Une note brute et sa note harmonisée pour un champ disciplinaire."""

    discipline: str
    note_brute: float
    note_harmonisee: float


def _parse_number(raw: str) -> float:
    """Parse a number with '.' or ',' as decimal separator."""
    return float(raw.replace(",", "."))


def extract_notes(text: str) -> list[NoteHarmonisee]:
    """Extract discipline grades from pasted text.

    Returns a non-empty list only if at least one known discipline is found.
    Unknown discipline names are silently ignored.
    Numbers may use '.' or ',' as decimal separator and up to 9 decimals.
    """
    results: list[NoteHarmonisee] = []

    for m in _LINE_PATTERN.finditer(text):
        discipline = m.group(1).strip()
        if discipline not in DISCIPLINES:
            continue
        note_brute = _parse_number(m.group(2))
        note_harmonisee = _parse_number(m.group(3))
        results.append(NoteHarmonisee(
            discipline=discipline,
            note_brute=note_brute,
            note_harmonisee=note_harmonisee,
        ))

    return results
