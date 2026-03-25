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
- Un appel par lycée secteur 1, parallélisés via `Promise.all`
- Cache mémoire (même session) pour éviter les appels redondants

## Types

```typescript
// src/types/index.ts
interface EffectifLycee {
  uai: string;
  nom: string;
  effectif: number;
  annee: string;
}
```

## Service : `src/services/effectifsApi.ts`

### `fetchEffectif2nde(uai: string): Promise<EffectifLycee | null>`

Récupère l'effectif 2nde GT le plus récent pour un lycée donné. Retourne `null` si aucune donnée.

### `fetchEffectifsSecteur1(lycees: LyceeSecteur[]): Promise<EffectifLycee[]>`

Appelle `fetchEffectif2nde` en parallèle pour tous les lycées de secteur 1 du tableau. Filtre les résultats `null`. Cache le résultat par ensemble d'UAI.

## Composant : `src/components/EffectifsDonut.tsx`

### Props

```typescript
interface EffectifsDonutProps {
  effectifs: EffectifLycee[];
}
```

### Rendu

- **Donut chart Recharts** (`PieChart` + `Pie` avec `innerRadius`/`outerRadius`)
- **Palette de couleurs** : séquence fixe de couleurs vives adaptées light/dark (pas de CSS variables — couleurs de data visualization)
- **Centre du donut** : composant custom via `Recharts.Label` affichant :
  - Le total des places (somme des effectifs)
  - Le label "places en 2nde"
- **Tooltip** : au hover sur une part → nom du lycée, effectif absolu, pourcentage
- **Légende** : sous le chart, liste des lycées avec couleur + nom + effectif + pourcentage
- **Responsive** : le chart s'adapte via un `ResponsiveContainer` Recharts

### États

- **Loading** : petit spinner discret (réutilise le pattern `loading-dots` existant)
- **Aucune donnée** : le donut ne s'affiche pas du tout (pas de chart vide)
- **Données partielles** : les lycées sans données sont exclus du donut mais mentionnés en note sous la légende

## Intégration dans CollegeCard

### Emplacement

Le donut s'affiche **uniquement dans l'onglet secteur 1**, entre le titre de section et la liste des lycées.

### Logique

```
// Dans CollegeCard.tsx
const [effectifs, setEffectifs] = useState<EffectifLycee[]>([]);
const [effectifsLoading, setEffectifsLoading] = useState(false);

useEffect(() => {
  if (!lycees) return;
  const secteur1 = lycees.filter(l => l.secteur === 1);
  if (secteur1.length === 0) return;
  setEffectifsLoading(true);
  fetchEffectifsSecteur1(secteur1)
    .then(setEffectifs)
    .catch(() => { /* silently ignore */ })
    .finally(() => setEffectifsLoading(false));
}, [lycees]);
```

### Rendu conditionnel

- `effectifsLoading` → spinner
- `effectifs.length > 0 && activeSector === 1` → `<EffectifsDonut effectifs={effectifs} />`
- Sinon → rien

## Fichiers

| Fichier | Nature |
|---------|--------|
| `src/types/index.ts` | Ajout type `EffectifLycee` |
| `src/services/effectifsApi.ts` | **Nouveau** — service API effectifs |
| `src/components/EffectifsDonut.tsx` | **Nouveau** — composant donut |
| `src/components/EffectifsDonut.css` | **Nouveau** — styles |
| `src/components/CollegeCard.tsx` | Intégration du donut |
| `src/components/index.ts` | Export `EffectifsDonut` |

## Vérification

- `npm run build` — compilation TypeScript + Vite
- `npm run lint` — ESLint
- `npx react-doctor@latest .` — bonnes pratiques React
- Test manuel : rechercher une adresse parisienne, vérifier le donut en secteur 1
- Test manuel dark mode : vérifier lisibilité des couleurs du donut
- Test mobile : vérifier que la légende passe sous le chart
