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

let inflight: Promise<Map<string, EffectifCollege>> | null = null;

export function fetchAllEffectifsColleges(): Promise<Map<string, EffectifCollege>> {
  if (inflight) return inflight;

  inflight = (async () => {
    const page1Url = `${DATASET_BASE}&offset=0&length=${PAGE_SIZE}`;
    const page2Url = `${DATASET_BASE}&offset=${PAGE_SIZE}&length=${PAGE_SIZE}`;

    const [page1, page2] = await Promise.all([
      fetchWithHfCache<{ rows: DatasetRow[] }>(page1Url),
      fetchWithHfCache<{ rows: DatasetRow[] }>(page2Url),
    ]);

    const allRows = [...page1.rows, ...page2.rows];

    const map = new Map<string, EffectifCollege>();
    for (const { row } of allRows) {
      map.set(row.UAI, {
        uai: row.UAI,
        nom: row.Nom,
        effectif: row.Effectif_3eme_RS25,
        annee: '2025',
      });
    }
    return map;
  })().catch((err) => {
    inflight = null;
    throw err;
  });

  return inflight;
}

export async function fetchEffectifCollege(uai: string): Promise<EffectifCollege | null> {
  const map = await fetchAllEffectifsColleges();
  return map.get(uai) ?? null;
}
