# REQ2 — Indicateurs lycées de secteur 1

## Objectif

Enrichir la fiche de résultat en permettant à l'utilisateur de consulter, pour chaque lycée de secteur 1, deux indicateurs clés avec leur évolution historique et leur positionnement parmi les lycées parisiens (décile).

## Interaction

- **Déclencheur** : clic sur la **slice** (arc coloré) d'un lycée dans le donut EffectifsDonut. Les labels texte conservent leur lien existant vers la fiche Rectorat.
- **Affichage** : panel accordion qui se déplie sous le donut, dans la CollegeCard existante.
- **Comportement** : un seul lycée ouvert à la fois. Clic sur un autre lycée referme le précédent et ouvre le nouveau. Re-clic sur le même lycée referme le panel.
- **Fermeture** : re-clic sur la slice ou bouton fermer dans le panel.

## Indicateur 1 : Niveau scolaire (taux mentions TB au Bac)

### Données

- **Dataset** : `fr-en-indicateurs-de-resultat-des-lycees-gt_v2` (data.education.gouv.fr)
- **Filtre** : `uai={UAI}` pour un lycée, `code_departement=075` pour tous les lycées parisiens
- **Champs** : `nb_mentions_tb_sansf_g`, `nb_mentions_tb_avecf_g`, `presents_gnle`, `annee`
- **Formule** : `taux_TB = (nb_mentions_tb_sansf_g + nb_mentions_tb_avecf_g) / presents_gnle * 100`
- **Historique** : toutes les années disponibles
- **Décile** : comparaison du taux TB (dernière année) avec tous les lycées GT parisiens

### Graphique

- **Type** : LineChart Recharts
- **Axe X** : années
- **Axe Y** : taux mentions TB (%)
- **Courbe** : une seule, pour le lycée sélectionné
- **Tooltip** : année + valeur exacte au survol

### Jauge décile

- Barre horizontale 10 segments sous le graphique
- Segment du lycée surligné avec gradient de couleur (vert = décile élevé, rouge = décile bas)
- Texte : "Xe décile parmi les lycées parisiens"

## Indicateur 2 : IPS (Indice de Position Sociale)

### Données

- **Dataset** : `fr-en-ips-lycees-ap2023` (data.education.gouv.fr)
- **Filtre** : `uai={UAI}` pour un lycée, `refine=academie:PARIS` pour tous les lycées parisiens
- **Champs** : `ips` (moyenne IPS voie GT), `ecart_type`, `rentree_scolaire`
- **Historique** : à partir de 2023 (dataset "ap2023")
- **Décile** : comparaison de la moyenne IPS (dernière année) avec tous les lycées GT parisiens

### Graphique

- **Type** : ComposedChart Recharts (Line + Area)
- **Axe X** : années
- **Axe Y** : IPS
- **Courbe principale** : moyenne IPS
- **Bande** : Area semi-transparente = moyenne +/- écart-type
- **Tooltip** : année, moyenne IPS, écart-type au survol

### Jauge décile

- Même composant DecileGauge que pour le niveau scolaire
- Segment surligné + texte "Xe décile parmi les lycées parisiens"

## Architecture

### Nouveaux fichiers

| Fichier | Rôle |
|---------|------|
| `src/services/niveauScolaireApi.ts` | Fetch données Bac TB depuis Open Data, calcul du décile parisien. Fetch-once + cache pour les données de tous les lycées parisiens. |
| `src/services/ipsApi.ts` | Fetch données IPS depuis Open Data, calcul du décile parisien. Fetch-once + cache pour les données de tous les lycées parisiens. |
| `src/components/LyceeDetail.tsx` + `.css` | Panel accordion : charge les données au mount, affiche les deux graphiques + jauges |
| `src/components/DecileGauge.tsx` + `.css` | Composant réutilisable : barre 10 segments avec décile surligné |

### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/components/CollegeCard.tsx` | Ajout state `selectedLyceeUai`, rendu de `<LyceeDetail>` sous le donut |
| `src/components/EffectifsDonut.tsx` | Slices (arcs) cliquables via callback `onLyceeSelect(uai)`. Les labels texte conservent leur lien Rectorat. |

### Flux de données

1. User clique sur une slice du donut
2. `onLyceeSelect(uai)` remonte à CollegeCard via callback
3. CollegeCard affiche `<LyceeDetail uai={uai} nom={nom} />` en accordion sous le donut
4. LyceeDetail appelle en parallèle `niveauScolaireApi` et `ipsApi`
5. Chaque API retourne : données historiques + décile parisien (dernière année)
6. LyceeDetail rend les deux charts Recharts + deux DecileGauge

### Stratégie de cache

Les deux services (`niveauScolaireApi`, `ipsApi`) suivent le même pattern que `seuilsApi.ts` :
- Premier appel : fetch de **tous** les lycées parisiens en un seul requête, stocké en cache mémoire (`Map`)
- Appels suivants : lecture du cache, extraction des données pour l'UAI demandé
- Calcul du décile côté client à partir des données cachées

### États de chargement et d'erreur

- **Loading** : skeleton/spinner dans le panel pendant le fetch (cohérent avec `EffectifsLoading`)
- **Erreur partielle** : si une API échoue, afficher l'indicateur qui a réussi et masquer l'autre silencieusement (cohérent avec le pattern existant de silent catch)
- **Erreur totale** : pas de message d'erreur visible, le panel reste vide ou ne s'ouvre pas

## Composants Recharts utilisés

- `LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer` — pour le graphique niveau scolaire
- `ComposedChart`, `Line`, `Area`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer` — pour le graphique IPS
- `CartesianGrid` — grille de fond légère

## Style

- Le panel accordion suit le style existant de CollegeCard (même fond, padding, border-radius)
- Animation CSS d'ouverture/fermeture via `grid-template-rows: 0fr → 1fr` (gère auto-height proprement)
- Les graphiques ont une hauteur fixe de ~200px
- La jauge décile est compacte (~30px de haut)
- Responsive : les graphiques prennent 100% de la largeur disponible
