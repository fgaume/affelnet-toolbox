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

let allEffectifs: Map<string, EffectifLycee> | null = null;

async function fetchAllEffectifs(): Promise<Map<string, EffectifLycee>> {
  if (allEffectifs) return allEffectifs;

  const data = await fetchWithHfCache<{ rows: DatasetRow[] }>(DATASET_URL);

  allEffectifs = new Map();
  for (const { row } of data.rows) {
    allEffectifs.set(row.UAI, {
      uai: row.UAI,
      nom: row.Nom,
      effectif: row.Effectif_2nde_GT_RS25,
      annee: '2025',
    });
  }

  return allEffectifs;
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
