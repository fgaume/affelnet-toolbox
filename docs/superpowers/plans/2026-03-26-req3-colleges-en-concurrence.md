# REQ3 — Collèges en concurrence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** For each lycée de secteur 1, add a collapsible panel showing all collèges feeding into that lycée, grouped by IPS bonus with enrollment weight visualization.

**Architecture:** New service `collegesConcurrenceApi.ts` orchestrates 3 API calls (ArcGIS for college list, HuggingFace for IPS bonuses, OpenData for DNB admis). New component `CollegesConcurrence.tsx` renders a Recharts stacked bar chart. Integrated into `CollegeCard.tsx` as a collapsible section under the effectifs donut.

**Tech Stack:** React 19, TypeScript, Recharts (BarChart/Bar), Vitest

**Skills to reference:**
- `affelnet-secteurs-paris` — Use Case 3 API (colleges for a given lycée)
- `affelnet-ips` — HuggingFace IPS bonus colleges dataset
- `affelnet-niveau-scolaire` — OpenData DNB indicators for college enrollment

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/services/collegesConcurrenceApi.ts` | Fetch & join: ArcGIS colleges list + HuggingFace IPS bonuses + OpenData DNB admis |
| Create | `src/services/__tests__/collegesConcurrenceApi.test.ts` | Unit tests for the service with mocked fetch |
| Create | `src/components/CollegesConcurrence.tsx` | Stacked bar chart component with loading/error states |
| Create | `src/components/CollegesConcurrence.css` | Styles for the collapsible panel and chart |
| Modify | `src/components/CollegeCard.tsx` | Add expandable lycée list with chevron + mount CollegesConcurrence |
| Modify | `src/components/CollegeCard.css` | Styles for the expandable lycée items |

---

### Task 1: Service — fetch colleges for a lycée (ArcGIS)

**Files:**
- Create: `src/services/collegesConcurrenceApi.ts`
- Create: `src/services/__tests__/collegesConcurrenceApi.test.ts`

- [ ] **Step 1: Write the failing test for fetchCollegesForLycee**

```typescript
// src/services/__tests__/collegesConcurrenceApi.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('collegesConcurrenceApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  describe('fetchCollegesForLycee', () => {
    it('returns college UAIs and names from ArcGIS', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          features: [
            { attributes: { Réseau: '0752536Z', Nom_Tete: 'VOLTAIRE' } },
            { attributes: { Réseau: '0752319N', Nom_Tete: 'COYSEVOX' } },
          ],
        }),
      }));

      const { fetchCollegesForLycee } = await import('../collegesConcurrenceApi');
      const result = await fetchCollegesForLycee('0750676C');

      expect(result).toEqual([
        { uai: '0752536Z', nom: 'VOLTAIRE' },
        { uai: '0752319N', nom: 'COYSEVOX' },
      ]);

      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain('0750676C');
      expect(calledUrl).toContain("secteur='1'");
    });

    it('returns empty array when no colleges found', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ features: [] }),
      }));

      const { fetchCollegesForLycee } = await import('../collegesConcurrenceApi');
      const result = await fetchCollegesForLycee('0000000X');
      expect(result).toEqual([]);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/collegesConcurrenceApi.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement fetchCollegesForLycee**

