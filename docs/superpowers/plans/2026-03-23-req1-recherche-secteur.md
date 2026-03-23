# REQ1 — Recherche Secteur Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate college lookup to official CapGeo carte scolaire APIs and add lycee sector search, completing REQ1.

**Architecture:** Three-step API pipeline (CapGeo carte scolaire -> ArcGIS UAI lookup -> ArcGIS lycee sectors) orchestrated by a single hook (`useSectorSearch`). No backend, all client-side. Coordinate conversion via math formula (no library).

**Tech Stack:** React 19.2, TypeScript strict, Vite 8, Vitest (unit tests), Playwright (E2E tests)

**Spec:** `docs/superpowers/specs/2026-03-23-req1-recherche-secteur-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/services/geo.ts` | WGS84 -> Web Mercator coordinate conversion |
| `src/services/sectorApi.ts` | CapGeo + ArcGIS API calls (college de secteur, UAI, lycees) |
| `src/hooks/useSectorSearch.ts` | Orchestrates pipeline, manages state, saves history |
| `src/types/index.ts` | Shared types (CollegeSecteur, LyceeSecteur, SectorResult, updated SearchHistory) |
| `src/services/storage.ts` | Updated localStorage wrapper for new SearchHistory shape |
| `src/components/CollegeCard.tsx` | Updated to display SectorResult (college + lycees) |
| `src/components/CollegeCard.css` | Styles for lycee section |
| `src/components/SearchHistory.tsx` | Updated to reference new SearchHistory type |
| `src/App.tsx` | Wired to useSectorSearch, updated footer |
| `src/components/index.ts` | No change |
| `src/services/collegeApi.ts` | DELETED |
| `src/hooks/useCollegeSearch.ts` | DELETED |

---

### Task 1: Install Vitest and setup unit testing

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Create vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
  },
});
```

- [ ] **Step 3: Add test script to package.json**

Add to `scripts`: `"test": "vitest run"`, `"test:watch": "vitest"`

- [ ] **Step 4: Verify vitest runs (no tests yet, should exit cleanly)**

Run: `npm test`
Expected: "No test files found" or clean exit

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest for unit testing"
```

---

### Task 2: Implement `geo.ts` — coordinate conversion (TDD)

**Files:**
- Create: `src/services/geo.ts`
- Create: `src/services/__tests__/geo.test.ts`

- [ ] **Step 1: Write failing tests for wgs84ToWebMercator**

Create `src/services/__tests__/geo.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { wgs84ToWebMercator } from '../geo';

describe('wgs84ToWebMercator', () => {
  it('converts Paris center coordinates correctly', () => {
    // 48.8566, 2.3522 (lat, lon) -> approx (261848, 6250566) in EPSG:3857
    const result = wgs84ToWebMercator(48.8566, 2.3522);
    expect(result.x).toBeCloseTo(261848, -1); // within ~10m
    expect(result.y).toBeCloseTo(6250566, -1);
  });

  it('converts passage Saint-Ambroise coordinates', () => {
    // 48.863685, 2.377174 -> approx (264625.8, 6251763.2)
    const result = wgs84ToWebMercator(48.863685, 2.377174);
    expect(result.x).toBeCloseTo(264626, -1);
    expect(result.y).toBeCloseTo(6251763, -1);
  });

  it('converts avenue de Suffren coordinates', () => {
    // 48.856645, 2.292077 -> approx (255152.8, 6250572.0)
    const result = wgs84ToWebMercator(48.856645, 2.292077);
    expect(result.x).toBeCloseTo(255153, -1);
    expect(result.y).toBeCloseTo(6250572, -1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/services/__tests__/geo.test.ts`
Expected: FAIL — module `../geo` not found

- [ ] **Step 3: Implement wgs84ToWebMercator**

Create `src/services/geo.ts`:

```typescript
export interface MercatorPoint {
  x: number;
  y: number;
}

const EARTH_RADIUS = 6378137; // WGS84 semi-major axis in meters

/**
 * Convert WGS84 (lat/lon in degrees) to Web Mercator (EPSG:3857) coordinates.
 */
export function wgs84ToWebMercator(lat: number, lon: number): MercatorPoint {
  const x = (lon * Math.PI * EARTH_RADIUS) / 180;
  const latRad = (lat * Math.PI) / 180;
  const y = EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  return { x, y };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/services/__tests__/geo.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/geo.ts src/services/__tests__/geo.test.ts
git commit -m "feat: add WGS84 to Web Mercator coordinate conversion"
```

