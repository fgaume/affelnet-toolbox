"""Génère un jeu de fiches barèmes SYNTHÉTIQUES pour tester le solveur.

Principe
--------
On se donne une « vérité cachée » : les couples (moyenne, écart-type) des 7
champs, ici ceux réellement observés en 2025 (source : dataset Hugging Face
``fgaume/affelnet-paris-statistiques-champs-disciplinaires``).

On invente ensuite 14 jeux de 12 notes brutes de matières, et on calcule pour
chacun le barème scolaire global exactement comme le fait le Rectorat.

Cela simule le fait de disposer de 14 fiches réelles 2026 : chaque fiche donne
les 12 notes brutes + le barème global (~8000 pts), SANS le détail des champs.
Le solveur (``solve_stats.py``) doit alors retrouver les (moyenne, écart-type)
de la vérité cachée à partir de ces seules 14 fiches.

Sortie : ``fiches_test.json`` (+ ``fiches_test.csv`` lisible tableur).
Le fichier JSON contient aussi la vérité cachée, pour permettre au solveur de
vérifier automatiquement la qualité de la reconstruction.
"""

from __future__ import annotations

import csv
import json
import os
import random

from affelnet_bareme import SUBJECTS, bareme_from_grades, FieldStats

# --- Vérité cachée : stats réelles des 7 champs en 2025 ----------------------
# (moyenne, écart-type) tels que renvoyés par le dataset HF pour l'année 2025.
TRUTH_2025 = {
    "FRANCAIS": FieldStats(12.3112, 3.26782),
    "MATHEMATIQUES": FieldStats(11.8787, 3.95099),
    "HISTOIRE_GEO": FieldStats(12.606, 3.17345),
    "LANGUES_VIVANTES": FieldStats(13.1834, 3.01142),
    "SCIENCES_TECHNO_DP": FieldStats(12.9214, 2.80484),
    "ARTS": FieldStats(14.5552, 1.96101),
    "EPS": FieldStats(14.5939, 1.96253),
}

# Nombre de fiches à générer. 14 = strict minimum (14 inconnues).
# En générer davantage rend la reconstruction plus robuste aux arrondis.
N_FICHES = 14

# Précision d'affichage des notes brutes sur les fiches réelles : 2 décimales.
GRADE_DECIMALS = 2

# Les vraies fiches affichent le barème avec beaucoup de décimales
# (ex. 8125.593191588). On conserve donc une précision élevée.
BAREME_DECIMALS = 9

HERE = os.path.dirname(os.path.abspath(__file__))


def random_grade(rng: random.Random) -> float:
    """Une note brute plausible /20, arrondie à 2 décimales.

    Distribution centrée ~13 avec de la dispersion, bornée à [4, 20], pour
    couvrir des profils variés (indispensable pour que le système linéaire
    soit bien conditionné : il faut de la variété entre les fiches)."""
    value = rng.gauss(13.0, 3.0)
    value = max(4.0, min(20.0, value))
    return round(value, GRADE_DECIMALS)


def make_fiche(rng: random.Random, name: str) -> dict:
    grades = {subject: random_grade(rng) for subject in SUBJECTS}
    bareme = bareme_from_grades(grades, TRUTH_2025)
    return {
        "eleve": name,
        "notes": grades,
        "bareme": round(bareme, BAREME_DECIMALS),
    }


def main() -> None:
    rng = random.Random(2026)  # graine fixe -> jeu reproductible
    fiches = [make_fiche(rng, f"ELEVE_{i + 1:02d}") for i in range(N_FICHES)]

    payload = {
        "description": (
            "Fiches barèmes synthétiques générées à partir des stats 2025. "
            "'verite_cachee' n'est PAS présente sur les vraies fiches ; elle "
            "sert uniquement à valider la reconstruction."
        ),
        "verite_cachee": {
            field: {"moyenne": s.moyenne, "ecart_type": s.ecart_type}
            for field, s in TRUTH_2025.items()
        },
        "fiches": fiches,
    }

    json_path = os.path.join(HERE, "fiches_test.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    csv_path = os.path.join(HERE, "fiches_test.csv")
    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["eleve", *SUBJECTS, "bareme"])
        for fiche in fiches:
            writer.writerow(
                [fiche["eleve"], *[fiche["notes"][s] for s in SUBJECTS], fiche["bareme"]]
            )

    print(f"{len(fiches)} fiches générées.")
    print(f"  - {json_path}")
    print(f"  - {csv_path}")
    print("\nAperçu des barèmes :")
    for fiche in fiches:
        print(f"  {fiche['eleve']} : {fiche['bareme']:.3f}")


if __name__ == "__main__":
    main()
