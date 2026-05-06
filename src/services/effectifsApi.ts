import type { EffectifLycee, LyceeSecteur } from '../types';
import { fetchWithHfCache } from './hfCache';

const DATASET_URL =
  'https://datasets-server.huggingface.co/rows?dataset=fgaume/affelnet-paris-lycees-effectifs-2nde&config=default&split=effectifs&offset=0&length=100';

interface DatasetRow {
  row: {
    UAI: string;
    Nom: string;
    Effectif_2nde_GT_RS25: number;
  };
}

let inflight: Promise<Map<string, EffectifLycee>> | null = null;

function fetchAllEffectifs(): Promise<Map<string, EffectifLycee>> {
  if (inflight) return inflight;

  inflight = (async () => {
    const data = await fetchWithHfCache<{ rows: DatasetRow[] }>(DATASET_URL);
    const map = new Map<string, EffectifLycee>();
    for (const { row } of data.rows) {
      map.set(row.UAI, {
        uai: row.UAI,
        nom: row.Nom,
        effectif: row.Effectif_2nde_GT_RS25,
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

export async function fetchEffectif2nde(uai: string): Promise<EffectifLycee | null> {
  const map = await fetchAllEffectifs();
  return map.get(uai) ?? null;
}

export async function fetchEffectifsSecteur1(
  lycees: LyceeSecteur[],
): Promise<EffectifLycee[]> {
  const map = await fetchAllEffectifs();
  const secteur1 = lycees.filter((l) => l.secteur === 1);

  const results: EffectifLycee[] = [];
  for (const lycee of secteur1) {
    const effectif = map.get(lycee.uai);
    if (effectif) {
      results.push(effectif);
    }
  }

  return results;
}
