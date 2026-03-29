# REQ4 — Collège de scolarisation & Bonus IPS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to find their sector college by name (not just address) and indicate their actual enrollment college to see its IPS bonus for Affelnet.

**Architecture:** New `CollegeAutocomplete` component reused in two contexts (top-level tab input + scolarisation question in CollegeCard). New `collegeApi` service fetches the full Paris college list once at startup. IPS data fetched on demand from Hugging Face dataset. Horizontal gauge built with Recharts `BarChart`.

**Tech Stack:** React 19, TypeScript, Recharts (BarChart for gauge), Vite

---

### Task 1: Add `College` type and IPS constants

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add College and IpsInfo interfaces to types**

Add at the end of `src/types/index.ts`:

```typescript
export interface College {
  uai: string;
  nom: string;
}

export interface IpsInfo {
  ips: number;
  bonus: number;
}
```

- [ ] **Step 2: Create IPS constants file**

Create `src/services/ipsConstants.ts`:

```typescript
/** Seuils IPS Affelnet 2026 — evaluated in order, first match wins */
export const IPS_THRESHOLDS = [
  { maxIps: 106.7, bonus: 1200, label: 'Moyenne nationale public/privé' },
  { maxIps: 117.1, bonus: 800, label: 'Moyenne académique collèges publics' },
  { maxIps: 129.8, bonus: 400, label: 'Moyenne académique publics et privés' },
] as const;

export const IPS_DEFAULT_BONUS = 0;

export function computeIpsBonus(ips: number): number {
  for (const threshold of IPS_THRESHOLDS) {
    if (ips < threshold.maxIps) {
      return threshold.bonus;
    }
  }
  return IPS_DEFAULT_BONUS;
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/services/ipsConstants.ts
git commit -m "feat(REQ4): add College type and IPS bonus constants/computation"
```

---

### Task 2: Create `collegeApi` service

**Files:**
- Create: `src/services/collegeApi.ts`
- Test: `src/services/__tests__/collegeApi.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/services/__tests__/collegeApi.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCollegeList, fetchCollegeIps } from '../collegeApi';

describe('collegeApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchCollegeList', () => {
    it('returns deduplicated colleges from API', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { uai: '0750490A', nom: 'CONDORCET' },
          { uai: '0750524M', nom: 'COURTELINE' },
          { uai: '0750490A', nom: 'CONDORCET' }, // duplicate
        ],
      } as Response);

      const result = await fetchCollegeList();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ uai: '0750490A', nom: 'CONDORCET' });
      expect(result[1]).toEqual({ uai: '0750524M', nom: 'COURTELINE' });
    });

    it('throws on network error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      await expect(fetchCollegeList()).rejects.toThrow('Impossible de charger la liste des collèges');
    });
  });

  describe('fetchCollegeIps', () => {
    it('returns IPS info for a college UAI', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { Identifiant: '0750490A', Nom: 'CLG CONDORCET', Secteur: 'Public', IPS_2026: 126.3, Bonus_IPS_2026: 800 },
          { Identifiant: '0750524M', Nom: 'CLG COURTELINE', Secteur: 'Public', IPS_2026: 98.2, Bonus_IPS_2026: 1200 },
        ],
      } as Response);

      const result = await fetchCollegeIps('0750490A');
      expect(result).toEqual({ ips: 126.3, bonus: 800 });
    });

    it('falls back to previous year if current year has no data', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { Identifiant: '0750490A', Nom: 'CLG CONDORCET', Secteur: 'Public', IPS_2025: 125.0, Bonus_IPS_2025: 800 },
        ],
      } as Response);

      const result = await fetchCollegeIps('0750490A');
      expect(result).toEqual({ ips: 125.0, bonus: 800 });
    });

    it('returns null if college not found', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      const result = await fetchCollegeIps('UNKNOWN');
      expect(result).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/services/__tests__/collegeApi.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement collegeApi service**

Create `src/services/collegeApi.ts`:

```typescript
import type { College, IpsInfo } from '../types';

