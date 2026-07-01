# Reconstruction des stats de champs depuis les fiches barèmes 2026

Depuis 2026, les fiches barèmes Affelnet ne détaillent plus les 7 notes
harmonisées par champ disciplinaire : elles ne donnent que **les 12 notes brutes
de matières** et **le barème scolaire global** (« Barème Évaluation », de l'ordre
de 8000 pts). Impossible, à première vue, de retrouver les couples
`(moyenne, écart-type)` de chaque champ utilisés pour l'harmonisation.

Ce dossier montre ce qu'on peut — et ne peut pas — reconstruire.

## Rappel du calcul du barème

Les 12 matières sont regroupées en 7 champs. Pour chaque champ `i` :

```
T_i  = moyenne simple des matières du champ          (connue via la fiche)
H_i  = 10 * (10 + (T_i - mu_i) / sigma_i)            (note harmonisée, masquée)
barème = 2.5 * Σ_i  w_i * H_i
```

avec les coefficients `w = {FR:5, Maths:5, HG:4, LV:4, Sciences:4, Arts:4, EPS:4}`.

En développant :

```
barème = 7500 + 25 · Σ_i (w_i / sigma_i) · T_i  −  25 · K
                                                        └─ K = Σ_i w_i · mu_i / sigma_i
```

Le `7500` est le barème plancher (élève exactement dans la moyenne partout).

## Le résultat clé : ce qui est identifiable

Chaque fiche est une équation linéaire. La tentation est d'écrire « 14 fiches →
14 inconnues (7 moyennes + 7 écarts-types) → système résoluble ». **C'est faux.**

Les moyennes `mu_i` n'apparaissent que dans le terme **constant** `K` : elles
décalent le barème de *tous* les élèves de la même quantité. Elles sont donc
collinéaires — seule leur combinaison `K = Σ w_i·mu_i/sigma_i` est mesurable.
Deux jeux de moyennes différents (à `K` égal) donnent exactement les mêmes
barèmes pour tout le monde (démontré numériquement dans le solveur).

Le système a donc **8 inconnues réellement indépendantes**, pas 14 :

| Identifiable ✅ | Non identifiable ❌ |
|---|---|
| Les 7 écarts-types `sigma_i` | Les 7 moyennes `mu_i` individuelles |
| La constante agrégée `K` | — |

**Bonne nouvelle** : ces 8 paramètres suffisent à reproduire n'importe quel
barème, et le classement des élèves n'a jamais dépendu des moyennes
individuelles (elles décalent tout le monde pareil). Pour simuler un score ou le
comparer à un seuil, `(sigma_1..sigma_7, K)` est tout ce qu'il faut.

> Il faut donc **8 fiches variées au minimum** (pas 14) pour tout identifier.
> 14 fiches donne une marge confortable et permet un ajustement aux moindres
> carrés, robuste aux arrondis.

Si l'on tient à afficher les moyennes par champ, il faut **une information
externe** (p. ex. supposer les moyennes stables d'une année sur l'autre, ou une
seule note harmonisée détaillée sur une fiche) — mais c'est purement cosmétique.

## Fichiers

| Fichier | Rôle |
|---|---|
| `affelnet_bareme.py` | Cœur du calcul (miroir de `src/services/scoreCalculation.ts`) |
| `linalg.py` | Résolution de système linéaire, sans dépendance (pas de numpy) |
| `generate_test_fiches.py` | Génère 14 fiches synthétiques à partir des stats **réelles 2025** (vérité cachée) |
| `solve_stats.py` | Reconstruit `sigma_i` + `K`, valide contre la vérité cachée et par aller-retour barème |
| `validate_2025.py` | Valide la formule (harmonisation, coefficients, ×2.5) contre 8 **vraies** fiches 2025 |
| `fiches_2025_reelles.json` | Fixture : 8 vraies fiches 2025 (barème = Disciplines × 2.5) pour le solveur |

## Utilisation

```bash
cd scripts/reconstruction-stats

# 1. Générer 14 fiches de test (vérité cachée = stats 2025)
python3 generate_test_fiches.py

# 2. Reconstruire les écarts-types + K et vérifier
python3 solve_stats.py
```

Sur le jeu synthétique, les écarts-types sont retrouvés à ~1e-12 près et le
barème de chaque fiche est reproduit à ~1e-9 près.

### Validation sur de vraies fiches 2025

```bash
# Vérifie la formule (harmonisation + coefficients + ×2.5) contre les valeurs
# imprimées sur 8 vraies fiches 2025 ; détecte aussi les fiches hors-référentiel.
python3 validate_2025.py

# Rejoue le solveur À L'AVEUGLE sur ces 8 fiches réelles (barème Disciplines ×2.5).
python3 solve_stats.py fiches_2025_reelles.json
```

Résultats observés : la formule reproduit les notes harmonisées imprimées au
millième (résidu ~0.01 dû à l'arrondi des notes à 2 décimales), et le solveur
retrouve les 7 écarts-types 2025 à **±0.01** à l'aveugle. Une fiche d'un autre
référentiel (autre année/académie) se repère par un résidu anormal (>0.1) dans
`validate_2025.py` — ne jamais mélanger des référentiels différents.

### Sur de vraies fiches 2026

Fournir un JSON de la même forme que `fiches_test.json` (au moins 8, idéalement
≥14 fiches), sans `verite_cachee` :

```json
{
  "fiches": [
    { "eleve": "FLAVIEN",
      "notes": {
        "FRANCAIS": 15.44, "MATHEMATIQUES": 16.34,
        "HISTOIRE_GEO": 11.32, "EMC": 13.33,
        "LV1": 18.23, "LV2": 16.17,
        "SVT": 16.32, "TECHNOLOGIE": 17.22, "PHYSIQUE_CHIMIE": 16.13,
        "ARTS_PLASTIQUES": 17.90, "EDUCATION_MUSICALE": 16.89,
        "EPS": 19.33 },
      "bareme": 8125.593191588 }
  ]
}
```

puis :

```bash
python3 solve_stats.py mes_fiches_2026.json
```

Les barèmes réels sont donnés avec ~9 décimales (ex. `8125.593191588`), ce qui
rend la reconstruction des écarts-types quasi exacte.
