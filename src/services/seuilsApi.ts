const DATASET_URL =
  'https://datasets-server.huggingface.co/rows?dataset=fgaume/affelnet-paris-seuils-admission-lycees&config=default&split=train&offset=0&length=100';

const SEUIL_2025_INDEX = 4;

export const SEUIL_YEARS = [2021, 2022, 2023, 2024, 2025] as const;

export interface AdmissionDifficulty {
  color: string;
  label: string;
  seuil: number;
}

interface DatasetRow {
  row: {
    code: string;
    nom: string;
    seuils: number[];
  };
}

import type { LyceeAdmissionHistory } from '../types';

let cache: Map<string, number> | null = null;
let historyCache: readonly LyceeAdmissionHistory[] | null = null;

/**
 * Fetch all lycée admission thresholds from HuggingFace dataset.
 * Returns a Map: UAI code → seuil 2025.
 * Cached after first call.
 */
export async function fetchSeuils(): Promise<Map<string, number>> {
  if (cache) return cache;

  const response = await fetch(DATASET_URL);
  if (!response.ok) {
    throw new Error(`Erreur chargement seuils: ${response.status}`);
  }

  const data = await response.json();
  const rows: DatasetRow[] = data.rows;

  cache = new Map();
  for (const { row } of rows) {
    const seuil = row.seuils[SEUIL_2025_INDEX];
    if (seuil != null) {
      cache.set(row.code, seuil);
    }
  }

  return cache;
}

/**
 * Fetch full historical admission thresholds for all lycées.
 * Returns the complete seuils array per lycée.
 * Cached after first call.
 */
export async function fetchAllSeuils(): Promise<readonly LyceeAdmissionHistory[]> {
  if (historyCache) return historyCache;

  const response = await fetch(DATASET_URL);
  if (!response.ok) {
    throw new Error(`Erreur chargement seuils: ${response.status}`);
  }

  const data = await response.json();
  const rows: DatasetRow[] = data.rows;

  historyCache = rows
    .map(({ row }) => ({
      code: row.code,
      nom: row.nom,
      seuils: row.seuils,
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

  return historyCache;
}

/**
 * Determine admission difficulty from a seuil value.
 */
export function getAdmissionDifficulty(seuil: number): AdmissionDifficulty {
  if (seuil > 40731) {
    return { color: '#1a1a1a', label: 'Inaccessible sans bonus', seuil };
  }
  if (seuil > 40600) {
    return { color: '#dc2626', label: 'Difficilement accessible', seuil };
  }
  if (seuil > 40250) {
    return { color: '#f97316', label: 'Moyennement accessible', seuil };
  }
  if (seuil > 38000) {
    return { color: '#2563eb', label: 'Facilement accessible (secteur 1)', seuil };
  }
  return { color: '#16a34a', label: 'Très facilement accessible', seuil };
}
