# REQ1 — Recherche Secteur : Collège + Lycées

## Objectif

Permettre à l'utilisateur de :
1. Déterminer son **collège de secteur** à partir de son adresse parisienne
2. Déduire les **lycées de secteur Affelnet** (secteur 1, 2, 3) à partir du collège

## Changement par rapport à l'existant

L'implémentation actuelle utilise `data.education.gouv.fr` avec une recherche par rayon de 5km, qui retourne le collège le plus proche — pas forcément le collège **de secteur**. On migre vers les APIs officielles de la carte scolaire (CapGeo Paris + ArcGIS Rectorat) et on ajoute la recherche des lycées de secteur.

## Data Flow

```
Adresse (autocomplete api-adresse.data.gouv.fr, inchangé)
  → lat/lon WGS84
  → conversion Web Mercator (formule mathématique, pas de lib)
  → CapGeo carte scolaire → nom du collège de secteur
  → ArcGIS Rectorat (recherche par nom) → UAI du collège
  → ArcGIS Rectorat (recherche par UAI) → lycées secteur 1/2/3
  → Affichage collège + lycées dans un seul écran
```

## Architecture

### Services

#### `src/services/geo.ts` (nouveau)

Utilitaire de conversion de coordonnées.

```typescript
interface MercatorPoint { x: number; y: number }

function wgs84ToWebMercator(lat: number, lon: number): MercatorPoint
```

Formule directe WGS84 → EPSG:3857 (~10 lignes, pas de dépendance externe).

#### `src/services/sectorApi.ts` (nouveau, remplace `collegeApi.ts`)

Trois fonctions correspondant aux 3 étapes du pipeline :

**`findCollegeDeSecteur(lat: number, lon: number): Promise<string>`**
- Convertit lat/lon en Web Mercator via `geo.ts`
- **Attention :** `Address.coordinates` est `[longitude, latitude]` — le hook doit inverser l'ordre avant d'appeler cette fonction
- Appelle la carte scolaire CapGeo Paris :
  ```
  GET https://capgeo2.paris.fr/public/rest/services/DASCO/DASCO_Carte_scolaire/MapServer/0/query
    ?where=annee_scol='2025-2026' AND type_etabl='COL'
    &geometry={"x":...,"y":...}
    &geometryType=esriGeometryPoint
    &spatialRel=esriSpatialRelIntersects
    &inSR=102100&outSR=102100
    &outFields=libelle,type_etabl
    &returnGeometry=false
    &f=json
  ```
- L'année scolaire `2025-2026` est valide pour l'année en cours. À mettre à jour manuellement chaque rentrée (pas de calcul automatique pour éviter les erreurs de transition).
- Retourne le champ `libelle` (nom du collège)

**`findCollegeUAI(nomCollege: string): Promise<string>`**
- Appelle l'API ArcGIS Rectorat :
  ```
  GET https://services9.arcgis.com/.../Affectation_Lycées/FeatureServer/0/query
    ?where=Nom_Tete like '%{nom}'
    &outFields=Réseau,Nom_Tete
    &returnDistinctValues=true
    &returnGeometry=false
    &f=pjson
  ```
- **Normalisation du nom :** le champ `libelle` de CapGeo retourne par exemple `"COLLEGE VOLTAIRE"`. Avant la requête ArcGIS, supprimer le préfixe `"COLLEGE "` (ou `"CLG "`) pour ne garder que le nom propre (ex: `"VOLTAIRE"`). Le `like '%VOLTAIRE'` dans ArcGIS matchera alors correctement.
- **Disambiguation :** si plusieurs résultats, prendre le premier (les noms de collèges parisiens sont uniques dans la base ArcGIS une fois le préfixe retiré).
- Retourne le champ `Réseau` (UAI du collège)
- **Sémantique des champs ArcGIS :** `Réseau` = UAI du collège, `Nom_Tete` = nom du collège, `UAI` = UAI du lycée, `Nom` = nom du lycée

**`findLyceesDeSecteur(uaiCollege: string): Promise<LyceeSecteur[]>`**
- Appelle l'API ArcGIS Rectorat :
  ```
  GET https://services9.arcgis.com/.../Affectation_Lycées/FeatureServer/0/query
    ?where=secteur<>'Tete' and Réseau='{uai}'
    &outFields=UAI,Nom,secteur
    &orderByFields=secteur
    &returnGeometry=false
    &f=pjson
  ```
- Le filtre `secteur<>'Tete'` exclut la ligne "tête de réseau" (le collège lui-même dans la table) pour ne garder que les lycées
- Retourne la liste des lycées avec UAI, nom, et numéro de secteur

#### `src/services/addressApi.ts` — inchangé

#### `src/services/collegeApi.ts` — supprimé

### Types

Modifications dans `src/types/index.ts` :

```typescript
// Remplace l'ancien type College
interface CollegeSecteur {
  nom: string;
  uai: string;
}

interface LyceeSecteur {
  uai: string;
  nom: string;
  secteur: number; // 1, 2 ou 3
}

// Résultat complet d'une recherche de secteur
// lycees est optionnel : si la recherche lycées échoue, on affiche quand même le collège
interface SectorResult {
  college: CollegeSecteur;
  lycees: LyceeSecteur[] | null;
  lyceeError?: string; // message si la recherche lycées a échoué
}
```

Suppression du type `College` existant. Adaptation de `SearchHistory` :

```typescript
interface SearchHistory {
  id: string;
  address: Address;
  result: SectorResult; // collège + lycées (le résultat complet est stocké)
  timestamp: number;
}
```

