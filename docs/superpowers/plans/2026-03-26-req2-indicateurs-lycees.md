# REQ2 — Indicateurs lycées Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add clickable lycée detail panels showing historical Bac TB rate and IPS charts with Parisian decile gauges.

**Architecture:** Two new API services (fetch-once + cache pattern matching `seuilsApi.ts`) provide data for a `LyceeDetail` accordion component rendered below the existing donut chart. Donut slices become clickable to trigger the panel. A shared `DecileGauge` component renders the 10-segment positioning bar.

**Tech Stack:** React 19, TypeScript strict, Recharts (LineChart, ComposedChart, Area), Vitest, CSS grid-template-rows animation.

**Spec:** `docs/superpowers/specs/2026-03-26-req2-indicateurs-lycees-design.md`

---

## File Structure

### New files
| File | Responsibility |
|------|---------------|
| `src/services/decile.ts` | Shared `computeDecile` utility used by both API services |
| `src/services/niveauScolaireApi.ts` | Fetch all Paris lycée Bac TB data, cache, compute decile |
| `src/services/ipsApi.ts` | Fetch all Paris lycée IPS data, cache, compute decile |
| `src/services/__tests__/niveauScolaireApi.test.ts` | Unit tests for TB rate computation + decile |
| `src/services/__tests__/ipsApi.test.ts` | Unit tests for IPS fetch + decile |
| `src/components/DecileGauge.tsx` | Reusable 10-segment decile bar |
| `src/components/DecileGauge.css` | Styling for decile gauge |
| `src/components/LyceeDetail.tsx` | Accordion panel with two charts + two gauges |
| `src/components/LyceeDetail.css` | Accordion animation + chart layout |

### Modified files
| File | Change |
|------|--------|
| `src/components/EffectifsDonut.tsx` | Add `onLyceeSelect` callback, make slices clickable |
| `src/components/CollegeCard.tsx` | Add `selectedLyceeUai` state, render `LyceeDetail` |

---

## Task 1: Shared decile utility + niveauScolaireApi service

**Files:**
- Create: `src/services/decile.ts`
- Create: `src/services/niveauScolaireApi.ts`
- Create: `src/services/__tests__/niveauScolaireApi.test.ts`

First, create `src/services/decile.ts`:

```typescript
// src/services/decile.ts
export function computeDecile(value: number, allValues: number[]): number {
  const sorted = [...allValues].sort((a, b) => a - b);
  if (sorted.length === 0) return 5;
  const rank = sorted.filter((v) => v < value).length;
  return Math.min(10, Math.floor((rank / sorted.length) * 10) + 1);
}
```

Then proceed with the tests and service:

- [ ] **Step 1: Write the test file**