```typescript
// src/services/collegesConcurrenceApi.ts

const ARCGIS_BASE = 'https://services9.arcgis.com/ekT8MJFiVh8nvlV5/arcgis/rest/services/Affectation_Lyc%C3%A9es/FeatureServer/0/query';

interface CollegeRef {
  uai: string;
  nom: string;
}

export async function fetchCollegesForLycee(uaiLycee: string): Promise<CollegeRef[]> {
  const params = new URLSearchParams({
    outFields: 'Réseau,Nom_Tete',
    returnGeometry: 'false',
    f: 'pjson',
    orderByFields: 'Nom_Tete',
  });
  const whereClause = `secteur='1' and UAI='${uaiLycee}'`;
  const url = `${ARCGIS_BASE}?${params}&where=${encodeURIComponent(whereClause).replace(/%27/g, "'")}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Erreur de connexion à l\'annuaire Affelnet');

  const data = await response.json();
  return (data.features || []).map(
    (f: { attributes: { Réseau: string; Nom_Tete: string } }) => ({
      uai: f.attributes.Réseau,
      nom: f.attributes.Nom_Tete,
    })
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/__tests__/collegesConcurrenceApi.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/collegesConcurrenceApi.ts src/services/__tests__/collegesConcurrenceApi.test.ts
git commit -m "feat(REQ3): add fetchCollegesForLycee service (ArcGIS)"
```

---

### Task 2: Service — fetch IPS bonuses for colleges (HuggingFace)

**Files:**
- Modify: `src/services/collegesConcurrenceApi.ts`
- Modify: `src/services/__tests__/collegesConcurrenceApi.test.ts`

- [ ] **Step 1: Write the failing test for fetchBonusIpsColleges**

Add to the test file:

```typescript
  describe('fetchBonusIpsColleges', () => {
    it('returns a Map of UAI to bonus IPS 2026', async () => {
      const mockData = [
        { Identifiant: '0752536Z', Nom: 'CLG VOLTAIRE', Secteur: 'Public', Bonus_IPS_2026: 800 },
        { Identifiant: '0752319N', Nom: 'CLG COYSEVOX', Secteur: 'Public', Bonus_IPS_2026: 1200 },
        { Identifiant: '0750182R', Nom: 'CLG PRIVE', Secteur: 'Privé', Bonus_IPS_2026: null },
      ];

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      }));

      const { fetchBonusIpsColleges } = await import('../collegesConcurrenceApi');
      const result = await fetchBonusIpsColleges();

      expect(result.get('0752536Z')).toBe(800);
      expect(result.get('0752319N')).toBe(1200);
      // null bonus → not in map
      expect(result.has('0750182R')).toBe(false);
    });

    it('caches results across calls', async () => {
      const mockFn = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([
          { Identifiant: '0752536Z', Bonus_IPS_2026: 400 },
        ]),
      });
      vi.stubGlobal('fetch', mockFn);

      const { fetchBonusIpsColleges } = await import('../collegesConcurrenceApi');
      await fetchBonusIpsColleges();
      await fetchBonusIpsColleges();

      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/collegesConcurrenceApi.test.ts`
Expected: FAIL — `fetchBonusIpsColleges` not found

- [ ] **Step 3: Implement fetchBonusIpsColleges**

Add to `collegesConcurrenceApi.ts`:

```typescript
const IPS_COLLEGES_URL =
  'https://huggingface.co/datasets/fgaume/affelnet-paris-bonus-ips-colleges/raw/main/affelnet-paris-bonus-ips-colleges.json';

interface IpsCollegeRow {
  Identifiant: string;
  Bonus_IPS_2026: number | null;
}

let ipsCache: Map<string, number> | null = null;

