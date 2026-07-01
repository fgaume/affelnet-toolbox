"""Reconstruit ce qui est identifiable à partir de fiches barèmes réelles.

RÉSULTAT IMPORTANT SUR L'IDENTIFIABILITÉ
========================================
Pour une fiche j, de moyennes de champ T[j][i] (i = 1..7) et de barème B[j] :

    B[j] = 2.5 * sum_i w_i * 10 * (10 + (T[j][i] - mu_i) / sigma_i)
         = 7500 + 25 * sum_i (w_i / sigma_i) * T[j][i]
                - 25 * K,   avec K = sum_i w_i * mu_i / sigma_i
                            (constante, identique pour TOUS les élèves)

Les moyennes mu_i n'apparaissent QUE dans le terme constant K : elles décalent
le barème de chaque élève de la même quantité. Elles sont donc collinéaires et
**individuellement NON identifiables** à partir des seuls barèmes : deux jeux de
moyennes différents (à K égal) produisent exactement les mêmes barèmes pour
tous les élèves (démontré numériquement).

Le système n'a donc pas 14 inconnues indépendantes mais **8** :
    - les 7 écart-types sigma_i (via les pentes w_i / sigma_i) ;
    - la constante agrégée K = sum_i w_i * mu_i / sigma_i.

BONNE NOUVELLE : ces 8 paramètres SUFFISENT à reproduire n'importe quel barème
(les moyennes individuelles ne sont jamais nécessaires au calcul du barème ni au
classement, puisqu'elles décalent tout le monde pareil). 8 fiches variées
suffisent en théorie ; 14 apporte une marge confortable et permet un ajustement
aux moindres carrés robuste aux arrondis.

Mise en équation résolue (inconnues x = [a_1..a_7, K], a_i = 1/sigma_i) :

    y[j] = (B[j] - 7500) / 25 = sum_i (w_i * T[j][i]) * a_i  -  K

Usage :
    python solve_stats.py [fiches.json]
(par défaut : fiches_test.json généré par generate_test_fiches.py)
"""

from __future__ import annotations

import json
import os
import sys

from affelnet_bareme import (
    BASE_BAREME,
    FIELDS,
    FIELD_WEIGHTS,
    WEIGHTING_COEFFICIENT,
    FieldStats,
    bareme_from_grades,
    field_raw_averages,
)
from linalg import solve

HERE = os.path.dirname(os.path.abspath(__file__))

# Échelle : y = (B - BASE_BAREME) / SCALE, avec SCALE = 2.5 * 10 = 25.
SCALE = WEIGHTING_COEFFICIENT * 10

# Nombre de paramètres réellement identifiables : 7 écart-types + 1 constante K.
N_PARAMS = len(FIELDS) + 1


def build_system(fiches: list[dict]) -> tuple[list[list[float]], list[float]]:
    """Construit A et y. Inconnues x = [a_1..a_7, K], a_i = 1/sigma_i.

    Colonne de a_i : coefficient  w_i * T[j][i].
    Colonne de K   : coefficient  -1.
    """
    n_fields = len(FIELDS)
    a_matrix: list[list[float]] = []
    y_vector: list[float] = []

    for fiche in fiches:
        averages = field_raw_averages(fiche["notes"])
        row = [0.0] * N_PARAMS
        for i, field in enumerate(FIELDS):
            row[i] = FIELD_WEIGHTS[field] * averages[field]  # coefficient de a_i
        row[n_fields] = -1.0                                  # coefficient de K
        a_matrix.append(row)
        y_vector.append((fiche["bareme"] - BASE_BAREME) / SCALE)

    return a_matrix, y_vector


def recover(fiches: list[dict]) -> tuple[dict[str, float], float]:
    """Retourne ({champ: sigma}, K) reconstruits depuis les fiches."""
    if len(fiches) < N_PARAMS:
        raise ValueError(
            f"Il faut au moins {N_PARAMS} fiches variées, {len(fiches)} fournie(s)."
        )

    a_matrix, y_vector = build_system(fiches)
    solution = solve(a_matrix, y_vector)

    sigmas: dict[str, float] = {}
    for i, field in enumerate(FIELDS):
        a_i = solution[i]
        if abs(a_i) < 1e-12:
            raise ValueError(f"a_i nul pour {field} : reconstruction impossible.")
        sigmas[field] = 1.0 / a_i
    k_value = solution[len(FIELDS)]
    return sigmas, k_value


def truth_k(truth: dict) -> float:
    """K = sum_i w_i * mu_i / sigma_i, calculé sur la vérité cachée."""
    return sum(
        FIELD_WEIGHTS[f] * truth[f]["moyenne"] / truth[f]["ecart_type"] for f in FIELDS
    )


def print_report(
    sigmas: dict[str, float], k_value: float, fiches: list[dict], truth: dict | None
) -> None:
    print("Écarts-types reconstruits par champ")
    print("=" * 64)
    header = f"{'Champ':<20}{'σ reconstruit':>16}"
    if truth:
        header += f"{'σ vérité':>14}{'Δ σ':>12}"
    print(header)
    print("-" * 64)

    max_err = 0.0
    for field in FIELDS:
        line = f"{field:<20}{sigmas[field]:>16.5f}"
        if truth and field in truth:
            t_sig = truth[field]["ecart_type"]
            d = sigmas[field] - t_sig
            max_err = max(max_err, abs(d))
            line += f"{t_sig:>14.5f}{d:>12.2e}"
        print(line)
    print("-" * 64)
    print(f"Constante agrégée K = Σ wᵢ·μᵢ/σᵢ : {k_value:.6f}")
    if truth:
        print(f"  (vérité cachée K            : {truth_k(truth):.6f})")
        print(f"Écart max sur σ à la vérité cachée : {max_err:.2e}")

    # Validation par « aller-retour » : reconstruire le barème de chaque fiche
    # à partir des σ + K reconstruits, sans jamais utiliser les moyennes.
    print("\nValidation : barème recalculé (σ+K reconstruits) vs barème fiche")
    print("-" * 64)
    worst = 0.0
    for fiche in fiches:
        averages = field_raw_averages(fiche["notes"])
        recomputed = BASE_BAREME + SCALE * (
            sum(FIELD_WEIGHTS[f] / sigmas[f] * averages[f] for f in FIELDS) - k_value
        )
        worst = max(worst, abs(recomputed - fiche["bareme"]))
    print(f"Erreur max de reproduction du barème : {worst:.3e} points")
    print(
        "\nRappel : les moyennes μᵢ individuelles ne sont PAS récupérables\n"
        "(ni nécessaires) — seule leur combinaison K l'est. Voir en-tête du script."
    )


def main() -> None:
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "fiches_test.json")
    with open(path, encoding="utf-8") as f:
        payload = json.load(f)

    fiches = payload["fiches"] if isinstance(payload, dict) else payload
    truth = payload.get("verite_cachee") if isinstance(payload, dict) else None

    print(f"Fichier : {path}")
    kind = "surdéterminé (moindres carrés)" if len(fiches) > N_PARAMS else "exact"
    print(f"Nombre de fiches : {len(fiches)} — système {kind}, {N_PARAMS} paramètres\n")

    sigmas, k_value = recover(fiches)
    print_report(sigmas, k_value, fiches, truth)


if __name__ == "__main__":
    main()