```typescript
// src/services/__tests__/niveauScolaireApi.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('computeTauxTB', () => {
  it('computes TB rate from mentions and presents', async () => {
    const { computeTauxTB } = await import('../niveauScolaireApi');
    // 10 TB sans + 5 TB avec / 100 présents = 15%
    expect(computeTauxTB(10, 5, 100)).toBeCloseTo(15);
  });

  it('returns 0 when presents is 0', async () => {
    const { computeTauxTB } = await import('../niveauScolaireApi');
    expect(computeTauxTB(10, 5, 0)).toBe(0);
  });
});

describe('computeDecile', () => {
  it('returns decile 10 for highest value', async () => {
    const { computeDecile } = await import('../decile');
    const allValues = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    expect(computeDecile(100, allValues)).toBe(10);
  });

  it('returns decile 1 for lowest value', async () => {
    const { computeDecile } = await import('../decile');
    const allValues = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    expect(computeDecile(10, allValues)).toBe(1);
  });

  it('returns decile 5 for median value', async () => {
    const { computeDecile } = await import('../decile');
    const allValues = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(computeDecile(50, allValues)).toBe(5);
  });

  it('returns 5 for empty array', async () => {
    const { computeDecile } = await import('../decile');
    expect(computeDecile(50, [])).toBe(5);
  });

  it('handles ties correctly', async () => {
    const { computeDecile } = await import('../decile');
    const allValues = [10, 10, 10, 50, 50, 50, 90, 90, 90, 90];
    const d = computeDecile(50, allValues);
    expect(d).toBeGreaterThanOrEqual(1);
    expect(d).toBeLessThanOrEqual(10);
  });
});

describe('fetchNiveauScolaire', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('fetches TB history and decile for a lycée', async () => {
    const mockData = {
      results: [
        { annee: '2022-01-01', uai: '0750680G', nb_mentions_tb_sansf_g: 20, nb_mentions_tb_avecf_g: 10, presents_gnle: 200 },
        { annee: '2023-01-01', uai: '0750680G', nb_mentions_tb_sansf_g: 25, nb_mentions_tb_avecf_g: 15, presents_gnle: 200 },
        { annee: '2022-01-01', uai: '0750693W', nb_mentions_tb_sansf_g: 10, nb_mentions_tb_avecf_g: 5, presents_gnle: 100 },
        { annee: '2023-01-01', uai: '0750693W', nb_mentions_tb_sansf_g: 12, nb_mentions_tb_avecf_g: 8, presents_gnle: 100 },
      ],
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    }));

    const { fetchNiveauScolaire } = await import('../niveauScolaireApi');
    const result = await fetchNiveauScolaire('0750680G');

    expect(result).not.toBeNull();
    expect(result!.history).toHaveLength(2);
    expect(result!.history[0].annee).toBe('2022');
    expect(result!.history[0].tauxTB).toBeCloseTo(15);
    expect(result!.history[1].tauxTB).toBeCloseTo(20);
    expect(result!.decile).toBeGreaterThanOrEqual(1);
    expect(result!.decile).toBeLessThanOrEqual(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/niveauScolaireApi.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
// src/services/niveauScolaireApi.ts
import { computeDecile } from './decile';

const API_URL =
  'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-indicateurs-de-resultat-des-lycees-gt_v2/exports/json';

interface ApiRow {
  annee: string;
  uai: string;
  nb_mentions_tb_sansf_g: number;
  nb_mentions_tb_avecf_g: number;
  presents_gnle: number;
}

export interface NiveauScolairePoint {
  annee: string;
  tauxTB: number;
}

export interface NiveauScolaireResult {
  history: NiveauScolairePoint[];
  decile: number;
}

let cache: ApiRow[] | null = null;

export function computeTauxTB(sansF: number, avecF: number, presents: number): number {
  if (presents === 0) return 0;
  return ((sansF + avecF) / presents) * 100;
}

async function fetchAllParis(): Promise<ApiRow[]> {
  if (cache) return cache;

  const select = 'annee,uai,nb_mentions_tb_sansf_g,nb_mentions_tb_avecf_g,presents_gnle';
  const where = encodeURIComponent(
    "(code_departement = '075') AND (secteur = 'public') AND (presents_gnle > 0)"
  );
  const url = `${API_URL}?select=${select}&where=${where}&order_by=annee&limit=-1`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erreur chargement niveau scolaire: ${response.status}`);

  cache = await response.json();
  return cache!;
}

export async function fetchNiveauScolaire(uai: string): Promise<NiveauScolaireResult | null> {
  try {
    const allRows = await fetchAllParis();

    // History for this lycée
    const lyceeRows = allRows.filter((r) => r.uai === uai);
    if (lyceeRows.length === 0) return null;

    const history: NiveauScolairePoint[] = lyceeRows.map((r) => ({
      annee: r.annee.substring(0, 4),
      tauxTB: computeTauxTB(r.nb_mentions_tb_sansf_g, r.nb_mentions_tb_avecf_g, r.presents_gnle),
    }));

    // Decile: compare latest year across all Paris lycées
    const latestYear = allRows.reduce((max, r) => (r.annee > max ? r.annee : max), '');
    const latestRows = allRows.filter((r) => r.annee === latestYear);
    const allTaux = latestRows.map((r) =>
      computeTauxTB(r.nb_mentions_tb_sansf_g, r.nb_mentions_tb_avecf_g, r.presents_gnle)
    );
    const lyceeTaux = history[history.length - 1]?.tauxTB ?? 0;
    const decile = computeDecile(lyceeTaux, allTaux);

    return { history, decile };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/__tests__/niveauScolaireApi.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/decile.ts src/services/niveauScolaireApi.ts src/services/__tests__/niveauScolaireApi.test.ts
git commit -m "feat: add niveauScolaireApi with TB rate history and decile"
```

---

## Task 2: ipsApi service

**Files:**
- Create: `src/services/ipsApi.ts`
- Create: `src/services/__tests__/ipsApi.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
// src/services/__tests__/ipsApi.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('fetchIps', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('fetches IPS history and decile for a lycée', async () => {
    const mockData = [
      { uai: '0750680G', rentree_scolaire: '2023', ips: 120.5, ecart_type: 28.3 },
      { uai: '0750680G', rentree_scolaire: '2024', ips: 122.0, ecart_type: 27.1 },
      { uai: '0750693W', rentree_scolaire: '2023', ips: 110.0, ecart_type: 30.0 },
      { uai: '0750693W', rentree_scolaire: '2024', ips: 112.0, ecart_type: 29.5 },
    ];

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    }));

    const { fetchIps } = await import('../ipsApi');
    const result = await fetchIps('0750680G');

    expect(result).not.toBeNull();
    expect(result!.history).toHaveLength(2);
    expect(result!.history[0].annee).toBe('2023');
    expect(result!.history[0].ips).toBe(120.5);
    expect(result!.history[0].ecartType).toBe(28.3);
    expect(result!.history[1].ips).toBe(122.0);
    expect(result!.decile).toBeGreaterThanOrEqual(1);
    expect(result!.decile).toBeLessThanOrEqual(10);
  });

  it('returns null when lycée not found', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }));

    const { fetchIps } = await import('../ipsApi');
    const result = await fetchIps('UNKNOWN');
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/ipsApi.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
// src/services/ipsApi.ts
import { computeDecile } from './decile';

