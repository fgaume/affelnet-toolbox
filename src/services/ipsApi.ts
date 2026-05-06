// src/services/ipsApi.ts
import { computeDecile } from './decile';

const API_BASE =
  'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets';
const DATASET_OLD = 'fr-en-ips_lycees';
const DATASET_2022 = 'fr-en-ips-lycees-ap2022';
const DATASET_NEW = 'fr-en-ips-lycees-ap2023';

interface ApiRow {
  uai: string;
  rentree_scolaire: string;
  ips_voie_gt: string | null;
  ecart_type_voie_gt: string | null;
}

export interface IpsPoint {
  annee: string;
  ips: number;
  ecartType: number;
}

export interface IpsResult {
  history: IpsPoint[];
  decile: number;
}

let inflight: Promise<ApiRow[]> | null = null;

interface OldApiRow {
  uai: string;
  rentree_scolaire: string;
  ips_voie_gt: string | null;
  ecart_type_de_l_ips_voie_gt: string | null;
}

async function fetchOldDataset(): Promise<ApiRow[]> {
  const select = 'uai,rentree_scolaire,ips_voie_gt,ecart_type_de_l_ips_voie_gt';
  const where = encodeURIComponent("academie = 'PARIS' AND secteur = 'public' AND ips_voie_gt is not null");
  const url = `${API_BASE}/${DATASET_OLD}/exports/json?select=${select}&where=${where}&order_by=rentree_scolaire&limit=-1`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erreur chargement IPS ancien: ${response.status}`);
  const rows = (await response.json()) as OldApiRow[];
  return rows.map((r) => ({
    uai: r.uai,
    rentree_scolaire: r.rentree_scolaire,
    ips_voie_gt: r.ips_voie_gt,
    ecart_type_voie_gt: r.ecart_type_de_l_ips_voie_gt,
  }));
}

async function fetch2022Dataset(): Promise<ApiRow[]> {
  const select = 'uai,rentree_scolaire,ips_voie_gt';
  const where = encodeURIComponent("academie = 'PARIS' AND secteur = 'public' AND ips_voie_gt is not null");
  const url = `${API_BASE}/${DATASET_2022}/exports/json?select=${select}&where=${where}&order_by=rentree_scolaire&limit=-1`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erreur chargement IPS 2022: ${response.status}`);
  const rows = (await response.json()) as Array<{ uai: string; rentree_scolaire: string; ips_voie_gt: string | null }>;
  return rows.map((r) => ({
    uai: r.uai,
    rentree_scolaire: r.rentree_scolaire,
    ips_voie_gt: r.ips_voie_gt,
    ecart_type_voie_gt: null,
  }));
}

async function fetchNewDataset(): Promise<ApiRow[]> {
  const select = 'uai,rentree_scolaire,ips_voie_gt,ecart_type_voie_gt';
  const where = encodeURIComponent("academie = 'PARIS' AND secteur = 'public' AND ips_voie_gt is not null");
  const url = `${API_BASE}/${DATASET_NEW}/exports/json?select=${select}&where=${where}&order_by=rentree_scolaire&limit=-1`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erreur chargement IPS: ${response.status}`);
  return (await response.json()) as ApiRow[];
}

function fetchAllParis(): Promise<ApiRow[]> {
  if (inflight) return inflight;

  inflight = (async () => {
    // Merge old (2016-2021), 2022, and new (2023+) datasets, dedup by uai+year
    const [oldRows, rows2022, newRows] = await Promise.all([
      fetchOldDataset(),
      fetch2022Dataset(),
      fetchNewDataset(),
    ]);
    const seen = new Set<string>();
    const merged: ApiRow[] = [];
    // Newer datasets take precedence for overlapping years
    for (const r of [...newRows, ...rows2022, ...oldRows]) {
      const key = `${r.uai}_${r.rentree_scolaire}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(r);
      }
    }
    merged.sort((a, b) => a.rentree_scolaire.localeCompare(b.rentree_scolaire));
    return merged;
  })().catch((err) => {
    inflight = null;
    throw err;
  });

  return inflight;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function fetchMedianIpsByYear(): Promise<Map<string, number>> {
  try {
    const allRows = await fetchAllParis();
    const byYear = new Map<string, number[]>();
    for (const r of allRows) {
      if (r.ips_voie_gt == null) continue;
      const annee = r.rentree_scolaire;
      const ips = parseFloat(r.ips_voie_gt);
      const arr = byYear.get(annee);
      if (arr) arr.push(ips);
      else byYear.set(annee, [ips]);
    }
    const result = new Map<string, number>();
    for (const [annee, values] of byYear) {
      result.set(annee, median(values));
    }
    return result;
  } catch {
    return new Map();
  }
}

export async function fetchIps(uai: string): Promise<IpsResult | null> {
  try {
    const allRows = await fetchAllParis();

    const lyceeRows = allRows.filter((r) => r.uai === uai && r.ips_voie_gt != null);
    if (lyceeRows.length === 0) return null;

    const history: IpsPoint[] = lyceeRows.map((r) => ({
      annee: r.rentree_scolaire,
      ips: parseFloat(r.ips_voie_gt!),
      ecartType: parseFloat(r.ecart_type_voie_gt ?? '0'),
    }));

    // Decile: compare latest year across all Paris lycées
    const latestYear = allRows.reduce(
      (max, r) => (r.rentree_scolaire > max ? r.rentree_scolaire : max),
      ''
    );
    const latestRows = allRows.filter((r) => r.rentree_scolaire === latestYear && r.ips_voie_gt != null);
    const allIps = latestRows.map((r) => parseFloat(r.ips_voie_gt!));
    const lyceeLatestRow = latestRows.find((r) => r.uai === uai);
    const lyceeIps = lyceeLatestRow
      ? parseFloat(lyceeLatestRow.ips_voie_gt!)
      : history[history.length - 1]?.ips ?? 0;
    const decile = computeDecile(lyceeIps, allIps);

    return { history, decile };
  } catch {
    return null;
  }
}
