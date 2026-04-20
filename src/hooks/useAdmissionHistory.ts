import { useState, useEffect } from 'react';
import type { LyceeAdmissionHistory } from '../types';
import { fetchAllSeuils, fetchAllSeuilsBoursiers } from '../services/seuilsApi';

interface UseAdmissionHistoryResult {
  readonly data: readonly LyceeAdmissionHistory[];
  readonly boursiers: readonly LyceeAdmissionHistory[];
  readonly isLoading: boolean;
  readonly error: string | null;
}

export function useAdmissionHistory(active: boolean): UseAdmissionHistoryResult {
  const [data, setData] = useState<readonly LyceeAdmissionHistory[]>([]);
  const [boursiers, setBoursiers] = useState<readonly LyceeAdmissionHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active || data.length > 0) return;

    setIsLoading(true);
    fetchAllSeuils()
      .then(setData)
      .catch(err => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setIsLoading(false));

    fetchAllSeuilsBoursiers()
      .then(setBoursiers)
      .catch(() => { /* boursiers data is optional — fail silently */ });
  }, [active, data.length]);

  return { data, boursiers, isLoading, error };
}
