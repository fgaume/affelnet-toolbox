// src/services/niveauScolaireApi.ts
import { computeDecile } from './decile';

const API_URL =
  'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-indicateurs-de-resultat-des-lycees-gt_v2/exports/json';

interface ApiRow {
  annee: string;
  uai: string;
  nb_mentions_tb_sansf_g: number | null;
  nb_mentions_tb_avecf_g: number | null;
  presents_gnle: number;
}

export interface NiveauScolairePoint {
  annee: string;
  tauxTB: number;
}

export interface NiveauScolaireResult {
  history: NiveauScolairePoint[];
  decile: number;
}

let cache: ApiRow[] | null = null;

export function computeTauxTB(sansF: number | null, avecF: number | null, presents: number): number {
  if (presents === 0) return 0;
  return (((sansF ?? 0) + (avecF ?? 0)) / presents) * 100;
}

async function fetchAllParis(): Promise<ApiRow[]> {
  if (cache) return cache;

  const select = 'annee,uai,nb_mentions_tb_sansf_g,nb_mentions_tb_avecf_g,presents_gnle';
  const where = encodeURIComponent(
    "(code_departement = '75') AND (secteur = 'public') AND (nb_mentions_tb_sansf_g is not null) AND (presents_gnle > 0)"
  );
  const url = `${API_URL}?select=${select}&where=${where}&order_by=annee&limit=-1`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erreur chargement niveau scolaire: ${response.status}`);

  cache = (await response.json()) as ApiRow[];
  return cache;
}

export async function fetchNiveauScolaire(uai: string): Promise<NiveauScolaireResult | null> {
  try {
    const allRows = await fetchAllParis();

    // History for this lycée
    const lyceeRows = allRows.filter((r) => r.uai === uai);
    if (lyceeRows.length === 0) return null;

    const history: NiveauScolairePoint[] = lyceeRows.map((r) => ({
      annee: r.annee.slice(0, 4),
      tauxTB: computeTauxTB(r.nb_mentions_tb_sansf_g, r.nb_mentions_tb_avecf_g, r.presents_gnle),
    }));

    // Decile: compare latest year across all Paris lycées
    const latestYear = allRows.reduce((max, r) => (r.annee > max ? r.annee : max), '');
    const latestRows = allRows.filter((r) => r.annee === latestYear);
    const allTaux = latestRows.map((r) =>
      computeTauxTB(r.nb_mentions_tb_sansf_g, r.nb_mentions_tb_avecf_g, r.presents_gnle)
    );
    const lyceeLatestRow = latestRows.find((r) => r.uai === uai);
    const lyceeTaux = lyceeLatestRow
      ? computeTauxTB(lyceeLatestRow.nb_mentions_tb_sansf_g, lyceeLatestRow.nb_mentions_tb_avecf_g, lyceeLatestRow.presents_gnle)
      : history[history.length - 1]?.tauxTB ?? 0;
    const decile = computeDecile(lyceeTaux, allTaux);

    return { history, decile };
  } catch {
    return null;
  }
}