export async function fetchBonusIpsColleges(): Promise<Map<string, number>> {
  if (ipsCache) return ipsCache;

  const response = await fetch(IPS_COLLEGES_URL);
  if (!response.ok) throw new Error(`Erreur chargement bonus IPS: ${response.status}`);

  const rows = (await response.json()) as IpsCollegeRow[];
  ipsCache = new Map();
  for (const row of rows) {
    if (row.Bonus_IPS_2026 != null) {
      ipsCache.set(row.Identifiant, row.Bonus_IPS_2026);
    }
  }
  return ipsCache;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/__tests__/collegesConcurrenceApi.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/collegesConcurrenceApi.ts src/services/__tests__/collegesConcurrenceApi.test.ts
git commit -m "feat(REQ3): add fetchBonusIpsColleges service (HuggingFace)"
```

---

### Task 3: Service — fetch DNB admis for colleges (OpenData)

**Files:**
- Modify: `src/services/collegesConcurrenceApi.ts`
- Modify: `src/services/__tests__/collegesConcurrenceApi.test.ts`

- [ ] **Step 1: Write the failing test for fetchDnbAdmisColleges**

Add to the test file:

```typescript
  describe('fetchDnbAdmisColleges', () => {
    it('returns a Map of UAI to nb admis (candidats * taux / 100)', async () => {
      const mockData = [
        { uai: '0752536Z', nb_candidats_g: 100, taux_de_reussite_g: 92.0 },
        { uai: '0752319N', nb_candidats_g: 80, taux_de_reussite_g: 95.0 },
      ];

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      }));

      const { fetchDnbAdmisColleges } = await import('../collegesConcurrenceApi');
      const result = await fetchDnbAdmisColleges();

      expect(result.get('0752536Z')).toBe(92); // Math.round(100 * 92 / 100)
      expect(result.get('0752319N')).toBe(76); // Math.round(80 * 95 / 100)
    });

    it('caches results across calls', async () => {
      const mockFn = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([
          { uai: '0752536Z', nb_candidats_g: 100, taux_de_reussite_g: 90.0 },
        ]),
      });
      vi.stubGlobal('fetch', mockFn);

      const { fetchDnbAdmisColleges } = await import('../collegesConcurrenceApi');
      await fetchDnbAdmisColleges();
      await fetchDnbAdmisColleges();

      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/collegesConcurrenceApi.test.ts`
Expected: FAIL — `fetchDnbAdmisColleges` not found

- [ ] **Step 3: Implement fetchDnbAdmisColleges**

Add to `collegesConcurrenceApi.ts`:

```typescript
const DNB_API_BASE =
  'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-indicateurs-valeur-ajoutee-colleges/exports/json';

interface DnbRow {
  uai: string;
  nb_candidats_g: number;
  taux_de_reussite_g: number;
}

let dnbCache: Map<string, number> | null = null;

