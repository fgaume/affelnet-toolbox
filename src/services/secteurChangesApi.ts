import type { LyceeSecteur } from '../types';

const DATASET_BASE =
  'https://datasets-server.huggingface.co/rows?dataset=fgaume/affelnet-paris-secteurs-2025&config=default&split=train';

const PAGE_SIZE = 100;

interface SecteurRow {
  row: {
    uai_college: string;
    uai_lycee: string;
  };
}

let cache: Map<string, Set<string>> | null = null;

/**
 * Fetch previous year's sector 1 associations from HuggingFace dataset.
 * Returns a Map: college UAI → Set of lycée UAIs that were in sector 1.
 * Cached after first call.
 */
export async function fetchPreviousSecteur1(): Promise<Map<string, Set<string>>> {
  if (cache) return cache;

  const map = new Map<string, Set<string>>();
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const response = await fetch(`${DATASET_BASE}&offset=${offset}&length=${PAGE_SIZE}`);
    if (!response.ok) {
      throw new Error(`Erreur chargement secteurs précédents: ${response.status}`);
    }

    const data = await response.json();
    total = data.num_rows_total;
    const rows: SecteurRow[] = data.rows;

    for (const { row } of rows) {
      const set = map.get(row.uai_college) ?? new Set();
      set.add(row.uai_lycee);
      map.set(row.uai_college, set);
    }

    offset += rows.length;
  }

  cache = map;
  return map;
}

/**
 * Given a college UAI and its current lycées, detect which sector 1 lycées
 * are new compared to the previous year.
 * Returns a Set of UAIs that are new in sector 1.
 */
export async function detectNewSecteur1Lycees(
  uaiCollege: string,
  currentLycees: LyceeSecteur[],
): Promise<Set<string>> {
  const previousMap = await fetchPreviousSecteur1();
  const previousLycees = previousMap.get(uaiCollege);

  // If the college wasn't in last year's data, we can't determine what's new
  if (!previousLycees) return new Set();

  const newUais = new Set<string>();
  for (const lycee of currentLycees) {
    if (lycee.secteur === 1 && !previousLycees.has(lycee.uai)) {
      newUais.add(lycee.uai);
    }
  }

  return newUais;
}