const API_URL =
  'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-ips-lycees-ap2023/exports/json';

interface ApiRow {
  uai: string;
  rentree_scolaire: string;
  ips: number;
  ecart_type: number;
}

export interface IpsPoint {
  annee: string;
  ips: number;
  ecartType: number;
}

export interface IpsResult {
  history: IpsPoint[];
  decile: number;
}

let cache: ApiRow[] | null = null;

async function fetchAllParis(): Promise<ApiRow[]> {
  if (cache) return cache;

  const select = 'uai,rentree_scolaire,ips,ecart_type';
  const url = `${API_URL}?select=${select}&refine=academie:PARIS&order_by=rentree_scolaire&limit=-1`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erreur chargement IPS: ${response.status}`);

  cache = await response.json();
  return cache!;
}

export async function fetchIps(uai: string): Promise<IpsResult | null> {
  try {
    const allRows = await fetchAllParis();

    const lyceeRows = allRows.filter((r) => r.uai === uai);
    if (lyceeRows.length === 0) return null;

    const history: IpsPoint[] = lyceeRows.map((r) => ({
      annee: r.rentree_scolaire,
      ips: r.ips,
      ecartType: r.ecart_type,
    }));

    // Decile: compare latest year across all Paris lycées
    const latestYear = allRows.reduce((max, r) =>
      r.rentree_scolaire > max ? r.rentree_scolaire : max, ''
    );
    const latestRows = allRows.filter((r) => r.rentree_scolaire === latestYear);
    const allIps = latestRows.map((r) => r.ips);
    const lyceeIps = history[history.length - 1]?.ips ?? 0;
    const decile = computeDecile(lyceeIps, allIps);

    return { history, decile };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/__tests__/ipsApi.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/ipsApi.ts src/services/__tests__/ipsApi.test.ts
git commit -m "feat: add ipsApi with IPS history and decile"
```

---

## Task 3: DecileGauge component

**Files:**
- Create: `src/components/DecileGauge.tsx`
- Create: `src/components/DecileGauge.css`

- [ ] **Step 1: Write the component**

```tsx
// src/components/DecileGauge.tsx
import './DecileGauge.css';

interface DecileGaugeProps {
  decile: number; // 1-10
  label: string;  // e.g. "parmi les lycées parisiens"
}

const COLORS = [
  '#dc2626', '#ef4444', '#f97316', '#fb923c', '#facc15',
  '#a3e635', '#4ade80', '#22c55e', '#16a34a', '#15803d',
];

export function DecileGauge({ decile, label }: DecileGaugeProps) {
  return (
    <div className="decile-gauge">
      <div className="decile-bar">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className={`decile-segment${i + 1 === decile ? ' active' : ''}`}
            style={{
              backgroundColor: i + 1 === decile ? COLORS[i] : undefined,
            }}
          />
        ))}
      </div>
      <span className="decile-label">
        {decile}<sup>e</sup> décile {label}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Write the CSS**

```css
/* src/components/DecileGauge.css */
.decile-gauge {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
}

.decile-bar {
  display: flex;
  gap: 2px;
  height: 12px;
}

.decile-segment {
  flex: 1;
  border-radius: 2px;
  background-color: var(--color-border);
  transition: background-color 0.3s;
}

.decile-segment.active {
  transform: scaleY(1.3);
}

.decile-label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.decile-label sup {
  font-size: 9px;
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS (no type errors)

- [ ] **Step 4: Commit**

```bash
git add src/components/DecileGauge.tsx src/components/DecileGauge.css
git commit -m "feat: add DecileGauge component"
```

---

## Task 4: LyceeDetail component

**Files:**
- Create: `src/components/LyceeDetail.tsx`
- Create: `src/components/LyceeDetail.css`

- [ ] **Step 1: Write the component**

```tsx
// src/components/LyceeDetail.tsx
import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ComposedChart, Area, CartesianGrid,
} from 'recharts';
import { fetchNiveauScolaire, type NiveauScolaireResult } from '../services/niveauScolaireApi';
import { fetchIps, type IpsResult } from '../services/ipsApi';
import { DecileGauge } from './DecileGauge';
import './LyceeDetail.css';

interface LyceeDetailProps {
  uai: string;
  nom: string;
  onClose: () => void;
}

export function LyceeDetail({ uai, nom, onClose }: LyceeDetailProps) {
  const [niveau, setNiveau] = useState<NiveauScolaireResult | null>(null);
  const [ips, setIps] = useState<IpsResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setNiveau(null);
    setIps(null);

    Promise.allSettled([
      fetchNiveauScolaire(uai).then(setNiveau),
      fetchIps(uai).then(setIps),
    ]).finally(() => setLoading(false));
  }, [uai]);

  if (loading) {
    return (
      <div className="lycee-detail">
        <div className="lycee-detail-loading"><span /><span /><span /></div>
      </div>
    );
  }

  if (!niveau && !ips) return null;

  return (
    <div className="lycee-detail">
      <div className="lycee-detail-header">
        <h4 className="lycee-detail-title">{nom}</h4>
        <button className="lycee-detail-close" onClick={onClose} aria-label="Fermer">
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>

      {niveau && (
        <div className="lycee-detail-chart">
          <h5>Taux de mentions TB au Bac (%)</h5>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={niveau.history}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="annee" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} unit="%" />
              <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Taux TB']} />
              <Line
                type="monotone"
                dataKey="tauxTB"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <DecileGauge decile={niveau.decile} label="parmi les lycées parisiens" />
        </div>
      )}

      {ips && (
        <div className="lycee-detail-chart">
          <h5>Indice de Position Sociale (IPS)</h5>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={ips.history.map((p) => ({
              ...p,
              ipsRange: [p.ips - p.ecartType, p.ips + p.ecartType],
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="annee" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
              <Tooltip formatter={(v, name) => {
                if (name !== 'ips') return null;
                return [Number(v).toFixed(1), 'IPS moyen'];
              }} />
              <Area
                type="monotone"
                dataKey="ipsRange"
                stroke="none"
                fill="#2563eb"
                fillOpacity={0.15}
              />
              <Line
                type="monotone"
                dataKey="ips"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <DecileGauge decile={ips.decile} label="parmi les lycées parisiens" />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write the CSS**

```css
/* src/components/LyceeDetail.css */
.lycee-detail-wrapper {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease;
}

.lycee-detail-wrapper.open {
  grid-template-rows: 1fr;
}

.lycee-detail {
  overflow: hidden;
  padding: 0;
}

.lycee-detail-wrapper.open .lycee-detail {
  padding: 16px 0;
  border-top: 1px solid var(--color-border);
}

.lycee-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.lycee-detail-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.lycee-detail-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted);
  padding: 4px;
  border-radius: 4px;
}