---

### Task 3: Update types — CollegeSecteur, LyceeSecteur, SectorResult, SearchHistory

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add new types (keep old ones for now)**

In `src/types/index.ts`, **keep** the existing `College` and `SearchHistory` interfaces intact. Add the new types **after** them (before `ApiAddressResponse`):

```typescript
export interface CollegeSecteur {
  nom: string;
  uai: string;
}

export interface LyceeSecteur {
  uai: string;
  nom: string;
  secteur: number;
}

export interface SectorResult {
  college: CollegeSecteur;
  lycees: LyceeSecteur[] | null;
  lyceeError?: string;
}
```

Do NOT remove `College` or modify `SearchHistory` yet — old consumers still depend on them. They will be removed in Task 10 along with the old files.

- [ ] **Step 2: Verify TypeScript compiles cleanly**

Run: `npx tsc --noEmit`
Expected: No errors (old types still present, old consumers still valid)

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add CollegeSecteur, LyceeSecteur, SectorResult types"
```

---

### Task 4: Implement `sectorApi.ts` — the 3-step API pipeline (TDD)

**Files:**
- Create: `src/services/sectorApi.ts`
- Create: `src/services/__tests__/sectorApi.test.ts`

- [ ] **Step 1: Write failing tests with mocked fetch**

Create `src/services/__tests__/sectorApi.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findCollegeDeSecteur, findCollegeUAI, findLyceesDeSecteur } from '../sectorApi';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('findCollegeDeSecteur', () => {
  it('returns college name from carte scolaire', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [{ attributes: { libelle: 'COLLEGE VOLTAIRE', type_etabl: 'COL' } }],
      }),
    });

    const result = await findCollegeDeSecteur(48.863685, 2.377174);
    expect(result).toBe('COLLEGE VOLTAIRE');

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('capgeo2.paris.fr');
    expect(calledUrl).toContain('type_etabl');
  });

  it('throws when no college found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [] }),
    });

    await expect(findCollegeDeSecteur(0, 0)).rejects.toThrow(
      'Aucun collège de secteur trouvé pour cette adresse'
    );
  });
});

describe('findCollegeUAI', () => {
  it('returns UAI from ArcGIS Rectorat', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [{ attributes: { Réseau: '0752536Z', Nom_Tete: 'VOLTAIRE' } }],
      }),
    });

    const result = await findCollegeUAI('COLLEGE VOLTAIRE');
    expect(result).toBe('0752536Z');

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('Nom_Tete');
    // Should strip "COLLEGE " prefix
    expect(calledUrl).toContain('VOLTAIRE');
    expect(calledUrl).not.toContain('COLLEGE%20VOLTAIRE');
  });

  it('throws when no match found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [] }),
    });

    await expect(findCollegeUAI('COLLEGE INCONNU')).rejects.toThrow(
      'Collège non référencé dans l\'annuaire Affelnet'
    );
  });
});

describe('findLyceesDeSecteur', () => {
  it('returns lycees sorted by sector', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [
          { attributes: { UAI: '0750676C', Nom: 'DORIAN', secteur: '1' } },
          { attributes: { UAI: '0750652B', Nom: 'CHARLEMAGNE', secteur: '1' } },
          { attributes: { UAI: '0750711R', Nom: 'BERGSON', secteur: '2' } },
        ],
      }),
    });

    const result = await findLyceesDeSecteur('0752536Z');
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ uai: '0750676C', nom: 'DORIAN', secteur: 1 });
    expect(result[1]).toEqual({ uai: '0750652B', nom: 'CHARLEMAGNE', secteur: 1 });
    expect(result[2]).toEqual({ uai: '0750711R', nom: 'BERGSON', secteur: 2 });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('0752536Z');
    expect(calledUrl).toContain("secteur%3C%3E'Tete'");
  });

  it('returns empty array when no lycees found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [] }),
    });

    const result = await findLyceesDeSecteur('0000000X');
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/services/__tests__/sectorApi.test.ts`
Expected: FAIL — module `../sectorApi` not found

- [ ] **Step 3: Implement sectorApi.ts**

Create `src/services/sectorApi.ts`:

```typescript
import type { LyceeSecteur } from '../types';
import { wgs84ToWebMercator } from './geo';

