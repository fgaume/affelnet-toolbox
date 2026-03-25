# Donut chart des effectifs de seconde — lycées secteur 1

## Contexte

L'application affiche les lycées de secteur 1 d'un collège parisien sous forme de liste avec badges de difficulté d'admission. L'utilisateur n'a pas de vision du **poids relatif** de chaque lycée en termes de places offertes. On ajoute un donut chart Recharts montrant la répartition des effectifs de seconde GT entre les lycées de secteur 1.

## Source de données

**API OpenDataSoft** — `data.education.gouv.fr`

```
GET https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-lycee_gt-effectifs-niveau-sexe-lv/records
  ?where=numero_lycee='<UAI>'
  &order_by=rentree_scolaire desc
  &select=rentree_scolaire,`2ndes_gt`,patronyme
  &limit=1
```

- Champ clé : `2ndes_gt` (effectif 2nde générale et technologique)
- Attention : backticks obligatoires autour de `2ndes_gt` dans la clause `select` ODSQL
- Un appel par lycée secteur 1, parallélisés via `Promise.allSettled`
- Cache mémoire (même session) pour éviter les appels redondants

### Mapping API → type

| Champ API | Champ `EffectifLycee` |
|-----------|----------------------|
| `numero_lycee` (param requête) | `uai` |
| `patronyme` | `nom` |
| `2ndes_gt` | `effectif` |
| `rentree_scolaire` | `annee` |

## Types

```typescript
// src/types/index.ts
export interface EffectifLycee {
  uai: string;
  nom: string;
  effectif: number;
  annee: string;  // ex: "2024"
}
```

## Hook : `src/hooks/useEffectifs.ts`

Encapsule la logique de fetch pour ne pas surcharger CollegeCard (qui gère déjà seuils + sector changes).

```typescript
function useEffectifs(lycees: LyceeSecteur[] | undefined): {
  effectifs: EffectifLycee[];
  isLoading: boolean;
}
```

- Filtre les lycées secteur 1
- Appelle `fetchEffectifsSecteur1` avec cleanup (variable `cancelled`) pour éviter les race conditions si `lycees` change
- Retourne `{ effectifs, isLoading }`

## Service : `src/services/effectifsApi.ts`

### `fetchEffectif2nde(uai: string): Promise<EffectifLycee | null>`

Récupère l'effectif 2nde GT le plus récent pour un lycée donné. Retourne `null` si aucune donnée ou si le fetch échoue. Mappe les champs API vers `EffectifLycee`.

### `fetchEffectifsSecteur1(lycees: LyceeSecteur[]): Promise<EffectifLycee[]>`

Appelle `fetchEffectif2nde` en parallèle via **`Promise.allSettled`** (pas `Promise.all`) pour que les échecs individuels n'annulent pas les autres résultats. Filtre les résultats `null` et `rejected`.

**Cache** : clé = UAIs triés et joints par virgule (ex: `"0750653C,0750675B,0750703G"`).

### Tests unitaires : `src/services/__tests__/effectifsApi.test.ts`

Tests avec fetch mocké, suivant le pattern de `seuilsApi.test.ts` :
- `fetchEffectif2nde` retourne les données mappées correctement
- `fetchEffectif2nde` retourne `null` quand aucun résultat
- `fetchEffectifsSecteur1` gère les échecs partiels (Promise.allSettled)
- Cache : un seul appel réseau pour le même ensemble d'UAI

## Composant : `src/components/EffectifsDonut.tsx`

### Props

```typescript
interface EffectifsDonutProps {
  effectifs: EffectifLycee[];
}
```

### Rendu

- **Donut chart Recharts** : `PieChart` > `Pie` avec `innerRadius`/`outerRadius`
- **Palette de couleurs** (8 couleurs fixes, bon contraste light & dark) :
  ```
  #3b82f6, #f59e0b, #10b981, #ef4444, #8b5cf6, #ec4899, #06b6d4, #f97316
  ```
- **Centre du donut** : `<Label>` custom positionné au centre du `<Pie>` :
  ```tsx
  <Pie ...>
    <Label content={<CenterLabel total={total} />} position="center" />
  </Pie>
  ```
  Affiche le total des places et "places en 2nde"
- **Tooltip** : au hover sur une part → nom du lycée, effectif absolu, pourcentage
- **Légende** : sous le chart, chaque lycée avec pastille couleur + nom + effectif + pourcentage
- **Responsive** : `ResponsiveContainer` Recharts, hauteur fixe 250px
- **Année** : mention discrète sous la légende "Données rentrée 2024". Si les années sont mixtes entre lycées, afficher la plage (ex: "Données rentrées 2023-2024")
- **Animation** : `animationDuration={600}` sur le `<Pie>` pour une entrée fluide
- **Accessibilité** : `role="img"` et `aria-label` sur le container (ex: "Répartition des 842 places de seconde entre 6 lycées de secteur 1")

### États

- **Loading** : 3 petits dots animés (CSS `@keyframes`, même style que `loading-dots` mais en miniature, inline dans le composant)
- **Aucune donnée** : le donut ne s'affiche pas du tout
- **Données partielles** : lycées sans données exclus du donut, note sous la légende "Données indisponibles pour X"

## Intégration dans CollegeCard

### Emplacement

Le donut s'affiche **uniquement dans l'onglet secteur 1**, entre le titre de section et la liste des lycées.

### Logique simplifiée (grâce au hook)

```tsx
const { effectifs, isLoading: effectifsLoading } = useEffectifs(lycees);

// Dans le rendu, onglet secteur 1 uniquement :
{effectifsLoading && <DonutLoading />}
{effectifs.length > 0 && activeSector === 1 && <EffectifsDonut effectifs={effectifs} />}
```

## Fichiers

| Fichier | Nature |
|---------|--------|
| `src/types/index.ts` | Ajout type `EffectifLycee` |
| `src/services/effectifsApi.ts` | **Nouveau** — service API effectifs |
| `src/services/__tests__/effectifsApi.test.ts` | **Nouveau** — tests unitaires |
| `src/hooks/useEffectifs.ts` | **Nouveau** — hook data-fetching |
| `src/components/EffectifsDonut.tsx` | **Nouveau** — composant donut |
| `src/components/EffectifsDonut.css` | **Nouveau** — styles |
| `src/components/CollegeCard.tsx` | Intégration via hook + rendu conditionnel |
| `src/components/index.ts` | Export `EffectifsDonut` |

## Vérification

- `npm run build` — compilation TypeScript + Vite
- `npm run lint` — ESLint
- `npm test` — tests unitaires (dont effectifsApi.test.ts)
- `npx react-doctor@latest .` — bonnes pratiques React
- Test manuel : rechercher une adresse parisienne, vérifier le donut en secteur 1
- Test manuel dark mode : vérifier lisibilité des couleurs du donut
- Test mobile : vérifier que la légende passe sous le chart