export async function fetchDnbAdmisColleges(): Promise<Map<string, number>> {
  if (dnbCache) return dnbCache;

  const select = 'uai,nb_candidats_g,taux_de_reussite_g';
  const where = encodeURIComponent("academie = 'PARIS' AND secteur = 'PU'");
  const url = `${DNB_API_BASE}?select=${select}&where=${where}&order_by=session+desc&group_by=uai&limit=-1`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erreur chargement DNB: ${response.status}`);

  const rows = (await response.json()) as DnbRow[];
  dnbCache = new Map();
  // Data is ordered by session desc, so first occurrence per UAI is the latest year
  for (const row of rows) {
    if (!dnbCache.has(row.uai)) {
      dnbCache.set(row.uai, Math.round(row.nb_candidats_g * row.taux_de_reussite_g / 100));
    }
  }
  return dnbCache;
}
```

**Note:** The query uses `order_by=session+desc` and deduplicates by taking the first occurrence per UAI, so we always get the latest year's data. The `group_by=uai` may not work with the exports endpoint; if so, we rely on deduplication in code. The implementing agent should test the actual API call and adjust the query if needed (remove `group_by` if the API doesn't support it on exports).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/__tests__/collegesConcurrenceApi.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/collegesConcurrenceApi.ts src/services/__tests__/collegesConcurrenceApi.test.ts
git commit -m "feat(REQ3): add fetchDnbAdmisColleges service (OpenData)"
```

---

### Task 4: Service — orchestrator fetchCollegesConcurrents

**Files:**
- Modify: `src/services/collegesConcurrenceApi.ts`
- Modify: `src/services/__tests__/collegesConcurrenceApi.test.ts`

- [ ] **Step 1: Write the failing test for fetchCollegesConcurrents**

Add to the test file:

```typescript
  describe('fetchCollegesConcurrents', () => {
    it('joins ArcGIS + IPS + DNB data into CollegeConcurrent[]', async () => {
      let callIndex = 0;
      vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) {
          // ArcGIS call
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              features: [
                { attributes: { Réseau: '0752536Z', Nom_Tete: 'VOLTAIRE' } },
                { attributes: { Réseau: '0752319N', Nom_Tete: 'COYSEVOX' } },
              ],
            }),
          });
        }
        if (callIndex === 2) {
          // HuggingFace IPS
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              { Identifiant: '0752536Z', Bonus_IPS_2026: 800 },
              { Identifiant: '0752319N', Bonus_IPS_2026: 1200 },
            ]),
          });
        }
        // OpenData DNB
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { uai: '0752536Z', nb_candidats_g: 100, taux_de_reussite_g: 92.0 },
            { uai: '0752319N', nb_candidats_g: 80, taux_de_reussite_g: 95.0 },
          ]),
        });
      }));

      const { fetchCollegesConcurrents } = await import('../collegesConcurrenceApi');
      const result = await fetchCollegesConcurrents('0750676C');

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        uai: '0752536Z',
        nom: 'VOLTAIRE',
        bonusIps: 800,
        nbAdmis: 92,
      });
      expect(result).toContainEqual({
        uai: '0752319N',
        nom: 'COYSEVOX',
        bonusIps: 1200,
        nbAdmis: 76,
      });
    });

    it('handles missing IPS/DNB data gracefully', async () => {
      let callIndex = 0;
      vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              features: [
                { attributes: { Réseau: '0752536Z', Nom_Tete: 'VOLTAIRE' } },
              ],
            }),
          });
        }
        if (callIndex === 2) {
          // IPS — no data for this college
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
          });
        }
        // DNB — no data either
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }));

      const { fetchCollegesConcurrents } = await import('../collegesConcurrenceApi');
      const result = await fetchCollegesConcurrents('0750676C');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        uai: '0752536Z',
        nom: 'VOLTAIRE',
        bonusIps: -1,
        nbAdmis: 0,
      });
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/collegesConcurrenceApi.test.ts`
Expected: FAIL — `fetchCollegesConcurrents` not found

- [ ] **Step 3: Implement fetchCollegesConcurrents**

Add the exported type and orchestrator to `collegesConcurrenceApi.ts`:

```typescript
export interface CollegeConcurrent {
  uai: string;
  nom: string;
  bonusIps: number;  // 0, 400, 800, 1200, or -1 if unknown
  nbAdmis: number;   // 0 if unknown
}

const concurrentsCache = new Map<string, CollegeConcurrent[]>();

export async function fetchCollegesConcurrents(uaiLycee: string): Promise<CollegeConcurrent[]> {
  const cached = concurrentsCache.get(uaiLycee);
  if (cached) return cached;

  const colleges = await fetchCollegesForLycee(uaiLycee);
  if (colleges.length === 0) return [];

  const [ipsMap, dnbMap] = await Promise.all([
    fetchBonusIpsColleges(),
    fetchDnbAdmisColleges(),
  ]);

  const result: CollegeConcurrent[] = colleges.map((c) => ({
    uai: c.uai,
    nom: c.nom,
    bonusIps: ipsMap.get(c.uai) ?? -1,
    nbAdmis: dnbMap.get(c.uai) ?? 0,
  }));

  concurrentsCache.set(uaiLycee, result);
  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/__tests__/collegesConcurrenceApi.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/collegesConcurrenceApi.ts src/services/__tests__/collegesConcurrenceApi.test.ts
git commit -m "feat(REQ3): add fetchCollegesConcurrents orchestrator"
```

---

### Task 5: Component — CollegesConcurrence stacked bar chart

**Files:**
- Create: `src/components/CollegesConcurrence.tsx`
- Create: `src/components/CollegesConcurrence.css`

**Reference:** Use `find-docs` skill for Recharts BarChart/Bar API (stacked bars, custom tooltip).

- [ ] **Step 1: Create the component with loading/error states**

```typescript
// src/components/CollegesConcurrence.tsx
import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell,
} from 'recharts';
import { fetchCollegesConcurrents, type CollegeConcurrent } from '../services/collegesConcurrenceApi';
import './CollegesConcurrence.css';

