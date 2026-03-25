import type { EffectifLycee, LyceeSecteur } from '../types';

const API_URL =
  'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-lycee_gt-effectifs-niveau-sexe-lv/records';

interface ApiResult {
  rentree_scolaire: string;
  '2ndes_gt': number;
  patronyme: string;
}

const cache = new Map<string, EffectifLycee[]>();

export async function fetchEffectif2nde(uai: string): Promise<EffectifLycee | null> {
  try {
    const query =
      `where=numero_lycee='${uai}'` +
      `&order_by=rentree_scolaire+desc` +
      `&select=rentree_scolaire,%602ndes_gt%60,patronyme` +
      `&limit=1`;

    const response = await fetch(`${API_URL}?${query}`);
    if (!response.ok) return null;

    const data = await response.json();
    const result: ApiResult | undefined = data.results?.[0];
    if (!result) return null;

    return {
      uai,
      nom: result.patronyme,
      effectif: result['2ndes_gt'],
      annee: result.rentree_scolaire,
    };
  } catch {
    return null;
  }
}

export async function fetchEffectifsSecteur1(
  lycees: LyceeSecteur[],
): Promise<EffectifLycee[]> {
  const secteur1 = lycees.filter((l) => l.secteur === 1);
  const cacheKey = secteur1.map((l) => l.uai).sort().join(',');

  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const settled = await Promise.allSettled(
    secteur1.map((l) => fetchEffectif2nde(l.uai)),
  );

  const results: EffectifLycee[] = [];
  for (const entry of settled) {
    if (entry.status === 'fulfilled' && entry.value) {
      results.push(entry.value);
    }
  }

  cache.set(cacheKey, results);
  return results;
}
