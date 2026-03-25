# Effectifs Donut Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Recharts donut chart showing the relative weight of sector 1 lycées by their 2nde enrollment numbers.

**Architecture:** New service fetches effectifs from OpenDataSoft API, new hook encapsulates fetch logic, new Recharts component renders the donut. Integrated into CollegeCard's sector 1 tab.

**Tech Stack:** React 19, TypeScript, Recharts 3.8, Vitest, OpenDataSoft API (`data.education.gouv.fr`)

**Spec:** `docs/superpowers/specs/2026-03-25-effectifs-donut-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/types/index.ts` | Add `EffectifLycee` interface |
| `src/services/effectifsApi.ts` | **New** — fetch effectifs 2nde from OpenDataSoft, with cache |
| `src/services/__tests__/effectifsApi.test.ts` | **New** — unit tests for service |
| `src/hooks/useEffectifs.ts` | **New** — hook wrapping fetch with race condition protection |
| `src/components/EffectifsDonut.tsx` | **New** — Recharts donut component |
| `src/components/EffectifsDonut.css` | **New** — styles for donut and legend |
| `src/components/CollegeCard.tsx` | Wire hook + render donut in sector 1 tab |
| `src/components/index.ts` | Export new component |

---

### Task 1: Add `EffectifLycee` type

**Files:**
- Modify: `src/types/index.ts:44` (after `LyceeSecteur`)

- [ ] **Step 1: Add the type**

```typescript
// Add after LyceeSecteur interface (line 44)
export interface EffectifLycee {
  uai: string;
  nom: string;
  effectif: number;
  annee: string;
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add EffectifLycee type"
```

---

### Task 2: Create `effectifsApi` service with tests (TDD)

**Files:**
- Create: `src/services/__tests__/effectifsApi.test.ts`
- Create: `src/services/effectifsApi.ts`

- [ ] **Step 1: Write failing tests**

Create `src/services/__tests__/effectifsApi.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('fetchEffectif2nde', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('fetches and maps API fields to EffectifLycee', async () => {
    const mockData = {
      total_count: 1,
      results: [
        { rentree_scolaire: '2024', '2ndes_gt': 243, patronyme: 'MOLIERE' },
      ],
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    }));

    const { fetchEffectif2nde } = await import('../effectifsApi');
    const result = await fetchEffectif2nde('0750703G');

    expect(result).toEqual({
      uai: '0750703G',
      nom: 'MOLIERE',
      effectif: 243,
      annee: '2024',
    });
  });

  it('returns null when no results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ total_count: 0, results: [] }),
    }));

    const { fetchEffectif2nde } = await import('../effectifsApi');
    const result = await fetchEffectif2nde('UNKNOWN');

    expect(result).toBeNull();
  });

  it('returns null on fetch error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }));

    const { fetchEffectif2nde } = await import('../effectifsApi');
    const result = await fetchEffectif2nde('0750703G');

    expect(result).toBeNull();
  });
});

describe('fetchEffectifsSecteur1', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('fetches effectifs for all sector 1 lycées', async () => {
    const mockResponses: Record<string, object> = {
      '0750703G': { total_count: 1, results: [{ rentree_scolaire: '2024', '2ndes_gt': 243, patronyme: 'MOLIERE' }] },
      '0750653C': { total_count: 1, results: [{ rentree_scolaire: '2024', '2ndes_gt': 310, patronyme: 'SOPHIE GERMAIN' }] },
    };

    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      const uai = url.match(/numero_lycee='(\w+)'/)?.[1] ?? '';
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponses[uai] ?? { total_count: 0, results: [] }),
      });
    }));

    const { fetchEffectifsSecteur1 } = await import('../effectifsApi');
    const results = await fetchEffectifsSecteur1([
      { uai: '0750703G', nom: 'MOLIERE', secteur: 1 },
      { uai: '0750653C', nom: 'SOPHIE GERMAIN', secteur: 1 },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].effectif).toBe(243);
    expect(results[1].effectif).toBe(310);
  });

  it('handles partial failures with Promise.allSettled', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ total_count: 1, results: [{ rentree_scolaire: '2024', '2ndes_gt': 243, patronyme: 'MOLIERE' }] }),
      })
      .mockRejectedValueOnce(new Error('Network error'))
    );

    const { fetchEffectifsSecteur1 } = await import('../effectifsApi');
    const results = await fetchEffectifsSecteur1([
      { uai: '0750703G', nom: 'MOLIERE', secteur: 1 },
      { uai: '0750653C', nom: 'SOPHIE GERMAIN', secteur: 1 },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].uai).toBe('0750703G');
  });

  it('caches results for the same set of UAIs', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ total_count: 1, results: [{ rentree_scolaire: '2024', '2ndes_gt': 243, patronyme: 'MOLIERE' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchEffectifsSecteur1 } = await import('../effectifsApi');
    const lycees = [{ uai: '0750703G', nom: 'MOLIERE', secteur: 1 }];

    await fetchEffectifsSecteur1(lycees);
    await fetchEffectifsSecteur1(lycees);

    // fetch should only be called once (cached on second call)
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/services/__tests__/effectifsApi.test.ts`
Expected: FAIL — module `../effectifsApi` not found

