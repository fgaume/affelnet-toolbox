// src/services/ipsApi.ts
import { computeDecile } from './decile';

const API_BASE =
  'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets';
const DATASET_OLD = 'fr-en-ips_lycees';
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

let cache: ApiRow[] | null = null;

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

async function fetchNewDataset(): Promise<ApiRow[]> {
  const select = 'uai,rentree_scolaire,ips_voie_gt,ecart_type_voie_gt';
  const where = encodeURIComponent("academie = 'PARIS' AND secteur = 'public' AND ips_voie_gt is not null");
  const url = `${API_BASE}/${DATASET_NEW}/exports/json?select=${select}&where=${where}&order_by=rentree_scolaire&limit=-1`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erreur chargement IPS: ${response.status}`);
  return (await response.json()) as ApiRow[];
}

async function fetchAllParis(): Promise<ApiRow[]> {
  if (cache) return cache;

  // Merge old (2016-2022) and new (2023+) datasets, dedup by uai+year
  const [oldRows, newRows] = await Promise.all([
    fetchOldDataset(),
    fetchNewDataset(),
  ]);
  const seen = new Set<string>();
  cache = [];
  // New dataset takes precedence for overlapping years
  for (const r of [...newRows, ...oldRows]) {
    const key = `${r.uai}_${r.rentree_scolaire}`;
    if (!seen.has(key)) {
      seen.add(key);
      cache.push(r);
    }
  }
  cache.sort((a, b) => a.rentree_scolaire.localeCompare(b.rentree_scolaire));
  return cache;
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
