"""Émet le modèle de stats 2026 consommable par l'appli, depuis des fiches réelles.

Chaîne complète :
    fiches 2026 (12 notes + barème)  --solve_stats-->  σ_i + K
                                     --ici-->           modèle 2026 publiable

L'appli calcule le barème à partir d'un couple (moyenne, écart-type) par champ.
Or en 2026 les moyennes μ_i individuelles ne sont pas identifiables (cf. README) :
seuls les 7 écarts-types σ_i et la constante K = Σ wᵢ·μᵢ/σᵢ le sont. Comme le
détail par champ n'est plus affiché dans l'appli, on encode K via des moyennes
« effectives » qui n'ont pas vocation à être lues :

    μ*_i = (K / Σ wᵢ) · σ_i          (Σ wᵢ = 30)

Elles vérifient Σ wᵢ·μ*_i/σ_i = K, donc le couple (μ*_i, σ_i) reproduit le
barème total EXACTEMENT, sans aucun changement de code côté appli.

Sortie : un JSON au format du dataset legacy
``fgaume/affelnet-paris-statistiques-champs-disciplinaires`` (une ligne / champ),
prêt à fusionner puis publier. Publier l'année 2026 en fait le modèle par défaut.

Usage :
    python emit_2026_model.py fiches_2026.json [--annee 2026] [-o modele_2026.json]
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone

from affelnet_bareme import FIELDS, FIELD_WEIGHTS, FieldStats, bareme_from_grades
from solve_stats import recover

# Noms de champ canoniques -> noms du dataset legacy.
LEGACY_CHAMP = {
    "FRANCAIS": "FRANCAIS",
    "MATHEMATIQUES": "MATHEMATIQUES",
    "HISTOIRE_GEO": "HISTOIRE-GEO",
    "LANGUES_VIVANTES": "LANGUES VIVANTES",
    "SCIENCES_TECHNO_DP": "SCIENCES-TECHNO-DP",
    "ARTS": "ARTS",
    "EPS": "EPS",
}

SUM_WEIGHTS = sum(FIELD_WEIGHTS.values())  # 30


def effective_means(sigmas: dict[str, float], k_value: float) -> dict[str, float]:
    """μ*_i = (K / Σ wᵢ) · σ_i — encode K en gardant le barème total exact."""
    factor = k_value / SUM_WEIGHTS
    return {field: factor * sigmas[field] for field in FIELDS}


def build_records(
    sigmas: dict[str, float], mus: dict[str, float], annee: int, n_fiches: int
) -> list[dict]:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return [
        {
            "annee": annee,
            "champ": LEGACY_CHAMP[field],
            # 8 décimales : les barèmes des fiches sont eux-mêmes précis à 1e-8,
            # arrondir à 5 décimales dégradait la reproduction (~6e-4 pt).
            "moyenne": round(mus[field], 8),
            "ecart-type": round(sigmas[field], 8),
            "precision": n_fiches,
            "mis_a_jour": now,
        }
        for field in FIELDS
    ]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("fiches", help="JSON des fiches (12 notes + barème par fiche)")
    parser.add_argument("--annee", type=int, default=2026)
    parser.add_argument("-o", "--output", default=None)
    args = parser.parse_args()

    with open(args.fiches, encoding="utf-8") as f:
        payload = json.load(f)
    fiches = payload["fiches"] if isinstance(payload, dict) else payload

    sigmas, k_value = recover(fiches)
    mus = effective_means(sigmas, k_value)

    # Garde-fou : le modèle (μ*, σ) doit reproduire chaque barème d'entrée.
    stats = {f: FieldStats(mus[f], sigmas[f]) for f in FIELDS}
    worst = max(abs(bareme_from_grades(fi["notes"], stats) - fi["bareme"]) for fi in fiches)

    records = build_records(sigmas, mus, args.annee, len(fiches))

    out = args.output or os.path.join(os.path.dirname(os.path.abspath(args.fiches)),
                                      f"modele_{args.annee}.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print(f"Modèle {args.annee} émis depuis {len(fiches)} fiches — K = {k_value:.4f}")
    print(f"{'champ':<22}{'σ (ecart-type)':>16}{'μ* (encode K)':>16}")
    for field in FIELDS:
        print(f"{LEGACY_CHAMP[field]:<22}{sigmas[field]:>16.5f}{mus[field]:>16.5f}")
    print(f"\nGaranti : barème total reproduit à {worst:.2e} pt près sur les fiches d'entrée.")
    print(f"Écrit : {out}")
    print("→ fusionner ces lignes dans le dataset legacy puis publier "
          "(l'année la plus récente devient le modèle par défaut de l'appli).")


if __name__ == "__main__":
    main()
