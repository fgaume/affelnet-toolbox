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
