import { useState, useEffect } from 'react';
import { fetchEffectifCollege, type EffectifCollege } from '../services/collegeEffectifsApi';

export function useCollegeEffectifs(uai: string | undefined) {
  const [effectif, setEffectif] = useState<EffectifCollege | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!uai) return;

    let cancelled = false;
    setIsLoading(true);

    fetchEffectifCollege(uai)
      .then((data) => {
        if (!cancelled) setEffectif(data);
      })
      .catch(() => {
        // Silently ignore — effectif just won't show
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [uai]);

  return { effectif, isLoading };
}
