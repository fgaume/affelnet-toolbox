"""Cœur du calcul du barème scolaire Affelnet (académie de Paris).

Ce module reproduit *à l'identique* la logique de
``src/services/scoreCalculation.ts`` afin de pouvoir :
  1. générer des fiches barèmes synthétiques (voir ``generate_test_fiches.py``) ;
  2. reconstruire les couples (moyenne, écart-type) des 7 champs disciplinaires
     à partir de fiches réelles (voir ``solve_stats.py``).

Rappel du calcul officiel
-------------------------
Les 12 matières de 3e sont regroupées en 7 « champs disciplinaires ».
Pour chaque champ i :

    T_i  = moyenne (arithmétique simple) des matières du champ
    H_i  = 10 * (10 + (T_i - mu_i) / sigma_i)        # note « harmonisée »
    C_i  = H_i * w_i                                  # contribution pondérée

où (mu_i, sigma_i) sont la moyenne et l'écart-type du champ i calculés sur
*toute* la cohorte parisienne (inconnues que l'on cherche à retrouver), et w_i
le coefficient du champ.

Le barème scolaire (« Barème Évaluation » sur la fiche) vaut :

    bareme = WEIGHTING_COEFFICIENT * sum_i C_i
"""

from __future__ import annotations

from dataclasses import dataclass


# --- Constantes officielles (miroir de scoreCalculation.ts) ------------------

WEIGHTING_COEFFICIENT = 2.5

# Les 12 matières, clés canoniques.
SUBJECTS = (
    "FRANCAIS",
    "MATHEMATIQUES",
    "HISTOIRE_GEO",
    "EMC",
    "LV1",
    "LV2",
    "SVT",
    "TECHNOLOGIE",
    "PHYSIQUE_CHIMIE",
    "ARTS_PLASTIQUES",
    "EDUCATION_MUSICALE",
    "EPS",
)

# Les 7 champs disciplinaires, dans un ordre fixe.
FIELDS = (
    "FRANCAIS",
    "MATHEMATIQUES",
    "HISTOIRE_GEO",
    "LANGUES_VIVANTES",
    "SCIENCES_TECHNO_DP",
    "ARTS",
    "EPS",
)

# Regroupement matières -> champ (identique au FIELD_MAPPING TypeScript).
FIELD_MAPPING = {
    "FRANCAIS": ["FRANCAIS"],
    "MATHEMATIQUES": ["MATHEMATIQUES"],
    "HISTOIRE_GEO": ["HISTOIRE_GEO", "EMC"],
    "LANGUES_VIVANTES": ["LV1", "LV2"],
    "SCIENCES_TECHNO_DP": ["SVT", "TECHNOLOGIE", "PHYSIQUE_CHIMIE"],
    "ARTS": ["ARTS_PLASTIQUES", "EDUCATION_MUSICALE"],
    "EPS": ["EPS"],
}

# Coefficients des champs (FR et Maths = 5, les autres = 4).
FIELD_WEIGHTS = {
    "FRANCAIS": 5,
    "MATHEMATIQUES": 5,
    "HISTOIRE_GEO": 4,
    "LANGUES_VIVANTES": 4,
    "SCIENCES_TECHNO_DP": 4,
    "ARTS": 4,
    "EPS": 4,
}

# Terme constant du barème : WEIGHTING_COEFFICIENT * 100 * sum(w_i).
# = 2.5 * 100 * 30 = 7500. C'est le barème « plancher » (élève exactement dans
# la moyenne de chaque champ -> H_i = 100).
BASE_BAREME = WEIGHTING_COEFFICIENT * 100 * sum(FIELD_WEIGHTS.values())


@dataclass(frozen=True)
class FieldStats:
    """Moyenne et écart-type d'un champ disciplinaire sur la cohorte."""

    moyenne: float
    ecart_type: float


def field_raw_averages(grades: dict[str, float]) -> dict[str, float]:
    """Convertit 12 notes brutes de matières en 7 moyennes de champ.

    ``grades`` : clé = matière (voir ``SUBJECTS``), valeur = note brute /20.
    Les matières manquantes (valeur ``None`` ou absente) sont ignorées dans la
    moyenne du champ, comme dans l'application.
    """
    averages: dict[str, float] = {}
    for field in FIELDS:
        values = [
            grades[s]
            for s in FIELD_MAPPING[field]
            if grades.get(s) is not None
        ]
        if not values:
            raise ValueError(f"Champ {field} sans aucune note : impossible à traiter")
        averages[field] = sum(values) / len(values)
    return averages


def harmonized_note(raw_average: float, stats: FieldStats) -> float:
    """H = 10 * (10 + (T - mu) / sigma)."""
    return 10 * (10 + (raw_average - stats.moyenne) / stats.ecart_type)


def bareme_from_field_averages(
    field_averages: dict[str, float],
    stats: dict[str, FieldStats],
) -> float:
    """Barème scolaire à partir des 7 moyennes de champ et des stats cohorte."""
    total = 0.0
    for field in FIELDS:
        h = harmonized_note(field_averages[field], stats[field])
        total += h * FIELD_WEIGHTS[field]
    return WEIGHTING_COEFFICIENT * total


def bareme_from_grades(
    grades: dict[str, float],
    stats: dict[str, FieldStats],
) -> float:
    """Barème scolaire directement à partir des 12 notes brutes."""
    return bareme_from_field_averages(field_raw_averages(grades), stats)