- [ ] **Step 3: Implement the service**

Create `src/services/effectifsApi.ts`:

```typescript
import type { EffectifLycee, LyceeSecteur } from '../types';

const API_URL =
  'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-lycee_gt-effectifs-niveau-sexe-lv/records';

interface ApiResult {
  rentree_scolaire: string;
  '2ndes_gt': number;
  patronyme: string;
}

const cache = new Map<string, EffectifLycee[]>();

export async function fetchEffectif2nde(uai: string): Promise<EffectifLycee | null> {
  try {
    const params = new URLSearchParams({
      where: `numero_lycee='${uai}'`,
      order_by: 'rentree_scolaire desc',
      select: 'rentree_scolaire,`2ndes_gt`,patronyme',
      limit: '1',
    });

    const response = await fetch(`${API_URL}?${params}`);
    if (!response.ok) return null;

    const data = await response.json();
    const result: ApiResult | undefined = data.results?.[0];
    if (!result) return null;

    return {
      uai,
      nom: result.patronyme,
      effectif: result['2ndes_gt'],
      annee: result.rentree_scolaire,
    };
  } catch {
    return null;
  }
}

export async function fetchEffectifsSecteur1(
  lycees: LyceeSecteur[],
): Promise<EffectifLycee[]> {
  const secteur1 = lycees.filter((l) => l.secteur === 1);
  const cacheKey = secteur1.map((l) => l.uai).sort().join(',');

  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const settled = await Promise.allSettled(
    secteur1.map((l) => fetchEffectif2nde(l.uai)),
  );

  const results: EffectifLycee[] = [];
  for (const entry of settled) {
    if (entry.status === 'fulfilled' && entry.value) {
      results.push(entry.value);
    }
  }

  cache.set(cacheKey, results);
  return results;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/services/__tests__/effectifsApi.test.ts`
Expected: 5 tests PASS

- [ ] **Step 5: Run full test suite + lint**

Run: `npm test && npm run lint`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add src/services/effectifsApi.ts src/services/__tests__/effectifsApi.test.ts
git commit -m "feat: add effectifsApi service with tests"
```

---

### Task 3: Create `useEffectifs` hook

**Files:**
- Create: `src/hooks/useEffectifs.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useState, useEffect, useRef, useMemo } from 'react';
import type { EffectifLycee, LyceeSecteur } from '../types';
import { fetchEffectifsSecteur1 } from '../services/effectifsApi';