const COLLEGE_LIST_URL =
  'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-college-effectifs-niveau-sexe-lv/exports/json/' +
  '?lang=fr' +
  '&select=%60numero_college%60+as+uai%2C+%60patronyme%60+as+nom' +
  '&timezone=Europe%2FParis' +
  '&where=%28%28%60code_aca%60+%3D+%2201%22%29%29' +
  '+AND+%28%28%60rentree_scolaire%60+%3D+%22YEAR%22%29%29' +
  '+AND+%28%28%60secteur%60+%3D+%22PUBLIC%22%29%29' +
  '+AND+%28%28%60denomination_principale%60+%3D+%22COLLEGE%22%29%29';

const IPS_DATASET_URL =
  'https://huggingface.co/datasets/fgaume/affelnet-paris-bonus-ips-colleges/raw/main/affelnet-paris-bonus-ips-colleges.json';

const CURRENT_YEAR = new Date().getFullYear();

/** Fetch full list of public Paris colleges. Tries current year first, then previous. */
export async function fetchCollegeList(): Promise<College[]> {
  for (const year of [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2]) {
    const url = COLLEGE_LIST_URL.replace('YEAR', String(year));
    const resp = await fetch(url);
    if (!resp.ok) continue;
    const data: College[] = await resp.json();
    if (data.length > 0) {
      // Deduplicate by UAI
      const seen = new Set<string>();
      return data.filter((c) => {
        if (seen.has(c.uai)) return false;
        seen.add(c.uai);
        return true;
      });
    }
  }
  throw new Error('Impossible de charger la liste des collèges');
}

interface IpsRawEntry {
  Identifiant: string;
  [key: string]: string | number | null;
}

let ipsCache: IpsRawEntry[] | null = null;

async function loadIpsData(): Promise<IpsRawEntry[]> {
  if (ipsCache) return ipsCache;
  const resp = await fetch(IPS_DATASET_URL);
  if (!resp.ok) throw new Error('Impossible de charger les données IPS');
  ipsCache = await resp.json();
  return ipsCache!;
}

/** Fetch IPS + bonus for a given college UAI. Returns null if not found. */
export async function fetchCollegeIps(uai: string): Promise<IpsInfo | null> {
  const data = await loadIpsData();
  const entry = data.find((e) => e.Identifiant === uai);
  if (!entry) return null;

  // Try most recent year first (2026, 2025, 2024...)
  for (let year = CURRENT_YEAR; year >= 2021; year--) {
    const ipsKey = `IPS_${year}`;
    const bonusKey = `Bonus_IPS_${year}`;
    const ips = entry[ipsKey];
    const bonus = entry[bonusKey];
    if (ips != null && typeof ips === 'number') {
      return {
        ips,
        bonus: typeof bonus === 'number' ? bonus : 0,
      };
    }
  }
  return null;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/services/__tests__/collegeApi.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/collegeApi.ts src/services/__tests__/collegeApi.test.ts
git commit -m "feat(REQ4): add collegeApi service for college list and IPS data"
```

---

### Task 3: Create `useCollegeSearch` hook

**Files:**
- Create: `src/hooks/useCollegeSearch.ts`

- [ ] **Step 1: Create the hook**

Create `src/hooks/useCollegeSearch.ts`:

```typescript
import { useState, useCallback, useEffect, useRef } from 'react';
import type { College } from '../types';
import { fetchCollegeList } from '../services/collegeApi';

export function useCollegeSearch() {
  const [allColleges, setAllColleges] = useState<College[]>([]);
  const [suggestions, setSuggestions] = useState<College[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  // Load college list once on mount
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setIsLoading(true);
    fetchCollegeList()
      .then(setAllColleges)
      .catch(() => setError('Impossible de charger la liste des collèges'))
      .finally(() => setIsLoading(false));
  }, []);

  const search = useCallback(
    (query: string) => {
      if (!query || query.length < 2) {
        setSuggestions([]);
        return;
      }
      const normalized = query.toLowerCase();
      const matches = allColleges
        .filter((c) => c.nom.toLowerCase().includes(normalized))
        .slice(0, 8);
      setSuggestions(matches);
    },
    [allColleges]
  );

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    allColleges,
    isLoading,
    error,
    search,
    clearSuggestions,
  };
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors (hook is not yet used, tree-shaking is fine)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCollegeSearch.ts
git commit -m "feat(REQ4): add useCollegeSearch hook with local filtering"
```

---

### Task 4: Create `CollegeAutocomplete` component

**Files:**
- Create: `src/components/CollegeAutocomplete.tsx`
- Create: `src/components/CollegeAutocomplete.css`
- Modify: `src/components/index.ts`

- [ ] **Step 1: Create the CSS**

Create `src/components/CollegeAutocomplete.css`:

```css
.college-autocomplete-container {
  position: relative;
  width: 100%;
}

