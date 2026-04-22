import { useState, useCallback, useEffect, useRef } from 'react';
import type { College } from '../types';
import { fetchCollegeList, fetchAllColleges } from '../services/collegeApi';

interface UseCollegeSearchOptions {
  includePrivate?: boolean;
}

export function useCollegeSearch({ includePrivate = false }: UseCollegeSearchOptions = {}) {
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
    const loader = includePrivate ? fetchAllColleges : fetchCollegeList;
    loader()
      .then(setAllColleges)
      .catch(() => setError('Impossible de charger la liste des collèges'))
      .finally(() => setIsLoading(false));
  }, [includePrivate]);

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
