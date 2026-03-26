// src/services/ipsApi.ts
import { computeDecile } from './decile';

const API_URL =
  'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-ips-lycees-ap2023/exports/json';

interface ApiRow {
  uai: string;
  rentree_scolaire: string;
  ips: number;
  ecart_type: number;
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

async function fetchAllParis(): Promise<ApiRow[]> {
  if (cache) return cache;

  const select = 'uai,rentree_scolaire,ips,ecart_type';
  const url = `${API_URL}?select=${select}&refine=academie:PARIS&order_by=rentree_scolaire&limit=-1`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erreur chargement IPS: ${response.status}`);

  cache = (await response.json()) as ApiRow[];
  return cache;
}

export async function fetchIps(uai: string): Promise<IpsResult | null> {
  try {
    const allRows = await fetchAllParis();

    const lyceeRows = allRows.filter((r) => r.uai === uai);
    if (lyceeRows.length === 0) return null;

    const history: IpsPoint[] = lyceeRows.map((r) => ({
      annee: r.rentree_scolaire,
      ips: r.ips,
      ecartType: r.ecart_type,
    }));

    // Decile: compare latest year across all Paris lycées
    const latestYear = allRows.reduce(
      (max, r) => (r.rentree_scolaire > max ? r.rentree_scolaire : max),
      ''
    );
    const latestRows = allRows.filter((r) => r.rentree_scolaire === latestYear);
    const allIps = latestRows.map((r) => r.ips);
    const lyceeLatestRow = latestRows.find((r) => r.uai === uai);
    const lyceeIps = lyceeLatestRow ? lyceeLatestRow.ips : history[history.length - 1]?.ips ?? 0;
    const decile = computeDecile(lyceeIps, allIps);

    return { history, decile };
  } catch {
    return null;
  }
}
