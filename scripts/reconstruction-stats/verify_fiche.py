"""Vérification « aller » : recalcule le barème d'une fiche à partir des notes
brutes et de stats (μ, σ) connues, et le compare au barème imprimé.

Sert à valider la formule (regroupement, harmonisation, coefficients, et le
coefficient de pondération 2.5) sur de VRAIES fiches 2025, dont on connaît par
ailleurs les moyennes/écarts-types officiels.

Bonus : déduit le coefficient de pondération réellement à l'œuvre,
    C = barème_imprimé / Σ wᵢ·Hᵢ
ce qui permet de confirmer (ou corriger) la valeur 2.5 depuis une seule fiche.

Usage :
    python verify_fiche.py fiche.json
où fiche.json = { "stats": {champ:{moyenne,ecart_type}}, "fiches":[{notes, bareme}] }
(le bloc "stats" tient lieu de (μ,σ) connus ; réutilisez la vérité 2025.)
"""

from __future__ import annotations

import json
import os
import sys

from affelnet_bareme import (
    FIELDS,
    FIELD_WEIGHTS,
    FieldStats,
    bareme_from_grades,
    field_raw_averages,
    harmonized_note,
)

HERE = os.path.dirname(os.path.abspath(__file__))


def implied_coefficient(fiche: dict, stats: dict[str, FieldStats]) -> float:
    """C tel que barème_imprimé = C · Σ wᵢ·Hᵢ (sans supposer 2.5)."""
    averages = field_raw_averages(fiche["notes"])
    weighted_h = sum(
        harmonized_note(averages[f], stats[f]) * FIELD_WEIGHTS[f] for f in FIELDS
    )
    return fiche["bareme"] / weighted_h


def main() -> None:
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "fiche_verif.json")
    with open(path, encoding="utf-8") as f:
        payload = json.load(f)

    stats = {
        field: FieldStats(v["moyenne"], v["ecart_type"])
        for field, v in payload["stats"].items()
    }

    print(f"Fichier : {path}\n")
    print(f"{'Fiche':<16}{'barème imprimé':>18}{'barème recalculé':>20}{'écart':>12}{'coef C déduit':>16}")
    print("-" * 82)
    for fiche in payload["fiches"]:
        name = fiche.get("eleve", "?")
        printed = fiche["bareme"]
        computed = bareme_from_grades(fiche["notes"], stats)  # utilise 2.5
        coef = implied_coefficient(fiche, stats)
        print(f"{name:<16}{printed:>18.6f}{computed:>20.6f}{computed - printed:>12.2e}{coef:>16.6f}")

    print(
        "\n« barème recalculé » utilise le coefficient 2.5 codé dans le script.\n"
        "« coef C déduit » est reconstruit sans hypothèse : s'il vaut ~2.5, le\n"
        "coefficient officiel est confirmé ; sinon c'est la vraie valeur à retenir."
    )


if __name__ == "__main__":
    main()
