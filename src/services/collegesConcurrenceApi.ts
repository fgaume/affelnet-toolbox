// src/services/collegesConcurrenceApi.ts

const ARCGIS_BASE = 'https://services9.arcgis.com/ekT8MJFiVh8nvlV5/arcgis/rest/services/Affectation_Lyc%C3%A9es/FeatureServer/0/query';

interface CollegeRef {
  uai: string;
  nom: string;
}

export async function fetchCollegesForLycee(uaiLycee: string): Promise<CollegeRef[]> {
  const params = new URLSearchParams({
    outFields: 'Réseau,Nom_Tete',
    returnGeometry: 'false',
    f: 'pjson',
    orderByFields: 'Nom_Tete',
  });
  const whereClause = `secteur='1' and UAI='${uaiLycee}'`;
  const url = `${ARCGIS_BASE}?${params}&where=${encodeURIComponent(whereClause).replace(/%27/g, "'").replace(/%3D/g, '=')}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Erreur de connexion à l\'annuaire Affelnet');

  const data = await response.json();
  return (data.features || []).map(
    (f: { attributes: { Réseau: string; Nom_Tete: string } }) => ({
      uai: f.attributes.Réseau,
      nom: f.attributes.Nom_Tete,
    })
  );
}

const IPS_COLLEGES_URL =
  'https://huggingface.co/datasets/fgaume/affelnet-paris-bonus-ips-colleges/raw/main/affelnet-paris-bonus-ips-colleges.json';

interface IpsCollegeRow {
  Identifiant: string;
  Bonus_IPS_2026: number | null;
}

let ipsCache: Map<string, number> | null = null;

export async function fetchBonusIpsColleges(): Promise<Map<string, number>> {
  if (ipsCache) return ipsCache;

  const response = await fetch(IPS_COLLEGES_URL);
  if (!response.ok) throw new Error(`Erreur chargement bonus IPS: ${response.status}`);

  const rows = (await response.json()) as IpsCollegeRow[];
  ipsCache = new Map();
  for (const row of rows) {
    if (row.Bonus_IPS_2026 != null) {
      ipsCache.set(row.Identifiant, row.Bonus_IPS_2026);
    }
  }
  return ipsCache;
}

const DNB_API_BASE =
  'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-indicateurs-valeur-ajoutee-colleges/exports/json';

interface DnbRow {
  uai: string;
  nb_candidats_g: number;
  taux_de_reussite_g: number;
}

let dnbCache: Map<string, number> | null = null;

export async function fetchDnbAdmisColleges(): Promise<Map<string, number>> {
  if (dnbCache) return dnbCache;

  const select = 'uai,nb_candidats_g,taux_de_reussite_g';
  const where = encodeURIComponent("academie = 'PARIS' AND secteur = 'PU'");
  const url = `${DNB_API_BASE}?select=${select}&where=${where}&order_by=session+desc&limit=-1`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erreur chargement DNB: ${response.status}`);

  const rows = (await response.json()) as DnbRow[];
  dnbCache = new Map();
  // Data is ordered by session desc, so first occurrence per UAI is the latest year
  for (const row of rows) {
    if (!dnbCache.has(row.uai)) {
      dnbCache.set(row.uai, Math.round(row.nb_candidats_g * row.taux_de_reussite_g / 100));
    }
  }
  return dnbCache;
}
