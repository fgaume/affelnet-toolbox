"""Validation de la formule du barème contre de VRAIES fiches 2025.

Les fiches barèmes 2025 (ancien format) impriment encore, pour chaque champ, la
note harmonisée et la moyenne du champ. On s'en sert pour valider — sur données
réelles — que :

  1. ma note harmonisée recalculée (stats 2025) = la note harmonisée imprimée ;
  2. Σ wᵢ·Hᵢ = le barème « Disciplines » du tableau du bas ;
  3. une fiche d'un autre référentiel (autre année/académie) se détecte comme un
     résidu anormalement grand à l'étape 1 (garde-fou anti-mélange).

Les 12 notes brutes, les 7 notes harmonisées imprimées et le barème Disciplines
ci-dessous sont transcrits des PDF de docs/fiches-baremes-2025/.

Le solveur inverse (retrouver σ + K depuis 12 notes + barème) est testé
séparément : voir fiches_2025_reelles.json + solve_stats.py, et le test
scripts/tests/test_reconstruction_stats.py::test_vraies_fiches_2025.

Usage : python validate_2025.py
"""

from __future__ import annotations

from affelnet_bareme import (
    FIELDS,
    FIELD_WEIGHTS,
    FieldStats,
    field_raw_averages,
    harmonized_note,
)

# Stats officielles Paris 2025 (dataset HF).
TRUTH = {
    "FRANCAIS": FieldStats(12.3112, 3.26782),
    "MATHEMATIQUES": FieldStats(11.8787, 3.95099),
    "HISTOIRE_GEO": FieldStats(12.606, 3.17345),
    "LANGUES_VIVANTES": FieldStats(13.1834, 3.01142),
    "SCIENCES_TECHNO_DP": FieldStats(12.9214, 2.80484),
    "ARTS": FieldStats(14.5552, 1.96101),
    "EPS": FieldStats(14.5939, 1.96253),
}

# Seuil de résidu au-delà duquel une fiche est jugée hors-référentiel.
OUTLIER_THRESHOLD = 0.1


def _notes(fr, ma, lv1, lv2, eps, apla, edmus, svt, techn, phch, hige, emc):
    return {
        "FRANCAIS": fr, "MATHEMATIQUES": ma, "LV1": lv1, "LV2": lv2, "EPS": eps,
        "ARTS_PLASTIQUES": apla, "EDUCATION_MUSICALE": edmus, "SVT": svt,
        "TECHNOLOGIE": techn, "PHYSIQUE_CHIMIE": phch, "HISTOIRE_GEO": hige, "EMC": emc,
    }