interface CollegesConcurrenceProps {
  uaiLycee: string;
  uaiCollegeUtilisateur: string;
}

const BONUS_COLORS: Record<number, string> = {
  1200: '#dc2626',  // red — highest bonus = most disadvantaged
  800: '#f97316',   // orange
  400: '#3b82f6',   // blue
  0: '#16a34a',     // green — no bonus = most advantaged
};
const UNKNOWN_COLOR = '#9ca3af';
const USER_STROKE = '#fbbf24';
const USER_STROKE_WIDTH = 2;

const BONUS_LABELS: Record<number, string> = {
  1200: 'Bonus 1200',
  800: 'Bonus 800',
  400: 'Bonus 400',
  0: 'Bonus 0',
  [-1]: 'Inconnu',
};

interface BarDataPoint {
  bonusLabel: string;
  bonusIps: number;
  total: number;
  colleges: CollegeConcurrent[];
}

function buildChartData(colleges: CollegeConcurrent[]): BarDataPoint[] {
  const groups = new Map<number, CollegeConcurrent[]>();
  for (const c of colleges) {
    const key = c.bonusIps;
    const arr = groups.get(key) ?? [];
    arr.push(c);
    groups.set(key, arr);
  }

  // Sort by bonus descending (1200, 800, 400, 0, -1)
  return [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([bonus, cols]) => ({
      bonusLabel: BONUS_LABELS[bonus] ?? `Bonus ${bonus}`,
      bonusIps: bonus,
      total: cols.reduce((sum, c) => sum + c.nbAdmis, 0),
      colleges: cols.sort((a, b) => b.nbAdmis - a.nbAdmis),
    }));
}

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: BarDataPoint & { collegeName?: string; collegeAdmis?: number } }>;
}) {
  if (!active || !payload?.[0]) return null;
  const data = payload[0].payload;
  return (
    <div className="concurrence-tooltip">
      <div className="concurrence-tooltip-title">{data.bonusLabel}</div>
      {data.colleges.map((c) => (
        <div key={c.uai} className="concurrence-tooltip-row">
          <span>{c.nom}</span>
          <span className="concurrence-tooltip-value">{c.nbAdmis} admis</span>
        </div>
      ))}
      <div className="concurrence-tooltip-total">Total : {data.total} admis</div>
    </div>
  );
}

