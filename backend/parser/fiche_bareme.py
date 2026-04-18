"""Parser de fiches-barèmes Affelnet (texte copié/collé depuis PDF)."""

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class VoeuResult:
    """Un voeu extrait d'une fiche-barème."""

    rang: int
    nom_lycee: str
    seuil: float
    is_boursier: bool


# Known formation patterns that separate the lycée name from the rest
_FORMATION = re.compile(
    r"\s+(2NDE\s+GENERALE\s+ET\s+TECHNOLOGIQUE|2NDE\s+GENERALE|2GT)\s+",
    re.IGNORECASE,
)

# Matches a sequence of numbers (int or decimal) at the start of a line.
# The name starts at the first uppercase letter that follows a space after numbers.
_NUMERIC_PREFIX = re.compile(r"^(?:\d+(?:\.\d+)?\s+)+")


def clean_text(raw: str) -> list[str]:
    """Reconstruct proper one-line-per-voeu from messy PDF copy/paste.

    Strategy: join all lines, then split before each sequential rank number.
    Each voeu starts with its rank (1, 2, 3...) followed by a known bonus_secteur value.
    """
    # Normalize whitespace: replace newlines with spaces, collapse multiple spaces
    collapsed = re.sub(r"\s*\n\s*", " ", raw.strip())
    collapsed = re.sub(r"  +", " ", collapsed)

    # Find all voeu starts by looking for sequential rank numbers.
    # A voeu starts with: <rank> <bonus_secteur> <bonus_boursier>
    # where bonus_secteur is one of {0, 32640, 17760, 16800}
    # and bonus_boursier is 0 or 600 (sometimes followed by another 0)
    voeu_pattern = re.compile(
        r"(?:^|(?<=\s))(\d+)\s+(?:0|32640|17760|16800)\s+(?:0|600)\s+\d"
    )

    matches = list(voeu_pattern.finditer(collapsed))
    if not matches:
        return []

    # Verify sequential ranks to confirm these are real voeu starts
    lines: list[str] = []
    for i, m in enumerate(matches):
        expected_rank = i + 1
        actual_rank = int(m.group(1))
        if actual_rank != expected_rank:
            break
        start = m.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(collapsed)
        lines.append(collapsed[start:end].strip())

    return lines


def extract_seuils(lines: list[str]) -> list[VoeuResult]:
    """Extract lycée name and seuil from cleaned voeu lines.

    Each line has a variable number of numeric fields (6 or 7) followed by:
    <NOM LYCÉE> <formation> [Affecté(e)] <seuil>

    The seuil is the last number on the line.
    The lycée name is between the numeric prefix and the formation text.
    """
    results: list[VoeuResult] = []

    for line in lines:
        # Extract rank (first number)
        rank_match = re.match(r"^(\d+)\s+", line)
        if not rank_match:
            continue
        rang = int(rank_match.group(1))

        # Extract seuil (last number on the line, possibly decimal)
        seuil_match = re.search(r"(\d+(?:\.\d+)?)\s*$", line)
        if not seuil_match:
            continue
        seuil = float(seuil_match.group(1))

        # Find where the numeric prefix ends and the lycée name begins.
        prefix_match = _NUMERIC_PREFIX.match(line)
        if not prefix_match:
            continue

        # Detect boursier: 600 appears as an exact integer token in the numeric prefix.
        # It's distinctive — other fields are bonus_secteur (0/16800/17760/32640),
        # socle (4800), or scores (typically 1000+).
        prefix_tokens = prefix_match.group().split()
        is_boursier = "600" in prefix_tokens

        rest = line[prefix_match.end():]

        # The lycée name ends where the formation starts
        formation_match = _FORMATION.search(rest)
        if formation_match:
            nom_lycee = rest[:formation_match.start()].strip()
        else:
            # Fallback: take text before "Affecté"
            affect_match = re.search(r"\s+Affect", rest)
            if affect_match:
                nom_lycee = rest[:affect_match.start()].strip()
            else:
                continue

        if nom_lycee:
            results.append(VoeuResult(rang=rang, nom_lycee=nom_lycee.upper(), seuil=seuil, is_boursier=is_boursier))

    return results