.college-autocomplete-container .input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.college-autocomplete-container .school-icon {
  position: absolute;
  left: 16px;
  width: 20px;
  height: 20px;
  color: var(--color-text-muted);
  pointer-events: none;
}

.college-autocomplete-container .college-input {
  width: 100%;
  padding: 16px 48px;
  font-size: 16px;
  border: 2px solid var(--color-border);
  border-radius: 12px;
  background-color: var(--color-bg-input);
  color: var(--color-text-primary);
  transition: border-color 0.2s, box-shadow 0.2s, background-color 0.3s ease;
}

.college-autocomplete-container .college-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.college-autocomplete-container .college-input::placeholder {
  color: var(--color-text-faint);
}

.college-autocomplete-container .clear-button {
  position: absolute;
  right: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted);
  transition: color 0.2s;
}

.college-autocomplete-container .clear-button:hover {
  color: var(--color-text-secondary);
}

.college-autocomplete-container .clear-button svg {
  width: 18px;
  height: 18px;
}

.college-autocomplete-container .suggestions-list {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  margin: 0;
  padding: 8px 0;
  list-style: none;
  background-color: var(--color-bg-card);
  border-radius: 12px;
  box-shadow: 0 4px 20px var(--color-shadow-lg);
  z-index: 100;
  max-height: 300px;
  overflow-y: auto;
}

.college-autocomplete-container .suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  font-size: 15px;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: background-color 0.15s;
}

.college-autocomplete-container .suggestion-item:hover {
  background-color: var(--color-bg-hover);
}

.college-autocomplete-container .suggestion-item span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.college-autocomplete-container .loading-text {
  padding: 12px 16px;
  font-size: 14px;
  color: var(--color-text-muted);
  text-align: center;
}

@media (max-width: 480px) {
  .college-autocomplete-container .college-input {
    padding: 14px 44px;
    font-size: 16px;
  }

  .college-autocomplete-container .school-icon {
    left: 14px;
    width: 18px;
    height: 18px;
  }

  .college-autocomplete-container .clear-button {
    right: 14px;
  }
}
```

- [ ] **Step 2: Create the component**

Create `src/components/CollegeAutocomplete.tsx`:

```typescript
import { useState, useRef, useEffect } from 'react';
import type { College } from '../types';
import { useCollegeSearch } from '../hooks/useCollegeSearch';
import './CollegeAutocomplete.css';

interface CollegeAutocompleteProps {
  onSelect: (college: College) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CollegeAutocomplete({ onSelect, placeholder, disabled }: CollegeAutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { suggestions, isLoading, error, search, clearSuggestions } = useCollegeSearch();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    search(value);
    setShowSuggestions(true);
  };

  const handleCollegeClick = (college: College) => {
    setInputValue(college.nom);
    setShowSuggestions(false);
    clearSuggestions();
    onSelect(college);
  };

  const handleClear = () => {
    setInputValue('');
    clearSuggestions();
    setShowSuggestions(false);
  };