export function CollegesConcurrence({ uaiLycee, uaiCollegeUtilisateur }: CollegesConcurrenceProps) {
  const [colleges, setColleges] = useState<CollegeConcurrent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchCollegesConcurrents(uaiLycee)
      .then((result) => {
        setColleges(result);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erreur de chargement');
        setLoading(false);
      });
  }, [uaiLycee]);

  if (loading) {
    return (
      <div className="concurrence-panel">
        <div className="concurrence-loading"><span /><span /><span /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="concurrence-panel">
        <div className="concurrence-error">
          {error}
          <button onClick={() => {
            setLoading(true);
            setError(null);
            fetchCollegesConcurrents(uaiLycee)
              .then(setColleges)
              .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
              .finally(() => setLoading(false));
          }}>Réessayer</button>
        </div>
      </div>
    );
  }

  if (colleges.length === 0) return null;

  const chartData = buildChartData(colleges);

  // Build individual Bar components for each college (stacked)
  // Each college gets its own dataKey so we can color/highlight individually
  const allCollegeUais = new Set<string>();
  for (const group of chartData) {
    for (const c of group.colleges) {
      allCollegeUais.add(c.uai);
    }
  }

  // Transform data for stacked bars: each dataKey is a college UAI
  const stackedData = chartData.map((group) => {
    const point: Record<string, unknown> = {
      bonusLabel: group.bonusLabel,
      bonusIps: group.bonusIps,
      colleges: group.colleges,
      total: group.total,
    };
    for (const c of group.colleges) {
      point[c.uai] = c.nbAdmis;
    }
    return point;
  });

  // Unique colleges across all groups
  const uniqueColleges: { uai: string; nom: string; bonusIps: number }[] = [];
  const seen = new Set<string>();
  for (const group of chartData) {
    for (const c of group.colleges) {
      if (!seen.has(c.uai)) {
        seen.add(c.uai);
        uniqueColleges.push({ uai: c.uai, nom: c.nom, bonusIps: c.bonusIps });
      }
    }
  }

  const isUserCollege = (uai: string) => uai === uaiCollegeUtilisateur;

  return (
    <div className="concurrence-panel">
      <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 60 + 80)}>
        <BarChart data={stackedData} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} label={{ value: 'Admis DNB', position: 'insideBottom', offset: -5, fontSize: 11 }} />
          <YAxis type="category" dataKey="bonusLabel" tick={{ fontSize: 11 }} width={80} />
          <Tooltip content={<CustomTooltip />} />
          {uniqueColleges.map((c) => (
            <Bar key={c.uai} dataKey={c.uai} stackId="stack" name={c.nom}>
              {stackedData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={BONUS_COLORS[c.bonusIps] ?? UNKNOWN_COLOR}
                  stroke={isUserCollege(c.uai) ? USER_STROKE : 'none'}
                  strokeWidth={isUserCollege(c.uai) ? USER_STROKE_WIDTH : 0}
                />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="concurrence-legend">
        <div className="concurrence-legend-items">
          {Object.entries(BONUS_COLORS).map(([bonus, color]) => (
            <span key={bonus} className="concurrence-legend-item">
              <span className="concurrence-legend-dot" style={{ backgroundColor: color }} />
              {BONUS_LABELS[Number(bonus)]}
            </span>
          ))}
          <span className="concurrence-legend-item">
            <span className="concurrence-legend-dot concurrence-legend-user" />
            Votre collège
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the CSS file**

```css
/* src/components/CollegesConcurrence.css */
.concurrence-panel {
  margin-top: 8px;
  padding: 12px 0;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from { opacity: 0; max-height: 0; }
  to { opacity: 1; max-height: 500px; }
}

.concurrence-loading {
  display: flex;
  gap: 6px;
  justify-content: center;
  padding: 20px 0;
}

.concurrence-loading span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-text-muted);
  animation: pulse 1s infinite alternate;
}

.concurrence-loading span:nth-child(2) { animation-delay: 0.2s; }
.concurrence-loading span:nth-child(3) { animation-delay: 0.4s; }

@keyframes pulse {
  from { opacity: 0.3; }
  to { opacity: 1; }
}

.concurrence-error {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--color-warning-bg);
  border-radius: 8px;
  color: var(--color-warning-text);
  font-size: 13px;
}

.concurrence-error button {
  margin-left: auto;
  padding: 4px 10px;
  font-size: 12px;
  border: 1px solid currentColor;
  border-radius: 4px;
  background: none;
  color: inherit;
  cursor: pointer;
}

.concurrence-tooltip {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 12px;
  box-shadow: 0 2px 8px var(--color-shadow-md);
}

.concurrence-tooltip-title {
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--color-text-primary);
}

.concurrence-tooltip-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 2px 0;
  color: var(--color-text-secondary);
}

.concurrence-tooltip-value {
  font-weight: 500;
  white-space: nowrap;
}

.concurrence-tooltip-total {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--color-border);
  font-weight: 600;
  color: var(--color-text-primary);
}

.concurrence-legend {
  margin-top: 8px;
  padding: 8px 12px;
  background: var(--color-bg-subtle);
  border-radius: 8px;
}

.concurrence-legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.concurrence-legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--color-text-secondary);
}

.concurrence-legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

.concurrence-legend-user {
  background: var(--color-bg-subtle);
  border: 2px solid #fbbf24;
}
```

- [ ] **Step 3: Verify the app builds**

Run: `npx tsc -b && npx vite build`
Expected: Build succeeds (component isn't mounted yet, but types must compile)

- [ ] **Step 4: Commit**

```bash
git add src/components/CollegesConcurrence.tsx src/components/CollegesConcurrence.css
git commit -m "feat(REQ3): add CollegesConcurrence chart component"
```

---

### Task 6: Integration — expandable lycée list in CollegeCard

**Files:**
- Modify: `src/components/CollegeCard.tsx`
- Modify: `src/components/CollegeCard.css`

- [ ] **Step 1: Add expandedLycee state and expandable lycée list**

In `src/components/CollegeCard.tsx`, add the import and state:

```typescript
import { CollegesConcurrence } from './CollegesConcurrence';
```

Add state inside `CollegeCard`:

```typescript
const [expandedLycee, setExpandedLycee] = useState<string | null>(null);
```

After the `LyceesIndicateurs` block (around line 161, after the closing `)}` of the `{activeSector === 1 && effectifs.length > 0 && (` block), add the expandable list:

```tsx
{activeSector === 1 && effectifs.length > 0 && (
  <div className="concurrence-section">
    <h5 className="concurrence-section-title">Collèges en concurrence</h5>
    <ul className="concurrence-lycee-list">
      {effectifs.map((e) => (
        <li key={e.uai}>
          <button
            className={`concurrence-lycee-btn${expandedLycee === e.uai ? ' expanded' : ''}`}
            onClick={() => setExpandedLycee(expandedLycee === e.uai ? null : e.uai)}
          >
            <span className="concurrence-lycee-name">{e.nom}</span>
            <svg
              className="concurrence-chevron"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
            </svg>
          </button>
          {expandedLycee === e.uai && (
            <CollegesConcurrence
              uaiLycee={e.uai}
              uaiCollegeUtilisateur={college.uai}
            />
          )}
        </li>
      ))}
    </ul>
  </div>
)}
```

- [ ] **Step 2: Add CSS for the expandable list**

Append to `src/components/CollegeCard.css`:

```css
.concurrence-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

.concurrence-section-title {
  margin: 0 0 10px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.concurrence-lycee-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.concurrence-lycee-btn {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  background: var(--color-bg-subtle);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 500;
}

.concurrence-lycee-btn:hover {
  background: var(--color-border);
}

.concurrence-lycee-name {
  flex: 1;
  text-align: left;
}

.concurrence-chevron {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  transition: transform 0.2s;
  color: var(--color-text-muted);
}

.concurrence-lycee-btn.expanded .concurrence-chevron {
  transform: rotate(180deg);
}
```

- [ ] **Step 3: Verify the app builds and runs**

Run: `npx tsc -b && npx vite build`
Expected: Build succeeds

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`
Expected: Search an address in Paris, go to sector 1 tab, scroll down below the charts. See "Collèges en concurrence" section with expandable lycée buttons. Click a lycée → stacked bar chart loads.

- [ ] **Step 5: Commit**

```bash
git add src/components/CollegeCard.tsx src/components/CollegeCard.css
git commit -m "feat(REQ3): integrate collapsible colleges-en-concurrence panels"
```

---

### Task 7: Polish & react-doctor

**Files:**
- Potentially any file from above

- [ ] **Step 1: Run react-doctor**

Run: `npx -y react-doctor@latest .`
Expected: No new issues introduced

- [ ] **Step 2: Run all unit tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No lint errors

- [ ] **Step 4: Final build check**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 5: Fix any issues found, then commit**

If fixes needed:
```bash
git add -A
git commit -m "fix(REQ3): address react-doctor/lint/test issues"
```
