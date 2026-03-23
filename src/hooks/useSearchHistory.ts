import { useState, useCallback, useEffect } from 'react';
import type { SearchHistory } from '../types';
import {
  getSearchHistory,
  clearHistory as clearStorageHistory,
  removeFromHistory as removeStorageEntry,
} from '../services/storage';

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistory[]>([]);

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
