import { useState, useCallback, useEffect } from 'react';
import {
  getSecteur1LyceeCatalog,
  matchCollegesByLycees,
  type LyceeRef,
  type ReverseLookupResult,
} from '../services/collegeReverseLookup';

const EMPTY: ReverseLookupResult = { candidates: [], containment: true, ambiguous: false };

/**
 * Recherche inverse : l'utilisateur sélectionne ses lycées de secteur 1 et le
 * hook déduit en direct le(s) collège(s) de secteur compatibles.
 */
export function useReverseSectorSearch() {
  const [catalog, setCatalog] = useState<LyceeRef[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<LyceeRef[]>([]);
  const [result, setResult] = useState<ReverseLookupResult>(EMPTY);

  // Chargement du catalogue des lycées de secteur 1 (une seule fois).
  useEffect(() => {
    let cancelled = false;
    getSecteur1LyceeCatalog()
      .then((list) => {
        if (!cancelled) setCatalog(list);
      })
      .catch(() => {
        if (!cancelled) setError('Impossible de charger la liste des lycées.');
      })
      .finally(() => {
        if (!cancelled) setIsCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Recalcul des candidats à chaque changement de sélection.
  useEffect(() => {
    let cancelled = false;
    const uais = selected.map((l) => l.uai);
    matchCollegesByLycees(uais)
      .then((res) => {
        if (!cancelled) setResult(res);
      })
      .catch(() => {
        if (!cancelled) setError('Erreur lors de la déduction du collège.');
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const addLycee = useCallback((lycee: LyceeRef) => {
    setSelected((prev) =>
      prev.some((l) => l.uai === lycee.uai) ? prev : [...prev, lycee],
    );
  }, []);

  const removeLycee = useCallback((uai: string) => {
    setSelected((prev) => prev.filter((l) => l.uai !== uai));
  }, []);

  const clear = useCallback(() => {
    setSelected([]);
  }, []);

  return {
    catalog,
    isCatalogLoading,
    error,
    selected,
    addLycee,
    removeLycee,
    clear,
    result,
  };
}