# (nom, barème Disciplines du tableau [None si absent], 12 notes, 7 H imprimées)
FICHES = [
    ("PierreAlviset", 3077.166,
     _notes(11.33, 14, 16, 15, 15, 16, 14, 11.33, 15, 15, 13, 13),
     {"ARTS": 102.269, "EPS": 102.069, "FRANCAIS": 96.997, "HISTOIRE_GEO": 101.242,
      "LANGUES_VIVANTES": 107.693, "MATHEMATIQUES": 105.369, "SCIENCES_TECHNO_DP": 103.061}),
    ("Braque-Rodin", 2988.493,
     _notes(13, 14, 14, 15, 14, 14, 16, 11.33, 13, 13.33, 8, 8),
     {"ARTS": 102.269, "EPS": 96.974, "FRANCAIS": 102.108, "HISTOIRE_GEO": 85.486,
      "LANGUES_VIVANTES": 104.372, "MATHEMATIQUES": 105.369, "SCIENCES_TECHNO_DP": 98.676}),
    ("Lamartine", 3105.858,
     _notes(13, 13, 11.33, 14, 16, 16, 16, 14, 16, 11.33, 14, 14),
     {"ARTS": 107.368, "EPS": 107.165, "FRANCAIS": 102.108, "HISTOIRE_GEO": 104.393,
      "LANGUES_VIVANTES": 98.295, "MATHEMATIQUES": 102.838, "SCIENCES_TECHNO_DP": 103.061}),
    ("Boursier-Charlemagne", 3137.430,
     _notes(15, 12.33, 14, 15, 16, 16, 13, 14.5, 13, 14.5, 15, 15),
     {"ARTS": 99.719, "EPS": 107.165, "FRANCAIS": 108.228, "HISTOIRE_GEO": 107.544,
      "LANGUES_VIVANTES": 104.372, "MATHEMATIQUES": 101.142, "SCIENCES_TECHNO_DP": 103.845}),
    ("Charlemagne", 2899.866,
     _notes(8, 8, 13, 16, 14, 16, 15, 9.66, 13, 13, 13, 13),
     {"ARTS": 104.818, "EPS": 96.974, "FRANCAIS": 86.807, "HISTOIRE_GEO": 101.242,
      "LANGUES_VIVANTES": 104.372, "MATHEMATIQUES": 90.183, "SCIENCES_TECHNO_DP": 96.323}),
    ("Oeben-Arago", 3225.687,
     _notes(15, 16, 14, 15, 16, 16, 16, 15, 16, 16, 14, 14),
     {"ARTS": 107.368, "EPS": 107.165, "FRANCAIS": 108.228, "HISTOIRE_GEO": 104.393,
      "LANGUES_VIVANTES": 104.372, "MATHEMATIQUES": 110.431, "SCIENCES_TECHNO_DP": 109.800}),
    ("Charlemagne-Weil", 3172.245,
     _notes(13, 14, 16, 16, 16, 16, 16, 15, 16, 15, 13, 13),
     {"ARTS": 107.368, "EPS": 107.165, "FRANCAIS": 102.108, "HISTOIRE_GEO": 101.242,
      "LANGUES_VIVANTES": 109.353, "MATHEMATIQUES": 105.369, "SCIENCES_TECHNO_DP": 108.587}),
    ("Oeben-H4", None,  # barème Disciplines absent du tableau (H4 hors barème)
     _notes(16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16),
     {"ARTS": 107.368, "EPS": 107.165, "FRANCAIS": 111.288, "HISTOIRE_GEO": 110.695,
      "LANGUES_VIVANTES": 109.353, "MATHEMATIQUES": 110.431, "SCIENCES_TECHNO_DP": 110.976}),
]


def main() -> None:
    print("1) Note harmonisée recalculée (stats 2025) vs IMPRIMÉE")
    print(f"   2) Σ wᵢ·H imprimée vs barème « Disciplines » du tableau\n")
    print(f"{'Fiche':<22}{'résidu max H':>14}{'champ pire':>20}{'Σ wᵢ·H':>12}{'disc':>12}{'écart':>10}")
    print("-" * 90)
    for nom, disc, notes, harm in FICHES:
        averages = field_raw_averages(notes)
        worst, worst_field = 0.0, ""
        for field in FIELDS:
            d = abs(harmonized_note(averages[field], TRUTH[field]) - harm[field])
            if d > worst:
                worst, worst_field = d, field
        weighted = sum(harm[f] * FIELD_WEIGHTS[f] for f in FIELDS)
        flag = "  ⚠ HORS-RÉFÉRENTIEL" if worst > OUTLIER_THRESHOLD else ""
        disc_s = f"{disc:>12.3f}" if disc is not None else f"{'absent':>12}"
        gap_s = f"{weighted - disc:>10.3f}" if disc is not None else f"{'(n/a)':>10}"
        print(f"{nom:<22}{worst:>14.4f}{worst_field:>20}{weighted:>12.3f}{disc_s}{gap_s}{flag}")

    print(
        "\nRésidu H ~0.01 = arrondi des notes à 2 décimales (normal).\n"
        "Un résidu >0.1 signale une fiche d'un autre référentiel (année/académie)."
    )


if __name__ == "__main__":
    main()
