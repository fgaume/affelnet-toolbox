# REQ3 — Collèges en concurrence

## Objectif

Pour chaque lycée de secteur 1, permettre à l'utilisateur de déplier un panneau montrant graphiquement l'ensemble des collèges ayant ce lycée en secteur 1 (collèges en concurrence). Les collèges sont regroupés par bonus IPS 2026 et leur poids respectif en effectif (nombre d'admis DNB) est représenté visuellement.

## Décisions de design

| Question | Décision |
|----------|----------|
| Interaction d'accès | Chevron dépliable sur chaque lycée de secteur 1, sous le donut |
| Mesure d'effectif collège | Nombre d'admis DNB (`nb_candidats_g * taux_de_reussite_g / 100`) |
| Regroupement | Par valeur exacte du bonus IPS (0, 400, 800, 1200) |
| Type de graphique | Stacked bar chart (Recharts) |
| Affichage des noms | Tooltip au survol uniquement |
| Collège de l'utilisateur | Mis en évidence (hachures/bordure + mention légende) |
| Résumé textuel | Non, graphique seul |

## Architecture

### Approche : Service dédié + composant autonome (lazy loading)

Le chargement se fait à la demande, au clic sur le chevron. Pas de prefetch global.

### Data Flow

Pour un lycée de secteur 1 donné (UAI), au clic sur le chevron :

1. **ArcGIS Rectorat** (Use Case 3 du skill affelnet-secteurs-paris) → liste des UAI collèges ayant ce lycée en secteur 1
2. **HuggingFace** `fgaume/affelnet-paris-bonus-ips-colleges` → bonus IPS 2026 pour chaque collège
3. **OpenData** `fr-en-indicateurs-valeur-ajoutee-colleges` → `nb_candidats_g` et `taux_de_reussite_g` par collège

Les 3 sources sont jointes par UAI collège.

### Service Layer

Nouveau fichier `src/services/collegesConcurrenceApi.ts` :

```typescript
interface CollegeConcurrent {
  uai: string;
  nom: string;
  bonusIps: number;       // 0, 400, 800, 1200
  nbAdmis: number;        // nb_candidats * taux_reussite / 100
}

function fetchCollegesConcurrents(uaiLycee: string): Promise<CollegeConcurrent[]>
```

- Orchestre les 3 appels API en parallèle (ArcGIS pour la liste, puis IPS + DNB en batch)
- Cache par UAI lycée (module-level) pour éviter les re-fetches au repliage/dépliage
- Les datasets IPS collèges (HuggingFace) et DNB (OpenData) sont chargés une seule fois et cachés, comme le pattern existant dans `ipsApi.ts`

### Composant

Nouveau fichier `src/components/CollegesConcurrence.tsx` :

- **Props** : `uaiLycee: string`, `uaiCollegeUtilisateur: string`
- **State interne** : données chargées, loading, error
- **Stacked bar chart (Recharts)** :
  - Axe X = groupes de bonus IPS (1200, 800, 400, 0)
  - Axe Y = nombre d'admis DNB
  - Chaque barre empilée avec les collèges du groupe
  - 4 couleurs distinctes par groupe de bonus
  - Collège de l'utilisateur mis en évidence (hachures ou bordure + opacité différente)
  - Tooltip au survol : nom du collège, nb admis, bonus IPS
- **Légende** : 4 groupes de bonus + indicateur "Votre collège"

### Intégration dans CollegeCard

- Section ajoutée sous le donut des effectifs (secteur 1 uniquement)
- Liste compacte des lycées de secteur 1 avec chevron dépliable
- État `expandedLycee: string | null` dans CollegeCard (un seul lycée déplié à la fois)
- Le panneau `CollegesConcurrence` se déplie sous le lycée cliqué

## Gestion d'erreurs & edge cases

- **Lycée sans collèges** (ArcGIS retourne 0 résultats) : pas de chevron affiché
- **Données IPS ou DNB manquantes** : collège affiché avec nb admis = 0 ou bonus "inconnu" (segment grisé)
- **Collège utilisateur absent** de la liste : pas de mise en évidence, chart normal
- **Erreur réseau** : message d'erreur discret dans le panneau, possibilité de retry

## Tests

- **Tests unitaires (Vitest)** : service `collegesConcurrenceApi` avec mocked fetch, calcul nb admis
- **Pas de tests E2E** supplémentaires (APIs externes instables)