export function useEffectifs(lycees: LyceeSecteur[] | undefined) {
  const [effectifs, setEffectifs] = useState<EffectifLycee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const lyceesRef = useRef(lycees);
  lyceesRef.current = lycees;

  // Stable dependency: only re-run when the set of UAIs actually changes
  const lyceesKey = useMemo(
    () => lycees?.map((l) => l.uai).sort().join(',') ?? '',
    [lycees],
  );

  useEffect(() => {
    if (!lyceesKey || !lyceesRef.current) return;

    let cancelled = false;
    setIsLoading(true);

    fetchEffectifsSecteur1(lyceesRef.current)
      .then((data) => {
        if (!cancelled) setEffectifs(data);
      })
      .catch(() => {
        // Silently ignore
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lyceesKey]);

  // Count of sector 1 lycées requested (for partial data note)
  const requestedCount = useMemo(
    () => lycees?.filter((l) => l.secteur === 1).length ?? 0,
    [lycees],
  );

  return { effectifs, isLoading, requestedCount };
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: SUCCESS

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useEffectifs.ts
git commit -m "feat: add useEffectifs hook"
```

---

### Task 4: Create `EffectifsDonut` component

**Files:**
- Create: `src/components/EffectifsDonut.tsx`
- Create: `src/components/EffectifsDonut.css`
- Modify: `src/components/index.ts`

- [ ] **Step 1: Create the CSS**

Create `src/components/EffectifsDonut.css`:

```css
.effectifs-donut {
  margin-bottom: 20px;
  padding: 16px 0;
}

.effectifs-donut-chart {
  display: flex;
  justify-content: center;
}

.donut-center-total {
  font-size: 22px;
  font-weight: 700;
  fill: var(--color-text-primary);
}

.donut-center-label {
  font-size: 12px;
  fill: var(--color-text-muted);
}

.effectifs-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  justify-content: center;
  margin-top: 12px;
}

.effectifs-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.effectifs-legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.effectifs-legend-pct {
  color: var(--color-text-muted);
  font-size: 12px;
}

.effectifs-year {
  text-align: center;
  font-size: 12px;
  color: var(--color-text-faint);
  margin-top: 8px;
}

.effectifs-note {
  text-align: center;
  font-size: 11px;
  color: var(--color-text-faint);
  font-style: italic;
  margin-top: 4px;
}

.effectifs-loading {
  display: flex;
  justify-content: center;
  gap: 4px;
  padding: 24px 0;
}

.effectifs-loading span {
  width: 6px;
  height: 6px;
  background: var(--color-primary);
  border-radius: 50%;
  animation: effectifsBounce 1.2s ease-in-out infinite;
}

.effectifs-loading span:nth-child(2) {
  animation-delay: 0.1s;
}

.effectifs-loading span:nth-child(3) {
  animation-delay: 0.2s;
}

@keyframes effectifsBounce {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-6px);
  }
}
```

- [ ] **Step 2: Create the component**

Create `src/components/EffectifsDonut.tsx`:

```tsx
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Label } from 'recharts';
import type { EffectifLycee } from '../types';
import './EffectifsDonut.css';

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

interface EffectifsDonutProps {
  effectifs: EffectifLycee[];
  requestedCount?: number; // total lycées requested (to detect missing data)
}

function CenterLabel({ viewBox, total }: { viewBox?: { cx?: number; cy?: number }; total: number }) {
  const cx = viewBox?.cx ?? 0;
  const cy = viewBox?.cy ?? 0;
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" className="donut-center-total">
        {total}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="donut-center-label">
        places en 2nde
      </text>
    </g>
  );
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { nom: string; effectif: number; pct: number } }> }) {
  if (!active || !payload?.[0]) return null;
  const { nom, effectif, pct } = payload[0].payload;
  return (
    <div style={{
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 13,
      color: 'var(--color-text-primary)',
      boxShadow: '0 2px 8px var(--color-shadow-md)',
    }}>
      <strong>{nom}</strong>
      <br />
      {effectif} places ({pct}%)
    </div>
  );
}