const CAPGEO_BASE = 'https://capgeo2.paris.fr/public/rest/services/DASCO/DASCO_Carte_scolaire/MapServer/0/query';
const ARCGIS_BASE = 'https://services9.arcgis.com/ekT8MJFiVh8nvlV5/arcgis/rest/services/Affectation_Lyc%C3%A9es/FeatureServer/0/query';
const ANNEE_SCOLAIRE = '2025-2026';

/**
 * Find the sector college name from GPS coordinates.
 * Converts WGS84 to Web Mercator, then queries CapGeo carte scolaire.
 */
export async function findCollegeDeSecteur(lat: number, lon: number): Promise<string> {
  const { x, y } = wgs84ToWebMercator(lat, lon);

  const geometry = JSON.stringify({ x, y });
  const where = `annee_scol='${ANNEE_SCOLAIRE}' AND type_etabl='COL'`;

  const params = new URLSearchParams({
    f: 'json',
    where,
    outFields: 'libelle,type_etabl',
    returnGeometry: 'false',
    spatialRel: 'esriSpatialRelIntersects',
    geometryType: 'esriGeometryPoint',
    inSR: '102100',
    outSR: '102100',
    geometry,
  });

  const response = await fetch(`${CAPGEO_BASE}?${params}`);
  if (!response.ok) throw new Error('Erreur de connexion à la carte scolaire');

  const data = await response.json();
  const feature = data.features?.find(
    (f: { attributes: { type_etabl: string } }) => f.attributes.type_etabl === 'COL'
  );

  if (!feature) {
    throw new Error('Aucun collège de secteur trouvé pour cette adresse');
  }

  return feature.attributes.libelle as string;
}

/**
 * Normalize college name from CapGeo format to ArcGIS search format.
 * CapGeo returns "COLLEGE VOLTAIRE", ArcGIS expects just "VOLTAIRE".
 */
function normalizeCollegeName(libelle: string): string {
  return libelle
    .replace(/^COLLEGE\s+/i, '')
    .replace(/^CLG\s+/i, '')
    .trim();
}

/**
 * Find a college's UAI code from its name via ArcGIS Rectorat.
 * Field semantics: Réseau = college UAI, Nom_Tete = college name.
 */
export async function findCollegeUAI(nomCollege: string): Promise<string> {
  const normalizedName = normalizeCollegeName(nomCollege);

  const params = new URLSearchParams({
    outFields: 'Réseau,Nom_Tete',
    returnGeometry: 'false',
    f: 'pjson',
    returnDistinctValues: 'true',
    where: `Nom_Tete like '%${normalizedName}'`,
  });

  const response = await fetch(`${ARCGIS_BASE}?${params}`);
  if (!response.ok) throw new Error('Erreur de connexion à l\'annuaire Affelnet');

  const data = await response.json();

  if (!data.features?.length) {
    throw new Error('Collège non référencé dans l\'annuaire Affelnet');
  }

  return data.features[0].attributes.Réseau as string;
}

/**
 * Find sector lycees for a given college UAI via ArcGIS Rectorat.
 * Field semantics: UAI = lycee UAI, Nom = lycee name.
 * Filter: secteur<>'Tete' excludes the college's own head-of-network row.
 */
