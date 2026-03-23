import type { SearchHistory } from '../types';

const STORAGE_KEY = 'college-secteur-history';

export function getSearchHistory(): SearchHistory[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveSearchHistory(history: SearchHistory[]): void {
  try {
    // Garder uniquement les 10 dernières recherches
    const limitedHistory = history.slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedHistory));
  } catch (error) {
    console.error('Erreur sauvegarde historique:', error);
  }
}

export function addToHistory(entry: Omit<SearchHistory, 'id' | 'timestamp'>): SearchHistory {
  const history = getSearchHistory();
  const newEntry: SearchHistory = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };

  // Éviter les doublons basés sur l'adresse
  const filteredHistory = history.filter(
    (h) => h.address.label !== entry.address.label
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
