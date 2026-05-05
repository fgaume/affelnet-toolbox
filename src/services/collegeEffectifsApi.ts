import { fetchWithHfCache } from './hfCache';

const DATASET_BASE =
  'https://datasets-server.huggingface.co/rows?dataset=fgaume/affelnet-paris-colleges-effectifs-3eme&config=default&split=effectifs';

// HuggingFace rows API has a max of 100 rows per request.
// The dataset has 114 colleges, so we need two pages.
const PAGE_SIZE = 100;

interface DatasetRow {
  row: {
    UAI: string;
    Nom: string;
    Effectif_3eme_RS25: number;
  };
}

export interface EffectifCollege {
  uai: string;
  nom: string;
  effectif: number;
  annee: string;
}

let allEffectifs: Map<string, EffectifCollege> | null = null;

export async function fetchAllEffectifsColleges(): Promise<Map<string, EffectifCollege>> {
  if (allEffectifs) return allEffectifs;

  const page1Url = `${DATASET_BASE}&offset=0&length=${PAGE_SIZE}`;
  const page2Url = `${DATASET_BASE}&offset=${PAGE_SIZE}&length=${PAGE_SIZE}`;

  const [page1, page2] = await Promise.all([
    fetchWithHfCache<{ rows: DatasetRow[] }>(page1Url),
    fetchWithHfCache<{ rows: DatasetRow[] }>(page2Url),
  ]);

  const allRows = [...page1.rows, ...page2.rows];

  allEffectifs = new Map();
  for (const { row } of allRows) {
    allEffectifs.set(row.UAI, {
      uai: row.UAI,
      nom: row.Nom,
      effectif: row.Effectif_3eme_RS25,
      annee: '2025',
    });
  }

  return allEffectifs;
}

export async function fetchEffectifCollege(uai: string): Promise<EffectifCollege | null> {
  const map = await fetchAllEffectifsColleges();
  return map.get(uai) ?? null;
}