export async function findLyceesDeSecteur(uaiCollege: string): Promise<LyceeSecteur[]> {
  const params = new URLSearchParams({
    outFields: 'UAI,Nom,secteur',
    returnGeometry: 'false',
    f: 'pjson',
    orderByFields: 'secteur',
    where: `secteur<>'Tete' and Réseau='${uaiCollege}'`,
  });

  const response = await fetch(`${ARCGIS_BASE}?${params}`);
  if (!response.ok) throw new Error('Erreur de connexion à l\'annuaire Affelnet');

  const data = await response.json();

  return (data.features || []).map(
    (f: { attributes: { UAI: string; Nom: string; secteur: string } }) => ({
      uai: f.attributes.UAI,
      nom: f.attributes.Nom,
      secteur: parseInt(f.attributes.secteur, 10),
    })
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/services/__tests__/sectorApi.test.ts`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/sectorApi.ts src/services/__tests__/sectorApi.test.ts
git commit -m "feat: add sectorApi with CapGeo + ArcGIS API pipeline"
```

---

### Task 5: Update `storage.ts` for new SearchHistory shape

**Files:**
- Modify: `src/services/storage.ts`

- [ ] **Step 1: Update storage.ts**

Replace `src/services/storage.ts` entirely. Note: we define a `StoredSearchHistory` interface locally since the old `SearchHistory` type in `types/index.ts` still has the old shape (it will be cleaned up in Task 10).

```typescript
import type { SectorResult, Address } from '../types';

/** Local type for what we store — will replace SearchHistory in types/index.ts in Task 10 */
export interface StoredSearchHistory {
  id: string;
  address: Address;
  result: SectorResult;
  timestamp: number;
}

const STORAGE_KEY = 'college-secteur-history';
const STORAGE_VERSION = 2;

function isValidHistory(data: unknown): data is StoredSearchHistory[] {
  if (!Array.isArray(data)) return false;
  if (data.length === 0) return true;
  const first = data[0];
  return first && typeof first === 'object' && 'result' in first && 'address' in first;
}

export function getSearchHistory(): StoredSearchHistory[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);

    // Check if data has old format (college field instead of result)
    if (parsed.version !== STORAGE_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }

    if (!isValidHistory(parsed.data)) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }

    return parsed.data;
  } catch {
    return [];
  }
}

export function saveSearchHistory(history: StoredSearchHistory[]): void {
  try {
    const limitedHistory = history.slice(0, 10);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, data: limitedHistory })
    );
  } catch (error) {
    console.error('Erreur sauvegarde historique:', error);
  }
}

export function addToHistory(address: Address, result: SectorResult): StoredSearchHistory {
  const history = getSearchHistory();
  const newEntry: StoredSearchHistory = {
    id: crypto.randomUUID(),
    address,
    result,
    timestamp: Date.now(),
  };

  const filteredHistory = history.filter(
    (h) => h.address.label !== address.label
  );

  saveSearchHistory([newEntry, ...filteredHistory]);
  return newEntry;
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function removeFromHistory(id: string): void {
  const history = getSearchHistory();
  const filtered = history.filter((h) => h.id !== id);
  saveSearchHistory(filtered);
}
```

Note: `addToHistory` signature changes from `(entry: Omit<SearchHistory, 'id' | 'timestamp'>)` to `(address: Address, result: SectorResult)`. The old `useCollegeSearch.ts` (which still uses old `addToHistory`) will no longer compile, but it's dead code that gets deleted in Task 10.

- [ ] **Step 2: Verify new unit tests still pass**

Run: `npm test`
Expected: All existing tests (geo, sectorApi) pass

- [ ] **Step 3: Commit**

```bash
git add src/services/storage.ts
git commit -m "feat: update storage for new SearchHistory format with version migration"
```

---

### Task 6: Implement `useSectorSearch` hook

**Files:**
- Create: `src/hooks/useSectorSearch.ts`

- [ ] **Step 1: Create the hook**

Create `src/hooks/useSectorSearch.ts`:

```typescript
import { useState, useCallback } from 'react';
import type { Address, SectorResult } from '../types';
import { findCollegeDeSecteur, findCollegeUAI, findLyceesDeSecteur } from '../services/sectorApi';
import { addToHistory } from '../services/storage';

export function useSectorSearch() {
  const [result, setResult] = useState<SectorResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchedAddress, setSearchedAddress] = useState<Address | null>(null);

  const searchSector = useCallback(async (address: Address) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setSearchedAddress(address);

    try {
      // Address.coordinates is [longitude, latitude] — reverse for API
      const [lon, lat] = address.coordinates;

      // Step 1: Find college name from carte scolaire
      const collegeName = await findCollegeDeSecteur(lat, lon);

      // Step 2: Find college UAI from ArcGIS
      const collegeUAI = await findCollegeUAI(collegeName);

      // Step 3: Find lycees (graceful degradation if this fails)
      let lycees = null;
      let lyceeError: string | undefined;
      try {
        lycees = await findLyceesDeSecteur(collegeUAI);
      } catch (e) {
        lyceeError = e instanceof Error ? e.message : 'Lycées de secteur non disponibles';
      }

      const sectorResult: SectorResult = {
        college: { nom: collegeName, uai: collegeUAI },
        lycees,
        lyceeError,
      };

      setResult(sectorResult);
      addToHistory(address, sectorResult);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erreur lors de la recherche.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const showResult = useCallback((address: Address, sectorResult: SectorResult) => {
    setResult(sectorResult);
    setSearchedAddress(address);
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setSearchedAddress(null);
  }, []);

  return {
    result,
    searchedAddress,
    isLoading,
    error,
    searchSector,
    showResult,
    reset,
  };
}
```

Note: `showResult` allows displaying a history entry without re-fetching.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | grep useSectorSearch`
Expected: No errors for this file

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSectorSearch.ts
git commit -m "feat: add useSectorSearch hook orchestrating sector pipeline"
```

---

### Task 7: Update `CollegeCard` component for SectorResult

**Files:**
- Modify: `src/components/CollegeCard.tsx`
- Modify: `src/components/CollegeCard.css`

- [ ] **Step 1: Rewrite CollegeCard.tsx**

Replace `src/components/CollegeCard.tsx` entirely:

```typescript
import type { SectorResult } from '../types';
import './CollegeCard.css';

interface CollegeCardProps {
  result: SectorResult;
  addressLabel?: string;
}

export function CollegeCard({ result, addressLabel }: CollegeCardProps) {
  const { college, lycees, lyceeError } = result;

  // Group lycees by sector
  const lyceesBySector = lycees
    ? lycees.reduce<Record<number, typeof lycees>>((acc, lycee) => {
        (acc[lycee.secteur] ??= []).push(lycee);
        return acc;
      }, {})
    : null;

  return (
    <div className="college-card">
      <div className="college-header">
        <div className="college-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
          </svg>
        </div>
        <div className="college-title">
          <span className="label">Votre college de secteur</span>
          <h2>{college.nom}</h2>
        </div>
      </div>

      {addressLabel && (
        <div className="address-searched">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          <span>{addressLabel}</span>
        </div>
      )}

      <div className="college-details">
        <div className="detail-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <div>
            <span className="detail-label">Code UAI</span>
            <span className="detail-value">{college.uai}</span>
          </div>
        </div>
      </div>

      {lyceesBySector && (
        <div className="lycees-section">
          <h3 className="lycees-title">Lycees de secteur</h3>
          {[1, 2, 3].map((secteur) => {
            const lyceesInSector = lyceesBySector[secteur];
            if (!lyceesInSector?.length) return null;
            return (
              <div key={secteur} className="sector-group">
                <h4 className="sector-label">Secteur {secteur}</h4>
                <ul className="lycee-list">
                  {lyceesInSector.map((lycee) => (
                    <li key={lycee.uai} className="lycee-item">
                      <span className="lycee-name">{lycee.nom}</span>
                      <span className="lycee-uai">{lycee.uai}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {lyceeError && (
        <div className="lycee-error">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          <span>{lyceeError}</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add lycee styles to CollegeCard.css**

Append to `src/components/CollegeCard.css`:

```css
.lycees-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

.lycees-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.sector-group {
  margin-bottom: 16px;
}

.sector-group:last-child {
  margin-bottom: 0;
}

.sector-label {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.lycee-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lycee-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f9fafb;
  border-radius: 8px;
}

.lycee-name {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.lycee-uai {
  font-size: 12px;
  color: #9ca3af;
  font-family: monospace;
}

.lycee-error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px 16px;
  background: #fef3c7;
  border-radius: 8px;
  color: #92400e;
  font-size: 14px;
}

.lycee-error svg {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/CollegeCard.tsx src/components/CollegeCard.css
git commit -m "feat: update CollegeCard to display SectorResult with lycees by sector"
```

---

### Task 8: Update `SearchHistory.tsx` and `useSearchHistory.ts` for new type

**Files:**
- Modify: `src/components/SearchHistory.tsx`
- Modify: `src/hooks/useSearchHistory.ts`

- [ ] **Step 1: Update useSearchHistory hook to use StoredSearchHistory**

Replace `src/hooks/useSearchHistory.ts`:

```typescript
import { useState, useCallback, useEffect } from 'react';
import type { StoredSearchHistory } from '../services/storage';
import {
  getSearchHistory,
  clearHistory as clearStorageHistory,
  removeFromHistory as removeStorageEntry,
} from '../services/storage';

export function useSearchHistory() {
  const [history, setHistory] = useState<StoredSearchHistory[]>([]);

  useEffect(() => {
    setHistory(getSearchHistory());
  }, []);

  const refresh = useCallback(() => {
    setHistory(getSearchHistory());
  }, []);

  const clearHistory = useCallback(() => {
    clearStorageHistory();
    setHistory([]);
  }, []);

  const removeEntry = useCallback((id: string) => {
    removeStorageEntry(id);
    setHistory((prev) => prev.filter((h) => h.id !== id));
  }, []);

  return {
    history,
    refresh,
    clearHistory,
    removeEntry,
  };
}
```

- [ ] **Step 2: Update SearchHistory component to use StoredSearchHistory**

Replace `src/components/SearchHistory.tsx` import and props:

```tsx
import type { StoredSearchHistory } from '../services/storage';
import './SearchHistory.css';

interface SearchHistoryProps {
  history: StoredSearchHistory[];
  onSelectEntry: (entry: StoredSearchHistory) => void;
  onRemoveEntry: (id: string) => void;
  onClearHistory: () => void;
}
```

And change `entry.college` reference (line 54) to:

```tsx
{entry.result && (
  <div className="history-college">
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3z" />
    </svg>
    <span>{entry.result.college.nom}</span>
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/SearchHistory.tsx src/hooks/useSearchHistory.ts
git commit -m "feat: update SearchHistory component and hook for StoredSearchHistory type"
```

---

### Task 9: Update `App.tsx` — wire useSectorSearch + update footer

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Rewrite App.tsx**

Replace `src/App.tsx` entirely:

```typescript
import { useCallback } from 'react';
import type { Address } from './types';
import type { StoredSearchHistory } from './services/storage';
import { useSectorSearch } from './hooks/useSectorSearch';
import { useSearchHistory } from './hooks/useSearchHistory';
import {
  AddressInput,
  CollegeCard,
  SearchHistory,
  LoadingState,
  ErrorMessage,
} from './components';
import './App.css';

function App() {
  const { result, searchedAddress, isLoading, error, searchSector, showResult, reset } =
    useSectorSearch();
  const { history, refresh, clearHistory, removeEntry } = useSearchHistory();

  const handleAddressSelect = useCallback(
    (address: Address) => {
      searchSector(address);
    },
    [searchSector]
  );

  const handleHistorySelect = useCallback(
    (entry: StoredSearchHistory) => {
      showResult(entry.address, entry.result);
      refresh();
    },
    [showResult, refresh]
  );

  const handleNewSearch = useCallback(() => {
    reset();
    refresh();
  }, [reset, refresh]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
          </svg>
        </div>
        <h1>Mon College de Secteur</h1>
        <p className="subtitle">
          Trouvez le college public de votre secteur en fonction de votre adresse
        </p>
      </header>

      <main className="app-main">
        {!result && !isLoading && (
          <AddressInput onAddressSelect={handleAddressSelect} disabled={isLoading} />
        )}

        {isLoading && <LoadingState />}

        {error && !isLoading && !result && <ErrorMessage message={error} />}

        {result && searchedAddress && (
          <>
            <CollegeCard result={result} addressLabel={searchedAddress.label} />
            <button className="new-search-button" onClick={handleNewSearch}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              Nouvelle recherche
            </button>
          </>
        )}

        {!result && !isLoading && history.length > 0 && (
          <SearchHistory
            history={history}
            onSelectEntry={handleHistorySelect}
            onRemoveEntry={removeEntry}
            onClearHistory={clearHistory}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>
          Donnees fournies par{' '}
          <a
            href="https://capgeo2.paris.fr"
            target="_blank"
            rel="noopener noreferrer"
          >
            CapGeo Paris
          </a>
          {' '}et{' '}
          <a
            href="https://services9.arcgis.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Rectorat de Paris
          </a>
          {' '}via{' '}
          <a
            href="https://api-adresse.data.gouv.fr"
            target="_blank"
            rel="noopener noreferrer"
          >
            api-adresse.data.gouv.fr
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire App to useSectorSearch and update footer attribution"
```

---

### Task 10: Delete old files, clean up types, verify build

**Files:**
- Delete: `src/services/collegeApi.ts`
- Delete: `src/hooks/useCollegeSearch.ts`
- Modify: `src/types/index.ts`
- Modify: `src/services/storage.ts`
- Modify: `src/hooks/useSearchHistory.ts`
- Modify: `src/components/SearchHistory.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Delete old files**

```bash
rm src/services/collegeApi.ts src/hooks/useCollegeSearch.ts
```

- [ ] **Step 2: Clean up types/index.ts**

In `src/types/index.ts`:
- Remove the old `College` interface
- Remove the old `SearchHistory` interface
- Add the new `SearchHistory` type (same as `StoredSearchHistory`):

```typescript
export interface SearchHistory {
  id: string;
  address: Address;
  result: SectorResult;
  timestamp: number;
}
```

- [ ] **Step 3: Replace StoredSearchHistory with SearchHistory everywhere**

In `src/services/storage.ts`: remove the `StoredSearchHistory` export, import `SearchHistory` from `'../types'`, replace all `StoredSearchHistory` with `SearchHistory`.

In `src/hooks/useSearchHistory.ts`: change import from `import type { StoredSearchHistory } from '../services/storage'` to `import type { SearchHistory } from '../types'`, replace `StoredSearchHistory` with `SearchHistory`.

In `src/components/SearchHistory.tsx`: change import from `import type { StoredSearchHistory } from '../services/storage'` to `import type { SearchHistory as SearchHistoryType } from '../types'`, replace `StoredSearchHistory` with `SearchHistoryType`.

In `src/App.tsx`: change import from `import type { StoredSearchHistory } from './services/storage'` to `import type { SearchHistory as SearchHistoryType } from './types'`, replace `StoredSearchHistory` with `SearchHistoryType`.

- [ ] **Step 4: Verify TypeScript compiles cleanly**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Verify build succeeds**

Run: `npm run build`
Expected: Build completes successfully

- [ ] **Step 6: Verify lint passes**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 7: Verify all unit tests pass**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: remove old files and finalize type cleanup (College -> CollegeSecteur)"
```

---

### Task 11: Manual smoke test with dev server

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Test in browser**

Open the app and test with the 5 reference addresses:
1. "12 passage Saint-Ambroise" -> expect COLLEGE VOLTAIRE + 5 lycees secteur 1
2. "15 rue de Rivoli" -> expect FRANCOIS COUPERIN
3. "45 rue de Belleville" -> expect CHARLES PEGUY
4. "8 avenue de Suffren" -> expect GUILLAUME APOLLINAIRE
5. "120 boulevard de Menilmontant" -> expect COLETTE BESSON

Verify for each:
- College name and UAI displayed
- Lycees grouped by sector 1, 2, 3
- History entry saved and clickable (displays result instantly, no re-fetch)

- [ ] **Step 3: Test error cases**

- Clear localStorage and reload — should show empty state
- Test history persistence — search, reload, verify history appears

---

### Task 12: Install Playwright and write E2E tests

**Files:**
- Modify: `package.json`
- Create: `playwright.config.ts`
- Create: `tests/e2e/sector-search.spec.ts`

- [ ] **Step 1: Install Playwright**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Create Playwright config**

Create `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:4173',
  },
  webServer: {
    command: 'npm run preview',
    port: 4173,
    reuseExistingServer: true,
  },
});
```

- [ ] **Step 3: Add E2E test script to package.json**

Add to `scripts`: `"test:e2e": "playwright test"`

- [ ] **Step 4: Write E2E test**

Create `tests/e2e/sector-search.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

// Test data valid for 2025-2026 school year — update each year
const TEST_CASES = [
  {
    address: '12 passage Saint-Ambroise',
    college: 'VOLTAIRE',
    uai: '0752536Z',
    lyceesSecteur1: ['DORIAN', 'CHARLEMAGNE', 'COLBERT', 'TURGOT', 'VOLTAIRE'],
  },
  {
    address: '15 rue de Rivoli',
    college: 'FRANCOIS COUPERIN',
    uai: '0752693V',
    lyceesSecteur1: ['LAVOISIER', 'CHARLEMAGNE', 'S. WEIL', 'S. GERMAIN', 'VOLTAIRE'],
  },
  {
    address: '45 rue de Belleville',
    college: 'CHARLES PEGUY',
    uai: '0751706X',
    lyceesSecteur1: ['DIDEROT', 'BOUCHER', 'BERGSON', 'S. GERMAIN', 'LAMARTINE'],
  },
  {
    address: '8 avenue de Suffren',
    college: 'GUILLAUME APOLLINAIRE',
    uai: '0752190Y',
    lyceesSecteur1: ['J. DE SAILLY', 'J. DE LA FONTAINE', 'J.B. SAY', 'BUFFON', 'V. DURUY'],
  },
  {
    address: '120 boulevard de Menilmontant',
    college: 'COLETTE BESSON',
    uai: '0755241P',
    lyceesSecteur1: ['CHARLEMAGNE', 'COLBERT', 'BOUCHER', 'V. HUGO', 'VOLTAIRE'],
  },
];

for (const tc of TEST_CASES) {
  test(`finds sector schools for ${tc.address}`, async ({ page }) => {
    await page.goto('/');

    // Type address and wait for suggestions
    const input = page.locator('input[type="text"]');
    await input.fill(tc.address);
    await page.waitForTimeout(500); // debounce

    // Click first suggestion
    const suggestion = page.locator('.suggestion-item').first();
    await suggestion.waitFor({ timeout: 10000 });
    await suggestion.click();

    // Wait for college result
    const collegeName = page.locator('.college-title h2');
    await expect(collegeName).toContainText(tc.college, { timeout: 15000 });

    // Verify UAI
    await expect(page.locator('.college-card')).toContainText(tc.uai);

    // Verify lycees secteur 1
    const lyceeSection = page.locator('.lycees-section');
    await expect(lyceeSection).toBeVisible({ timeout: 15000 });

    for (const lyceeName of tc.lyceesSecteur1) {
      await expect(lyceeSection).toContainText(lyceeName);
    }
  });
}

test('displays error for search failure', async ({ page }) => {
  await page.goto('/');

  // Mock API to return empty
  await page.route('**/capgeo2.paris.fr/**', (route) =>
    route.fulfill({ body: JSON.stringify({ features: [] }), contentType: 'application/json' })
  );

  const input = page.locator('input[type="text"]');
  await input.fill('12 passage Saint-Ambroise');
  await page.waitForTimeout(500);

  const suggestion = page.locator('.suggestion-item').first();
  await suggestion.waitFor({ timeout: 10000 });
  await suggestion.click();

  // Should show error
  await expect(page.locator('.error-message')).toBeVisible({ timeout: 15000 });
});

test('history displays and restores results', async ({ page }) => {
  await page.goto('/');

  // Search for an address
  const input = page.locator('input[type="text"]');
  await input.fill('12 passage Saint-Ambroise');
  await page.waitForTimeout(500);
  const suggestion = page.locator('.suggestion-item').first();
  await suggestion.waitFor({ timeout: 10000 });
  await suggestion.click();

  // Wait for result
  await expect(page.locator('.college-title h2')).toContainText('VOLTAIRE', { timeout: 15000 });

  // Go back to search
  await page.locator('.new-search-button').click();

  // History should appear
  const historyItem = page.locator('.history-content').first();
  await expect(historyItem).toBeVisible();
  await expect(historyItem).toContainText('VOLTAIRE');

  // Click history entry — should show result immediately
  await historyItem.click();
  await expect(page.locator('.college-title h2')).toContainText('VOLTAIRE');
});
```

- [ ] **Step 5: Build the app first**

Run: `npm run build`

- [ ] **Step 6: Run E2E tests**

Run: `npm run test:e2e`
Expected: All tests pass (these hit real APIs, ensure network access)

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json playwright.config.ts tests/
git commit -m "test: add Playwright E2E tests for sector search pipeline"
```
