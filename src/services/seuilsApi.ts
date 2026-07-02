const DATASET_URL =
  'https://datasets-server.huggingface.co/rows?dataset=fgaume/affelnet-paris-seuils-admission-lycees&config=default&split=train&offset=0&length=100';

const BOURSIERS_DATASET_URL =
  'https://datasets-server.huggingface.co/first-rows?dataset=fgaume/affelnet-paris-seuils-admission-lycees-boursiers&config=default&split=train';

const SEUIL_START_YEAR = 2021;

/** Derived dynamically after first fetch — default until then. */
let seuilYears: number[] = [];

export function getSeuilYears(): readonly number[] {
  return seuilYears;
}

/**
 * Un seuil de 0 signifie « non connu » (année sans fiche pour ce lycée) — à
 * distinguer d'un vrai seuil. Toutes les vues doivent traiter 0 comme absent.
 */
export const SEUIL_UNKNOWN = 0;

export function isKnownSeuil(seuil: number | null | undefined): seuil is number {
  return seuil != null && seuil > SEUIL_UNKNOWN;
}

export interface AdmissionDifficulty {
  color: string;
  label: string;
  seuil: number;
  level: 'extreme' | 'hard' | 'medium' | 'easy' | 'very-easy' | 'unknown';
}

interface DatasetRow {
  row: {
    code: string;
    nom: string;
    seuils: number[];
  };
}

interface BoursiersDatasetRow {
  row: {
    code: string;
    nom: string;
    seuils: number[];
    taux_cible_boursiers: number | null;
  };
}

import type { LyceeAdmissionHistory } from '../types';
import { fetchWithHfCache } from './hfCache';

// One inflight per remote URL — shared by all view-functions below.
let admissionRowsInflight: Promise<DatasetRow[]> | null = null;
let boursiersRowsInflight: Promise<BoursiersDatasetRow[]> | null = null;

function fetchAdmissionRows(): Promise<DatasetRow[]> {
  if (admissionRowsInflight) return admissionRowsInflight;
  admissionRowsInflight = fetchWithHfCache<{ rows: DatasetRow[] }>(DATASET_URL)
    .then((d) => d.rows)
    .catch((err) => {
      admissionRowsInflight = null;
      throw err;
    });
  return admissionRowsInflight;
}

function fetchBoursiersRows(): Promise<BoursiersDatasetRow[]> {
  if (boursiersRowsInflight) return boursiersRowsInflight;
  boursiersRowsInflight = fetchWithHfCache<{ rows: BoursiersDatasetRow[] }>(BOURSIERS_DATASET_URL)
    .then((d) => d.rows)
    .catch((err) => {
      boursiersRowsInflight = null;
      throw err;
    });
  return boursiersRowsInflight;
}

// View-level memoization (stable references for React consumers).
let seuilsInflight: Promise<Map<string, number>> | null = null;
let historyInflight: Promise<readonly LyceeAdmissionHistory[]> | null = null;
let boursiersHistoryInflight: Promise<readonly LyceeAdmissionHistory[]> | null = null;
let tauxCibleBoursiersInflight: Promise<ReadonlyMap<string, number>> | null = null;

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
export function fetchSeuils(): Promise<Map<string, number>> {
  if (seuilsInflight) return seuilsInflight;
  seuilsInflight = (async () => {
    const rows = await fetchAdmissionRows();
    if (seuilYears.length === 0) deriveYears(rows);
    const latestIndex = seuilYears.length - 1;
    const map = new Map<string, number>();
    for (const { row } of rows) {
      const seuil = row.seuils[latestIndex];
      // 0 = seuil non connu pour cette année → traité comme absent.
      if (isKnownSeuil(seuil)) map.set(row.code, seuil);
    }
    return map;
  })().catch((err) => {
    seuilsInflight = null;
    throw err;
  });
  return seuilsInflight;
}

