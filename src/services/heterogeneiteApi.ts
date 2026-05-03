import type { HeterogeneiteResult, HeterogeneitePoint } from '../types';
import { fetchWithHfCache } from './hfCache';

const DATASET_BASE =
  'https://datasets-server.huggingface.co/rows?dataset=fgaume/affelnet-paris-lycees-heterogeneite-sociale&config=default&split=ihs';

interface DatasetRow {
  row: {
    UAI: string;
    Nom: string;
    Annee: string;
    IPS_Moyen: number;
    IPS_EcartType: number;
    IHS: number;
  };
}

interface DatasetResponse {
  rows: DatasetRow[];
  num_rows_total: number;
}

const PAGE_SIZE = 100;
let allRows: DatasetRow[] | null = null;

async function fetchAllRows(): Promise<DatasetRow[]> {
  if (allRows) return allRows;

  // Fetch first page to get total count
  const firstPage = await fetchWithHfCache<DatasetResponse>(`${DATASET_BASE}&offset=0&length=${PAGE_SIZE}`);
  allRows = firstPage.rows;

  // Fetch remaining pages if needed
  const total = firstPage.num_rows_total;
  if (total > PAGE_SIZE) {
    const remainingPages = Math.ceil((total - PAGE_SIZE) / PAGE_SIZE);
    const promises: Promise<DatasetResponse>[] = [];
    for (let i = 1; i <= remainingPages; i++) {
      const offset = i * PAGE_SIZE;
      promises.push(
        fetchWithHfCache<DatasetResponse>(`${DATASET_BASE}&offset=${offset}&length=${PAGE_SIZE}`)
      );
    }
    const results = await Promise.all(promises);
    for (const page of results) {
      allRows = allRows.concat(page.rows);
    }
  }

  return allRows;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function fetchIhs(uai: string): Promise<HeterogeneiteResult | null> {
  try {
    const rows = await fetchAllRows();
    const lyceeRows = rows.filter((r) => r.row.UAI === uai);
    if (lyceeRows.length === 0) return null;

    const history: HeterogeneitePoint[] = lyceeRows.map((r) => ({
      annee: r.row.Annee,
      ipsMoyen: r.row.IPS_Moyen,
      ipsEcartType: r.row.IPS_EcartType,
      ihs: r.row.IHS,
    }));

    return { history };
  } catch {
    return null;
  }
}

export async function fetchMedianIhsByYear(): Promise<Map<string, number>> {
  try {
    const rows = await fetchAllRows();
    const byYear = new Map<string, number[]>();
    for (const { row } of rows) {
      const arr = byYear.get(row.Annee);
      if (arr) arr.push(row.IHS);
      else byYear.set(row.Annee, [row.IHS]);
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
