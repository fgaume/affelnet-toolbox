"""Tests de scripts/reconstruction-stats — reconstruction des stats de champ
depuis les fiches barèmes 2026 (12 notes brutes + barème global).

Points vérifiés :
  - formule du barème (barème plancher, valeur connue) ;
  - reconstruction exacte des 7 écarts-types + K sur données synthétiques ;
  - non-identifiabilité des moyennes individuelles (résultat clé) ;
  - robustesse aux arrondis du barème et gain apporté par les fiches en surplus.
"""

import json
import random
import sys
from pathlib import Path

import pytest

# Le module vit dans scripts/reconstruction-stats/ (nom non importable tel quel).
RECON_DIR = Path(__file__).resolve().parent.parent / "reconstruction-stats"
sys.path.insert(0, str(RECON_DIR))

from affelnet_bareme import (  # noqa: E402
    BASE_BAREME,
    FIELDS,
    FIELD_WEIGHTS,
    SUBJECTS,
    FieldStats,
    bareme_from_grades,
    field_raw_averages,
)
from solve_stats import recover, truth_k  # noqa: E402

# Vérité cachée : stats réelles 2025 (dataset HF).
TRUTH = {
    "FRANCAIS": FieldStats(12.3112, 3.26782),
    "MATHEMATIQUES": FieldStats(11.8787, 3.95099),
    "HISTOIRE_GEO": FieldStats(12.606, 3.17345),
    "LANGUES_VIVANTES": FieldStats(13.1834, 3.01142),
    "SCIENCES_TECHNO_DP": FieldStats(12.9214, 2.80484),
    "ARTS": FieldStats(14.5552, 1.96101),
    "EPS": FieldStats(14.5939, 1.96253),
}
TRUTH_DICT = {
    f: {"moyenne": s.moyenne, "ecart_type": s.ecart_type} for f, s in TRUTH.items()
}


def make_fiches(n, seed, bareme_decimals=None):
    """n fiches synthétiques à profils variés, barème calculé depuis TRUTH."""
    rng = random.Random(seed)
    fiches = []
    for _ in range(n):
        notes = {s: round(max(4.0, min(20.0, rng.gauss(13.0, 3.0))), 2) for s in SUBJECTS}
        bareme = bareme_from_grades(notes, TRUTH)
        if bareme_decimals is not None:
            bareme = round(bareme, bareme_decimals)
        fiches.append({"notes": notes, "bareme": bareme})
    return fiches


def test_bareme_plancher():
    """Un élève exactement dans la moyenne de chaque champ -> barème = 7500."""
    grades = {}
    for field in FIELDS:
        from affelnet_bareme import FIELD_MAPPING

        for subject in FIELD_MAPPING[field]:
            grades[subject] = TRUTH[field].moyenne
    assert bareme_from_grades(grades, TRUTH) == pytest.approx(7500.0, abs=1e-9)
    assert BASE_BAREME == 7500.0


def test_moyennes_non_identifiables():
    """Deux jeux de moyennes différents, à K égal, donnent le MÊME barème."""
    shifted = dict(TRUTH)
    d_fr = 1.0
    # Compenser sur les maths pour garder K = Σ w·μ/σ inchangé.
    d_math = -(d_fr / TRUTH["FRANCAIS"].ecart_type) * TRUTH["MATHEMATIQUES"].ecart_type
    shifted["FRANCAIS"] = FieldStats(
        TRUTH["FRANCAIS"].moyenne + d_fr, TRUTH["FRANCAIS"].ecart_type
    )
    shifted["MATHEMATIQUES"] = FieldStats(
        TRUTH["MATHEMATIQUES"].moyenne + d_math, TRUTH["MATHEMATIQUES"].ecart_type
    )
    grades = {s: 13.0 for s in SUBJECTS}
    grades["FRANCAIS"], grades["MATHEMATIQUES"] = 17.0, 9.0
    assert bareme_from_grades(grades, TRUTH) == pytest.approx(
        bareme_from_grades(grades, shifted), abs=1e-9
    )


