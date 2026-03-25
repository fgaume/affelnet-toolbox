import { useState, useEffect, useMemo } from 'react';
import type { EffectifLycee, LyceeSecteur } from '../types';
import { fetchEffectifsSecteur1 } from '../services/effectifsApi';

export function useEffectifs(lycees: LyceeSecteur[] | undefined) {
  const [effectifs, setEffectifs] = useState<EffectifLycee[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Stable dependency: only re-run when the set of UAIs actually changes
  const lyceesKey = useMemo(
    () => lycees?.map((l) => l.uai).sort().join(',') ?? '',
    [lycees],
  );

  useEffect(() => {
    if (!lyceesKey || !lycees) return;

    let cancelled = false;
    setIsLoading(true);

    fetchEffectifsSecteur1(lycees)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lyceesKey]);

  // Count of sector 1 lycées requested (for partial data note)
  const requestedCount = useMemo(
    () => lycees?.filter((l) => l.secteur === 1).length ?? 0,
    [lycees],
  );

  return { effectifs, isLoading, requestedCount };
}

