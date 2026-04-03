const DATASET_URL =
  'https://datasets-server.huggingface.co/rows?dataset=fgaume/affelnet-paris-seuils-admission-lycees&config=default&split=train&offset=0&length=100';

const SEUIL_START_YEAR = 2021;

/** Derived dynamically after first fetch — default until then. */
let seuilYears: number[] = [];

export function getSeuilYears(): readonly number[] {
  return seuilYears;
}

export interface AdmissionDifficulty {
  color: string;
  label: string;
  seuil: number;
  level: 'extreme' | 'hard' | 'medium' | 'easy' | 'very-easy';
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

function deriveYears(rows: DatasetRow[]): void {
  const length = rows[0]?.row.seuils.length ?? 0;
  const currentYear = new Date().getFullYear();
  const allYears = Array.from({ length }, (_, i) => SEUIL_START_YEAR + i);
  const lastDataYear = allYears[allYears.length - 1] ?? currentYear;
  // Keep up to current year; if dataset has future data, cap it
  seuilYears = lastDataYear > currentYear
    ? allYears.filter((y) => y <= currentYear)
    : allYears;
}

/**
 * Fetch all lycée admission thresholds from HuggingFace dataset.
 * Returns a Map: UAI code → latest seuil.
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

  if (seuilYears.length === 0) deriveYears(rows);
  const latestIndex = seuilYears.length - 1;

  cache = new Map();
  for (const { row } of rows) {
    const seuil = row.seuils[latestIndex];
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

  if (seuilYears.length === 0) deriveYears(rows);

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
    return { color: '#1a1a1a', label: 'Inaccessible sans bonus', seuil, level: 'extreme' };
  }
  if (seuil > 40600) {
    return { color: '#dc2626', label: 'Difficilement accessible', seuil, level: 'hard' };
  }
  if (seuil > 40250) {
    return { color: '#f97316', label: 'Moyennement accessible', seuil, level: 'medium' };
  }
  if (seuil > 38000) {
    return { color: '#2563eb', label: 'Facilement accessible (secteur 1)', seuil, level: 'easy' };
  }
  return { color: '#16a34a', label: 'Très facilement accessible', seuil, level: 'very-easy' };
}