export function EffectifsDonut({ effectifs, requestedCount }: EffectifsDonutProps) {
  const total = effectifs.reduce((sum, e) => sum + e.effectif, 0);
  if (total === 0) return null;

  const data = effectifs.map((e) => ({
    ...e,
    pct: Math.round((e.effectif / total) * 100),
  }));

  // Year display
  const years = [...new Set(effectifs.map((e) => e.annee))].sort();
  const yearLabel = years.length === 1
    ? `Données rentrée ${years[0]}`
    : `Données rentrées ${years[0]}-${years[years.length - 1]}`;

  return (
    <div
      className="effectifs-donut"
      role="img"
      aria-label={`Répartition des ${total} places de seconde entre ${effectifs.length} lycées de secteur 1`}
    >
      <div className="effectifs-donut-chart">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              dataKey="effectif"
              nameKey="nom"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              animationDuration={600}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
              <Label content={<CenterLabel total={total} />} position="center" />
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="effectifs-legend">
        {data.map((entry, i) => (
          <span key={entry.uai} className="effectifs-legend-item">
            <span className="effectifs-legend-dot" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            {entry.nom}
            <span className="effectifs-legend-pct">{entry.effectif} ({entry.pct}%)</span>
          </span>
        ))}
      </div>
      <p className="effectifs-year">{yearLabel}</p>
      {requestedCount != null && requestedCount > effectifs.length && (
        <p className="effectifs-note">
          Données indisponibles pour {requestedCount - effectifs.length} lycée{requestedCount - effectifs.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

export function EffectifsLoading() {
  return (
    <div className="effectifs-loading">
      <span /><span /><span />
    </div>
  );
}
```

- [ ] **Step 3: Add export to index.ts**

In `src/components/index.ts`, add:

```typescript
export { EffectifsDonut, EffectifsLoading } from './EffectifsDonut';
```

- [ ] **Step 4: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: SUCCESS

- [ ] **Step 5: Commit**

```bash
git add src/components/EffectifsDonut.tsx src/components/EffectifsDonut.css src/components/index.ts
git commit -m "feat: add EffectifsDonut component with Recharts"
```

---

### Task 5: Integrate donut into CollegeCard

**Files:**
- Modify: `src/components/CollegeCard.tsx`

- [ ] **Step 1: Add imports**

At top of `src/components/CollegeCard.tsx`, add:

```typescript
import { useEffectifs } from '../hooks/useEffectifs';
import { EffectifsDonut, EffectifsLoading } from './EffectifsDonut';
```

- [ ] **Step 2: Add hook call**

Inside the `CollegeCard` function, after the existing `newSecteur1` state (line 19), add:

```typescript
const { effectifs, isLoading: effectifsLoading, requestedCount } = useEffectifs(lycees);
```

- [ ] **Step 3: Add donut rendering**

In the JSX, inside the `lycees-section` div, between the sector tabs closing `</div>` and the `<ul className="lycee-list">`, add:

```tsx
{activeSector === 1 && effectifsLoading && <EffectifsLoading />}
{activeSector === 1 && effectifs.length > 0 && (
  <EffectifsDonut effectifs={effectifs} requestedCount={requestedCount} />
)}
```

- [ ] **Step 4: Verify build + lint + tests**

Run: `npm run build && npm run lint && npm test`
Expected: All pass

- [ ] **Step 5: Run react-doctor**

Run: `npx -y react-doctor@latest .`
Expected: No issues, score 100/100

- [ ] **Step 6: Commit**

```bash
git add src/components/CollegeCard.tsx
git commit -m "feat: integrate effectifs donut in CollegeCard sector 1"
```

---

### Task 6: Manual verification

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Test donut display**

Search a Paris address (e.g. "12 rue de Rivoli Paris"). Verify:
- Donut chart appears in the sector 1 tab
- Total in center shows sum of all effectifs
- Each lycée has a colored slice with correct proportions
- Tooltip shows name + effectif + percentage on hover
- Legend below shows all lycées with their effectifs
- Year is displayed under the legend

- [ ] **Step 3: Test dark mode**

Toggle to dark mode. Verify:
- Donut colors remain vivid and readable
- Center text and legend use correct theme colors
- Tooltip has dark background with proper borders

- [ ] **Step 4: Test edge cases**

- Switch to sector 2 tab → donut should disappear
- Switch back to sector 1 → donut should reappear (no re-fetch thanks to cache)

- [ ] **Step 5: Final build check**

Run: `npm run build`
Expected: SUCCESS, production build clean