Le `SectorResult` complet est stocké dans l'historique pour permettre un réaffichage instantané sans re-appeler les APIs. Au clic sur une entrée d'historique, on affiche directement le résultat sauvegardé.

**Migration localStorage :** au chargement, si les données existantes ont l'ancien format (champ `college` avec les anciens champs), on les ignore silencieusement (clear implicite). Pas de migration complexe — l'historique est un confort, pas une donnée critique.

### Hooks

#### `src/hooks/useSectorSearch.ts` (nouveau, remplace `useCollegeSearch.ts`)

```typescript
interface UseSectorSearchReturn {
  result: SectorResult | null;
  isLoading: boolean;
  error: string | null;
  searchedAddress: Address | null;
  searchSector: (address: Address) => Promise<void>;
  reset: () => void;
}
```

Orchestre les 3 appels en cascade :
1. `findCollegeDeSecteur(lat, lon)` → nom
2. `findCollegeUAI(nom)` → UAI
3. `findLyceesDeSecteur(UAI)` → lycées

Sauvegarde du `SectorResult` complet en historique après succès. Au clic sur une entrée d'historique, le résultat est affiché directement (pas de re-fetch).

#### `src/hooks/useAddressSearch.ts` — inchangé
#### `src/hooks/useSearchHistory.ts` — adaptations mineures si le type SearchHistory change
#### `src/hooks/useCollegeSearch.ts` — supprimé

### Composants

#### `src/components/CollegeCard.tsx` — adapté

Reçoit `SectorResult` au lieu de `College`. Affiche :
- **Section collège** : nom + UAI
- **Section lycées** : groupés par secteur (1, 2, 3), chaque lycée avec nom + UAI

#### `src/components/App.tsx` — adapté

Branche sur `useSectorSearch` au lieu de `useCollegeSearch`.

#### Autres composants — inchangés ou adaptations mineures des props

### Gestion d'erreurs

Chaque étape du pipeline a un message d'erreur spécifique :

| Étape | Message |
|-------|---------|
| Carte scolaire CapGeo | "Aucun collège de secteur trouvé pour cette adresse" |
| Recherche UAI | "Collège non référencé dans l'annuaire Affelnet" |
| Recherche lycées | Afficher le collège quand même + "Lycées de secteur non disponibles" |

### Storage

`src/services/storage.ts` — adapté pour stocker le `SectorResult` complet (collège + lycées) dans l'historique. Migration : les anciennes données au format `College` sont ignorées (clear implicite au premier chargement si le format ne correspond pas).

### CORS

Les APIs CapGeo Paris et ArcGIS (`services9.arcgis.com`) supportent les requêtes cross-origin depuis le navigateur (vérifié : pas de restriction CORS). Pas besoin de proxy.

### Footer / Attribution

Mettre à jour le footer de `App.tsx` pour créditer les sources de données : CapGeo Paris (carte scolaire) et ArcGIS Rectorat (réseau Affelnet) au lieu de `data.education.gouv.fr`.

## Cas de test E2E (Playwright)

### Tests du pipeline complet

Ces tests appellent les APIs réelles (pas de mock). Les données de secteur changent chaque année scolaire — les valeurs attendues ci-dessous sont valides pour **2025-2026**. À mettre à jour à chaque rentrée.

| # | Adresse | Collège attendu | UAI | Lycées secteur 1 attendus |
|---|---------|-----------------|-----|---------------------------|
| 1 | 12 passage Saint-Ambroise | VOLTAIRE | 0752536Z | Dorian, Charlemagne, Colbert, Turgot, Voltaire |
| 2 | 15 rue de Rivoli | FRANCOIS COUPERIN | 0752693V | Lavoisier, Charlemagne, S. Weil, S. Germain, Voltaire |
| 3 | 45 rue de Belleville | CHARLES PEGUY | 0751706X | Diderot, Boucher, Bergson, S. Germain, Lamartine |
| 4 | 8 avenue de Suffren | GUILLAUME APOLLINAIRE | 0752190Y | J. de Sailly, J. de La Fontaine, J.B. Say, Buffon, V. Duruy |
| 5 | 120 boulevard de Ménilmontant | COLETTE BESSON | 0755241P | Charlemagne, Colbert, Boucher, V. Hugo, Voltaire |

### Tests unitaires

- `geo.ts` : vérifier la conversion WGS84 → Web Mercator avec des coordonnées connues
- `sectorApi.ts` : mock des APIs, vérifier le chaînage et le parsing des réponses
- `useSectorSearch` : vérifier les états loading/error/success et le chaînage

### Tests d'erreur

- Adresse hors Paris → message d'erreur approprié
- API CapGeo indisponible → message d'erreur
- Collège trouvé mais UAI introuvable → afficher collège sans lycées
- API ArcGIS indisponible → afficher collège sans lycées

## Fichiers impactés

| Action | Fichier |
|--------|---------|
| Créer | `src/services/geo.ts` |
| Créer | `src/services/sectorApi.ts` |
| Créer | `src/hooks/useSectorSearch.ts` |
| Créer | `tests/e2e/sector-search.spec.ts` |
| Créer | `tests/unit/geo.test.ts` |
| Modifier | `src/types/index.ts` |
| Modifier | `src/components/CollegeCard.tsx` + CSS |
| Modifier | `src/App.tsx` |
| Modifier | `src/services/storage.ts` |
| Modifier | `src/hooks/useSearchHistory.ts` (si type SearchHistory change) |
| Supprimer | `src/services/collegeApi.ts` |
| Supprimer | `src/hooks/useCollegeSearch.ts` |

## Dépendances

Aucune nouvelle dépendance npm. La conversion de coordonnées est une formule mathématique directe. Playwright à installer pour les tests E2E.