  return (
    <div className="college-autocomplete-container" ref={containerRef}>
      <div className="input-wrapper">
        <svg className="school-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
        </svg>
        <input
          type="text"
          className="college-input"
          placeholder={placeholder ?? 'Nom de votre collège...'}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          disabled={disabled}
          autoComplete="off"
        />
        {inputValue && (
          <button className="clear-button" onClick={handleClear} type="button" aria-label="Effacer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isLoading && (
        <div className="suggestions-list">
          <div className="loading-text">Chargement des collèges...</div>
        </div>
      )}

      {error && (
        <div className="suggestions-list">
          <div className="loading-text">{error}</div>
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <ul className="suggestions-list">
          {suggestions.map((college) => (
            <li key={college.uai}>
              <button
                className="suggestion-item"
                onClick={() => handleCollegeClick(college)}
                type="button"
              >
                <svg className="school-icon" viewBox="0 0 24 24" fill="currentColor" style={{ position: 'static', color: 'var(--color-primary)' }}>
                  <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
                </svg>
                <span>{college.nom}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Export from barrel**

Add to `src/components/index.ts`:

```typescript
export { CollegeAutocomplete } from './CollegeAutocomplete';
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/CollegeAutocomplete.tsx src/components/CollegeAutocomplete.css src/components/index.ts
git commit -m "feat(REQ4): add CollegeAutocomplete reusable component"
```

---

### Task 5: Add `searchByCollege` to `useSectorSearch`

**Files:**
- Modify: `src/hooks/useSectorSearch.ts`

- [ ] **Step 1: Add searchByCollege callback**

In `src/hooks/useSectorSearch.ts`, add the import for `College` type and a new callback. Replace the entire file with:

```typescript
import { useState, useCallback } from 'react';
import type { Address, College, SectorResult } from '../types';
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
      const [lon, lat] = address.coordinates;
      const collegeName = await findCollegeDeSecteur(lat, lon);
      const { uai: collegeUAI, coordinates: collegeCoordinates } = await findCollegeUAI(collegeName);

      let lycees = null;
      let lyceeError: string | undefined;
      try {
        lycees = await findLyceesDeSecteur(collegeUAI);
      } catch (e) {
        lyceeError = e instanceof Error ? e.message : 'Lycées de secteur non disponibles';
      }

      const sectorResult: SectorResult = {
        college: {
          nom: collegeName,
          uai: collegeUAI,
          coordinates: collegeCoordinates,
        },
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

  const searchByCollege = useCallback(async (college: College) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setSearchedAddress(null);

    try {
      let lycees = null;
      let lyceeError: string | undefined;
      try {
        lycees = await findLyceesDeSecteur(college.uai);
      } catch (e) {
        lyceeError = e instanceof Error ? e.message : 'Lycées de secteur non disponibles';
      }

      const sectorResult: SectorResult = {
        college: {
          nom: college.nom,
          uai: college.uai,
        },
        lycees,
        lyceeError,
      };

      setResult(sectorResult);
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
    searchByCollege,
    showResult,
    reset,
  };
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSectorSearch.ts
git commit -m "feat(REQ4): add searchByCollege to useSectorSearch hook"
```

---

### Task 6: Add tabs to `App.tsx`

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Update App.tsx with tabs**

Replace the content of `src/App.tsx`:

```typescript
import { useState, useCallback } from 'react';
import type { Address, College, SearchHistory as SearchHistoryType } from './types';
import { useSectorSearch } from './hooks/useSectorSearch';
import { useSearchHistory } from './hooks/useSearchHistory';
import { useTheme } from './hooks/useTheme';
import {
  AddressInput,
  CollegeAutocomplete,
  CollegeCard,
  SearchHistory,
  LoadingState,
  ErrorMessage,
  ThemeToggle,
} from './components';
import './App.css';

type InputMode = 'address' | 'college';

function App() {
  const { result, searchedAddress, isLoading, error, searchSector, searchByCollege, showResult, reset } =
    useSectorSearch();
  const { history, refresh, clearHistory, removeEntry } = useSearchHistory();
  const { mode, setMode } = useTheme();
  const [inputMode, setInputMode] = useState<InputMode>('address');

  const handleAddressSelect = useCallback(
    (address: Address) => {
      searchSector(address);
    },
    [searchSector]
  );

  const handleCollegeSelect = useCallback(
    (college: College) => {
      searchByCollege(college);
    },
    [searchByCollege]
  );

  const handleHistorySelect = useCallback(
    (entry: SearchHistoryType) => {
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
        <ThemeToggle mode={mode} onToggle={setMode} />
        <div className="logo">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
          </svg>
        </div>
        <h1>Mon Collège de Secteur</h1>
        <p className="subtitle">
          Trouvez le collège public de votre secteur en fonction de votre adresse
        </p>
      </header>

      <main className="app-main">
        {!result && !isLoading && (
          <>
            <div className="input-tabs">
              <button
                className={`input-tab${inputMode === 'address' ? ' active' : ''}`}
                onClick={() => setInputMode('address')}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                Par adresse
              </button>
              <button
                className={`input-tab${inputMode === 'college' ? ' active' : ''}`}
                onClick={() => setInputMode('college')}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
                </svg>
                Par collège
              </button>
            </div>

            {inputMode === 'address' && (
              <AddressInput onAddressSelect={handleAddressSelect} disabled={isLoading} />
            )}
            {inputMode === 'college' && (
              <CollegeAutocomplete
                onSelect={handleCollegeSelect}
                placeholder="Nom de votre collège de secteur..."
                disabled={isLoading}
              />
            )}
          </>
        )}

        {isLoading && <LoadingState />}

        {error && !isLoading && !result && <ErrorMessage message={error} />}

        {result && (
          <>
            <CollegeCard result={result} address={searchedAddress ?? undefined} />
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

Note: The `CollegeCard` render condition changed from `result && searchedAddress` to just `result` since address is now optional (college direct input has no address).

- [ ] **Step 2: Add tab styles to App.css**

Add at the end of `src/App.css` (before the media query block):

```css
.input-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  width: 100%;
  max-width: 1000px;
}

.input-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-muted);
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.input-tab:hover {
  color: var(--color-text-secondary);
}

.input-tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.input-tab svg {
  width: 16px;
  height: 16px;
}
```

- [ ] **Step 3: Verify dev server**

Run: `npm run dev`
Open the app in browser. Verify:
- Two tabs visible ("Par adresse" / "Par collège")
- "Par adresse" tab works as before
- "Par collège" tab shows the CollegeAutocomplete component
- Selecting a college triggers the search and shows CollegeCard

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/App.css
git commit -m "feat(REQ4): add input tabs for address/college search modes"
```

---

### Task 7: Create `IpsGauge` component

**Files:**
- Create: `src/components/IpsGauge.tsx`
- Create: `src/components/IpsGauge.css`
- Modify: `src/components/index.ts`

- [ ] **Step 1: Create the CSS**

Create `src/components/IpsGauge.css`:

```css
.ips-gauge {
  width: 100%;
  max-width: 340px;
  margin: 0 auto;
}

.ips-gauge-title {
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--color-text-muted);
  text-align: center;
}

.ips-gauge-bar-container {
  position: relative;
}

.ips-gauge-marker {
  position: absolute;
  top: 0;
  width: 3px;
  height: 34px;
  background: var(--color-text-primary);
  border-radius: 2px;
  transform: translateX(-50%);
  z-index: 1;
}

.ips-gauge-labels {
  position: relative;
  height: 36px;
}

.ips-gauge-college-label {
  position: absolute;
  transform: translateX(-50%);
  text-align: center;
}

.ips-gauge-triangle {
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 10px solid var(--color-text-primary);
  margin: 0 auto;
}

.ips-gauge-value {
  font-weight: 700;
  font-size: 13px;
  color: var(--color-text-primary);
  margin-top: 2px;
}

.ips-gauge-threshold {
  position: absolute;
  font-size: 10px;
  color: var(--color-text-muted);
  transform: translateX(-50%);
}

@media (max-width: 480px) {
  .ips-gauge {
    max-width: 280px;
  }
}
```

- [ ] **Step 2: Create the component**

Create `src/components/IpsGauge.tsx`:

```typescript
import { BarChart, Bar, XAxis, YAxis, Cell, ReferenceLine, ResponsiveContainer } from 'recharts';
import { IPS_THRESHOLDS, IPS_DEFAULT_BONUS } from '../services/ipsConstants';
import './IpsGauge.css';

interface IpsGaugeProps {
  ips: number;
}

const IPS_MIN = 60;
const IPS_MAX = 160;
const IPS_RANGE = IPS_MAX - IPS_MIN;

const SEGMENTS = [
  { from: IPS_MIN, to: IPS_THRESHOLDS[0].maxIps, bonus: IPS_THRESHOLDS[0].bonus, color: '#166534' },
  { from: IPS_THRESHOLDS[0].maxIps, to: IPS_THRESHOLDS[1].maxIps, bonus: IPS_THRESHOLDS[1].bonus, color: '#22c55e' },
  { from: IPS_THRESHOLDS[1].maxIps, to: IPS_THRESHOLDS[2].maxIps, bonus: IPS_THRESHOLDS[2].bonus, color: '#eab308' },
  { from: IPS_THRESHOLDS[2].maxIps, to: IPS_MAX, bonus: IPS_DEFAULT_BONUS, color: '#ef4444' },
];

function ipsToPercent(ips: number): number {
  return Math.max(0, Math.min(100, ((ips - IPS_MIN) / IPS_RANGE) * 100));
}

export function IpsGauge({ ips }: IpsGaugeProps) {
  const markerPercent = ipsToPercent(ips);
  const thresholdPercents = IPS_THRESHOLDS.map((t) => ipsToPercent(t.maxIps));

  // Find the vertical position for the IPS value label (same top as thresholds)
  const valueTop = 12;

  return (
    <div className="ips-gauge">
      <p className="ips-gauge-title">Position IPS par rapport aux seuils de bonus</p>

      <div className="ips-gauge-bar-container">
        {/* Gauge bar */}
        <div style={{ height: 34, display: 'flex', borderRadius: 8, overflow: 'hidden', fontSize: 12, fontWeight: 700, color: 'white' }}>
          {SEGMENTS.map((seg) => (
            <div
              key={seg.bonus}
              style={{
                flex: seg.to - seg.from,
                background: seg.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: seg.color === '#eab308' ? '#422006' : 'white',
              }}
            >
              {seg.bonus}
            </div>
          ))}
        </div>

        {/* Vertical marker */}
        <div className="ips-gauge-marker" style={{ left: `${markerPercent}%` }} />
      </div>

      {/* Labels below the gauge */}
      <div className="ips-gauge-labels">
        {/* College IPS marker: triangle + value */}
        <div className="ips-gauge-college-label" style={{ left: `${markerPercent}%` }}>
          <div className="ips-gauge-triangle" />
          <div className="ips-gauge-value">{ips.toFixed(1).replace('.', ',')}</div>
        </div>

        {/* Threshold values */}
        {IPS_THRESHOLDS.map((t, i) => (
          <span
            key={t.maxIps}
            className="ips-gauge-threshold"
            style={{ left: `${thresholdPercents[i]}%`, top: valueTop }}
          >
            {t.maxIps.toFixed(1).replace('.', ',')}
          </span>
        ))}
      </div>
    </div>
  );
}
```

Note: This implementation uses pure CSS/HTML for the gauge rather than Recharts `BarChart`, as it produces a cleaner result for this specific visualization. Recharts is still in the project for the other charts.

- [ ] **Step 3: Export from barrel**

Add to `src/components/index.ts`:

```typescript
export { IpsGauge } from './IpsGauge';
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/IpsGauge.tsx src/components/IpsGauge.css src/components/index.ts
git commit -m "feat(REQ4): add IpsGauge horizontal gauge component"
```

---

### Task 8: Add scolarisation question to `CollegeCard`

**Files:**
- Modify: `src/components/CollegeCard.tsx`
- Modify: `src/components/CollegeCard.css`

- [ ] **Step 1: Add state and IPS fetch logic to CollegeCard**

In `src/components/CollegeCard.tsx`, add new imports at the top:

```typescript
import type { SectorResult, LyceeSecteur, Address, College, IpsInfo } from '../types';
import { fetchCollegeIps } from '../services/collegeApi';
import { computeIpsBonus } from '../services/ipsConstants';
import { CollegeAutocomplete } from './CollegeAutocomplete';
import { IpsGauge } from './IpsGauge';
```

After line 36 (`const [expandedLycee, setExpandedLycee] = useState<string | null>(null);`), add new state:

```typescript
  const [scolarisation, setScolarisation] = useState<'pending' | 'same' | 'other'>('pending');
  const [collegeScolarisation, setCollegeScolarisation] = useState<College | null>(null);
  const [ipsInfo, setIpsInfo] = useState<IpsInfo | null>(null);
  const [ipsLoading, setIpsLoading] = useState(false);
  const [ipsError, setIpsError] = useState<string | null>(null);
```

Add a new `useEffect` to fetch IPS when scolarisation is resolved:

```typescript
  // Fetch IPS when scolarisation college is determined
  useEffect(() => {
    const targetUai =
      scolarisation === 'same' ? college.uai
      : scolarisation === 'other' && collegeScolarisation ? collegeScolarisation.uai
      : null;

    if (!targetUai) {
      setIpsInfo(null);
      return;
    }

    setIpsLoading(true);
    setIpsError(null);
    fetchCollegeIps(targetUai)
      .then((info) => {
        setIpsInfo(info);
        if (!info) setIpsError('Données IPS non disponibles pour ce collège');
      })
      .catch(() => setIpsError('Erreur lors du chargement des données IPS'))
      .finally(() => setIpsLoading(false));
  }, [scolarisation, collegeScolarisation, college.uai]);
```

Add handler functions:

```typescript
  const handleScolarisationSame = () => {
    setScolarisation('same');
    setCollegeScolarisation(null);
  };

  const handleScolarisationOther = () => {
    setScolarisation('other');
    setIpsInfo(null);
  };

  const handleCollegeScolarisationSelect = (c: College) => {
    setCollegeScolarisation(c);
  };
```

- [ ] **Step 2: Add scolarisation UI to the JSX**

In the `return` block of `CollegeCard`, after the `address-searched` div (after line 134), insert the scolarisation section:

```tsx
      {/* Scolarisation question */}
      <div className="scolarisation-section">
        {scolarisation === 'pending' && (
          <div className="scolarisation-question">
            <p className="scolarisation-label">Êtes-vous scolarisé(e) dans ce collège ?</p>
            <div className="scolarisation-buttons">
              <button className="scolarisation-btn scolarisation-btn-yes" onClick={handleScolarisationSame}>
                Oui
              </button>
              <button className="scolarisation-btn scolarisation-btn-no" onClick={handleScolarisationOther}>
                Non
              </button>
            </div>
          </div>
        )}

        {scolarisation === 'same' && (
          <div className="scolarisation-result">
            <span className="scolarisation-badge">Secteur · Scolarisation</span>
            <button className="scolarisation-change" onClick={() => setScolarisation('pending')}>
              Modifier
            </button>
          </div>
        )}

        {scolarisation === 'other' && (
          <div className="scolarisation-other">
            <p className="scolarisation-other-label">Collège de scolarisation</p>
            <CollegeAutocomplete
              onSelect={handleCollegeScolarisationSelect}
              placeholder="Nom de votre collège de scolarisation..."
            />
            {collegeScolarisation && (
              <div className="scolarisation-result" style={{ marginTop: 8 }}>
                <span className="scolarisation-badge scolarisation-badge-other">{collegeScolarisation.nom}</span>
                <button className="scolarisation-change" onClick={() => setScolarisation('pending')}>
                  Modifier
                </button>
              </div>
            )}
          </div>
        )}

        {/* IPS display */}
        {ipsLoading && <p className="ips-loading">Chargement des données IPS...</p>}
        {ipsError && <p className="ips-error">{ipsError}</p>}
        {ipsInfo && (
          <div className="ips-block">
            <div className="ips-summary">
              <div className="ips-value-block">
                <span className="ips-label">IPS du collège</span>
                <span className="ips-number">{ipsInfo.ips.toFixed(1).replace('.', ',')}</span>
              </div>
              <div className="ips-value-block">
                <span className="ips-label">Bonus IPS Affelnet</span>
                <span className="ips-number">{ipsInfo.bonus} pts</span>
              </div>
            </div>
            <IpsGauge ips={ipsInfo.ips} />
          </div>
        )}
      </div>
```

- [ ] **Step 3: Add scolarisation CSS**

Add at the end of `src/components/CollegeCard.css`:

```css
/* Scolarisation section */
.scolarisation-section {
  margin: 16px 0;
}

.scolarisation-question {
  background: var(--color-info-bg);
  border: 1px solid var(--color-info-border);
  border-radius: 12px;
  padding: 16px;
}

.scolarisation-label {
  margin: 0 0 12px;
  font-weight: 600;
  color: var(--color-primary);
}

.scolarisation-buttons {
  display: flex;
  gap: 10px;
}

.scolarisation-btn {
  padding: 8px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;
}

.scolarisation-btn-yes {
  background: var(--color-primary);
  color: white;
  border: 2px solid var(--color-primary);
}

.scolarisation-btn-yes:hover {
  opacity: 0.9;
}

.scolarisation-btn-no {
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  border: 2px solid var(--color-border);
}

.scolarisation-btn-no:hover {
  border-color: var(--color-text-muted);
}

.scolarisation-result {
  display: flex;
  align-items: center;
  gap: 12px;
}

.scolarisation-badge {
  display: inline-block;
  background: #dbeafe;
  color: #1e40af;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.scolarisation-badge-other {
  background: #fef9c3;
  color: #92400e;
}

.scolarisation-change {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: 13px;
  cursor: pointer;
  text-decoration: underline;
}

.scolarisation-other {
  background: #fefce8;
  border: 1px solid #fde68a;
  border-radius: 12px;
  padding: 16px;
}

.scolarisation-other-label {
  margin: 0 0 8px;
  font-weight: 600;
  color: #92400e;
}

/* IPS block */
.ips-block {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 12px;
  padding: 16px;
  margin-top: 12px;
}

.ips-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.ips-value-block {
  display: flex;
  flex-direction: column;
}

.ips-label {
  font-size: 13px;
  color: #166534;
  font-weight: 600;
}

.ips-number {
  font-size: 28px;
  font-weight: 700;
  color: #15803d;
  margin-top: 4px;
}

.ips-loading {
  font-size: 13px;
  color: var(--color-text-muted);
  margin: 12px 0;
}

.ips-error {
  font-size: 13px;
  color: #dc2626;
  margin: 12px 0;
}
```

- [ ] **Step 4: Verify in dev server**

Run: `npm run dev`
Open the app, search for an address. Verify:
- Scolarisation question appears below the college name
- "Oui" → badge appears + IPS block with gauge loads
- "Non" → yellow input appears, selecting a college loads its IPS
- "Modifier" link resets the question

- [ ] **Step 5: Commit**

```bash
git add src/components/CollegeCard.tsx src/components/CollegeCard.css
git commit -m "feat(REQ4): add scolarisation question and IPS display in CollegeCard"
```

---

### Task 9: Make SectorMap work without address

**Files:**
- Modify: `src/components/SectorMap.tsx`
- Modify: `src/components/CollegeCard.tsx`

- [ ] **Step 1: Make homeCoords optional in SectorMap**

In `src/components/SectorMap.tsx`, change the props interface:

```typescript
interface SectorMapProps {
  homeCoords?: [number, number];
  college: CollegeSecteur;
  lyceesSecteur1: LyceeSecteur[];
  lyceesTousSecteurs: LyceeSecteur[];
}
```

Adjust the map logic to use `college.coordinates` as fallback center when `homeCoords` is undefined. Only render the home marker when `homeCoords` is provided.

- [ ] **Step 2: Update CollegeCard to always render SectorMap**

In `src/components/CollegeCard.tsx`, change the SectorMap rendering from:

```tsx
{address && (
  <SectorMap
    homeCoords={address.coordinates}
    college={college}
    lyceesSecteur1={lyceesSecteur1}
    lyceesTousSecteurs={TOUS_SECTEURS_LYCEES}
  />
)}
```

to:

```tsx
<SectorMap
  homeCoords={address?.coordinates}
  college={college}
  lyceesSecteur1={lyceesSecteur1}
  lyceesTousSecteurs={TOUS_SECTEURS_LYCEES}
/>
```

- [ ] **Step 3: Verify both modes in dev server**

Run: `npm run dev`
- Search by address → map shows home + college + lycees
- Search by college → map shows college + lycees (no home marker)

- [ ] **Step 4: Commit**

```bash
git add src/components/SectorMap.tsx src/components/CollegeCard.tsx
git commit -m "feat(REQ4): make SectorMap work without address (college direct mode)"
```

---

### Task 10: Run react-doctor and final verification

**Files:** None (verification only)

- [ ] **Step 1: Run react-doctor**

Run: `npx -y react-doctor@latest .`
Expected: No critical issues. Fix any warnings found.

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Run existing tests**

Run: `npm test`
Expected: All existing tests pass

- [ ] **Step 4: Manual E2E verification**

Open the app with `npm run dev` and verify:
1. **Tab "Par adresse"** works exactly as before
2. **Tab "Par collège"**: type "Cond" → see "CONDORCET" in suggestions → select → CollegeCard appears with lycees
3. **Scolarisation "Oui"**: click Oui → badge + IPS block with green gauge appears
4. **Scolarisation "Non"**: click Non → yellow input → type college name → select → IPS block appears
5. **"Modifier"** link resets the scolarisation choice
6. **Map without address**: when using "Par collège" tab, map shows college as center point (no home marker)
7. **Mobile responsive**: check on narrow viewport

- [ ] **Step 5: Commit any fixes**

If react-doctor or testing revealed issues, commit fixes:

```bash
git add -A
git commit -m "fix(REQ4): address react-doctor and verification findings"
```