def test_reconstruction_exacte_14_fiches():
    """14 fiches, barème pleine précision -> σ et K retrouvés quasi exactement."""
    sigmas, k_value = recover(make_fiches(14, seed=2026))
    for field in FIELDS:
        assert sigmas[field] == pytest.approx(TRUTH[field].ecart_type, abs=1e-9)
    assert k_value == pytest.approx(truth_k(TRUTH_DICT), abs=1e-9)


def test_minimum_8_fiches_suffit():
    """8 fiches variées suffisent (8 paramètres identifiables, pas 14)."""
    sigmas, k_value = recover(make_fiches(8, seed=3))
    for field in FIELDS:
        assert sigmas[field] == pytest.approx(TRUTH[field].ecart_type, abs=1e-6)
    assert k_value == pytest.approx(truth_k(TRUTH_DICT), abs=1e-6)


def test_moins_de_8_fiches_rejete():
    with pytest.raises(ValueError):
        recover(make_fiches(7, seed=1))


def test_reproduction_bareme():
    """Les σ+K reconstruits reproduisent le barème de chaque fiche."""
    fiches = make_fiches(14, seed=2026)
    sigmas, k_value = recover(fiches)
    for fiche in fiches:
        averages = field_raw_averages(fiche["notes"])
        recomputed = BASE_BAREME + 25.0 * (
            sum(FIELD_WEIGHTS[f] / sigmas[f] * averages[f] for f in FIELDS) - k_value
        )
        assert recomputed == pytest.approx(fiche["bareme"], abs=1e-6)


def test_robustesse_arrondi_et_surplus():
    """Barème arrondi à l'entier : plus de fiches -> reconstruction meilleure."""

    def max_err(n):
        sigmas, _ = recover(make_fiches(n, seed=7, bareme_decimals=0))
        return max(abs(sigmas[f] - TRUTH[f].ecart_type) for f in FIELDS)

    err_14 = max_err(14)
    err_60 = max_err(60)
    assert err_14 < 5e-2          # déjà correct même arrondi à l'entier
    assert err_60 < err_14        # les fiches en surplus (moindres carrés) aident


def test_vraies_fiches_2025():
    """Test à l'aveugle sur 8 VRAIES fiches barèmes 2025.

    Barème = colonne « Disciplines » × 2.5 (simulation du format 2026).
    Sur données réelles, les notes affichées sont arrondies à 2 décimales, donc
    la reconstruction n'est pas exacte mais reste sous 0.02 sur σ (garde-fou de
    non-régression). Voir scripts/reconstruction-stats/README.md.
    """
    fixture = RECON_DIR / "fiches_2025_reelles.json"
    payload = json.loads(fixture.read_text(encoding="utf-8"))
    sigmas, _ = recover(payload["fiches"])
    for field in FIELDS:
        truth_sigma = payload["verite_cachee"][field]["ecart_type"]
        assert sigmas[field] == pytest.approx(truth_sigma, abs=0.02)


def test_modele_2026_reproduit_baremes():
    """Le modèle émis (μ* effectifs, σ) reproduit exactement les barèmes.

    μ* encode K sans être affiché ; le couple (μ*, σ) — consommé tel quel par
    l'appli — doit redonner le barème total de chaque fiche au flottant près.
    """
    from emit_2026_model import SUM_WEIGHTS, effective_means  # noqa: E402

    fixture = RECON_DIR / "fiches_2025_reelles.json"
    fiches = json.loads(fixture.read_text(encoding="utf-8"))["fiches"]
    sigmas, k_value = recover(fiches)
    mus = effective_means(sigmas, k_value)

    # μ* encode bien K : Σ wᵢ·μ*ᵢ/σᵢ == K.
    encoded_k = sum(FIELD_WEIGHTS[f] * mus[f] / sigmas[f] for f in FIELDS)
    assert encoded_k == pytest.approx(k_value, abs=1e-9)
    assert SUM_WEIGHTS == sum(FIELD_WEIGHTS.values())

    stats = {f: FieldStats(mus[f], sigmas[f]) for f in FIELDS}
    for fiche in fiches:
        assert bareme_from_grades(fiche["notes"], stats) == pytest.approx(
            fiche["bareme"], abs=1e-6
        )