.lycee-detail-close:hover {
  color: var(--color-text-primary);
  background: var(--color-border);
}

.lycee-detail-chart {
  margin-bottom: 20px;
}

.lycee-detail-chart h5 {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin: 0 0 8px 0;
}

.lycee-detail-loading {
  display: flex;
  justify-content: center;
  gap: 4px;
  padding: 24px 0;
}

.lycee-detail-loading span {
  width: 6px;
  height: 6px;
  background: var(--color-primary);
  border-radius: 50%;
  animation: detailBounce 1.2s ease-in-out infinite;
}

.lycee-detail-loading span:nth-child(2) {
  animation-delay: 0.1s;
}

.lycee-detail-loading span:nth-child(3) {
  animation-delay: 0.2s;
}

@keyframes detailBounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-6px); }
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/LyceeDetail.tsx src/components/LyceeDetail.css
git commit -m "feat: add LyceeDetail accordion with charts and decile gauges"
```

---

## Task 5: Make donut slices clickable

**Files:**
- Modify: `src/components/EffectifsDonut.tsx`

- [ ] **Step 1: Add onLyceeSelect prop and click handler to Pie**

In `EffectifsDonut.tsx`:

1. Add to `EffectifsDonutProps`:
```typescript
onLyceeSelect?: (uai: string, nom: string) => void;
```

2. Add `onLyceeSelect` to the destructured props:
```typescript
export function EffectifsDonut({ effectifs, difficulties, requestedCount, newLyceeUais, onLyceeSelect }: EffectifsDonutProps)
```

3. Add click handler on the `<Pie>` component:
```tsx
<Pie
  // ... existing props
  onClick={(_, index) => {
    const entry = data[index];
    onLyceeSelect?.(entry.uai, entry.nom);
  }}
  style={{ cursor: onLyceeSelect ? 'pointer' : undefined }}