/**
 * Fetch full historical admission thresholds for all lycées.
 * Returns the complete seuils array per lycée.
 * Cached after first call.
 */
export function fetchAllSeuils(): Promise<readonly LyceeAdmissionHistory[]> {
  if (historyInflight) return historyInflight;
  historyInflight = (async () => {
    const rows = await fetchAdmissionRows();
    if (seuilYears.length === 0) deriveYears(rows);
    return rows
      .map(({ row }) => ({
        code: row.code,
        nom: row.nom,
        seuils: row.seuils,
      }))
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  })().catch((err) => {
    historyInflight = null;
    throw err;
  });
  return historyInflight;
}

/**
 * Fetch full historical admission thresholds for boursiers.
 * Same structure as fetchAllSeuils but from the boursiers dataset.
 * Cached after first call.
 */
export function fetchAllSeuilsBoursiers(): Promise<readonly LyceeAdmissionHistory[]> {
  if (boursiersHistoryInflight) return boursiersHistoryInflight;
  boursiersHistoryInflight = (async () => {
    const rows = await fetchBoursiersRows();
    return rows
      .map(({ row }) => ({
        code: row.code,
        nom: row.nom,
        seuils: row.seuils,
      }))
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  })().catch((err) => {
    boursiersHistoryInflight = null;
    throw err;
  });
  return boursiersHistoryInflight;
}

/**
 * Fetch target rate of scholarship students per lycée (taux cible boursiers).
 * Returns a Map: UAI code → rate (decimal, e.g. 0.25 for 25%).
 * Cached after first call.
 */
export function fetchTauxCibleBoursiers(): Promise<ReadonlyMap<string, number>> {
  if (tauxCibleBoursiersInflight) return tauxCibleBoursiersInflight;
  tauxCibleBoursiersInflight = (async () => {
    const rows = await fetchBoursiersRows();
    const map = new Map<string, number>();
    for (const { row } of rows) {
      if (row.taux_cible_boursiers != null) {
        map.set(row.code, row.taux_cible_boursiers);
      }
    }
    return map;
  })().catch((err) => {
    tauxCibleBoursiersInflight = null;
    throw err;
  });
  return tauxCibleBoursiersInflight;
}

export interface MissingSeuilLycee {
  code: string;
  nom: string;
}

/**
 * Liste les lycées dont le seuil de l'année la plus récente est inconnu (= 0),
 * pour la catégorie demandée (boursiers ou non). Sert au formulaire de
 * contribution : on ne propose d'ajouter un seuil que là où il manque.
 */
export async function fetchMissingSeuilLycees(
  boursier: boolean,
): Promise<MissingSeuilLycee[]> {
  const history = boursier ? await fetchAllSeuilsBoursiers() : await fetchAllSeuils();
  return history
    .filter((l) => !isKnownSeuil(l.seuils[l.seuils.length - 1]))
    .map((l) => ({ code: l.code, nom: l.nom }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

/**
 * Determine admission difficulty from a seuil value.
 */
export function getAdmissionDifficulty(seuil: number): AdmissionDifficulty {
  if (!isKnownSeuil(seuil)) {
    return { color: '#9ca3af', label: 'Seuil non connu', seuil, level: 'unknown' };
  }
  if (seuil > 40731) {
    return { color: '#1a1a1a', label: 'Inaccessible sans bonus', seuil, level: 'extreme' };
  }
  if (seuil > 40600) {
    return { color: '#dc2626', label: 'Difficilement accessible', seuil, level: 'hard' };
  }
  if (seuil > 40250) {
    return { color: '#d97706', label: 'Moyennement accessible', seuil, level: 'medium' };
  }
  if (seuil > 38000) {
    return { color: '#2563eb', label: 'Facilement accessible (secteur 1)', seuil, level: 'easy' };
  }
  return { color: '#16a34a', label: 'Très facilement accessible', seuil, level: 'very-easy' };
}