>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/EffectifsDonut.tsx
git commit -m "feat: make donut slices clickable with onLyceeSelect callback"
```

---

## Task 6: Wire everything in CollegeCard

**Files:**
- Modify: `src/components/CollegeCard.tsx`

- [ ] **Step 1: Add state and render LyceeDetail**

1. Add imports at top:
```typescript
import { LyceeDetail } from './LyceeDetail';
```

2. Add state in the component (reset when address changes):
```typescript
const [selectedLycee, setSelectedLycee] = useState<{ uai: string; nom: string } | null>(null);

// Reset selected lycée when search result changes
useEffect(() => setSelectedLycee(null), [result]);

const handleLyceeSelect = (uai: string, nom: string) => {
  setSelectedLycee((prev) => prev?.uai === uai ? null : { uai, nom });
};
```

3. Pass callback to EffectifsDonut:
```tsx
<EffectifsDonut
  effectifs={effectifs}
  difficulties={difficulties}
  requestedCount={requestedCount}
  newLyceeUais={newLyceeUais}
  onLyceeSelect={handleLyceeSelect}
/>
```

4. Render LyceeDetail right after the EffectifsDonut block (still inside the `lycees-section` div):
```tsx
{selectedLycee && activeSector === 1 && (
  <LyceeDetail uai={selectedLycee.uai} nom={selectedLycee.nom} onClose={() => setSelectedLycee(null)} />
)}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Manual test**

Run: `npm run dev`
1. Search "98 Boulevard Ney 75018 Paris"
2. Click on a donut slice → LyceeDetail panel should appear with charts
3. Click same slice → panel closes
4. Click different slice → panel switches
5. Switch to Sector 2 tab → panel disappears
6. Switch back to Sector 1 → panel reappears if lycée was selected

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: All existing tests PASS

- [ ] **Step 5: Run react-doctor**

Run: `npx -y react-doctor@latest .`
Expected: Score ≥ 99

- [ ] **Step 6: Commit**

```bash
git add src/components/CollegeCard.tsx
git commit -m "feat: wire LyceeDetail accordion into CollegeCard via donut click"
```

---

## Task 7: Visual QA and polish

- [ ] **Step 1: Test with multiple addresses**

Test with:
- "98 Boulevard Ney 75018 Paris" (Utrillo → Colbert replacement)
- "15 rue Soufflot 75005 Paris" (Latin Quarter)
- "1 rue de Rivoli 75004 Paris"

Verify for each: charts render, decile gauges show, no console errors.

- [ ] **Step 2: Test dark mode**

Toggle dark mode. Verify:
- Chart grid lines use CSS variable colors
- Decile gauge inactive segments match theme
- Text remains readable

- [ ] **Step 3: Test mobile (responsive)**

Resize to 375px width. Verify:
- Charts shrink properly via ResponsiveContainer
- Decile gauge segments remain visible
- No horizontal overflow

- [ ] **Step 4: Fix any issues found**

Apply fixes as needed.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "fix: visual polish for LyceeDetail charts and gauges"
```
