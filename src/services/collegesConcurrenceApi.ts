// src/services/collegesConcurrenceApi.ts

const ARCGIS_BASE = 'https://services9.arcgis.com/ekT8MJFiVh8nvlV5/arcgis/rest/services/Affectation_Lyc%C3%A9es/FeatureServer/0/query';

interface CollegeRef {
  uai: string;
  nom: string;
}

export async function fetchCollegesForLycee(uaiLycee: string): Promise<CollegeRef[]> {
  const params = new URLSearchParams({
    outFields: 'Réseau,Nom_tete',
    returnGeometry: 'false',
    f: 'pjson',
    orderByFields: 'Nom_tete',
  });
  const whereClause = `secteur='1' and UAI='${uaiLycee}'`;
  const url = `${ARCGIS_BASE}?${params}&where=${encodeURIComponent(whereClause).replace(/%27/g, "'").replace(/%3D/g, '=')}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Erreur de connexion à l\'annuaire Affelnet');

  const data = await response.json();
  return (data.features || []).map(
    (f: { attributes: { Réseau: string; Nom_tete: string } }) => ({
      uai: f.attributes.Réseau,
      nom: f.attributes.Nom_tete,
    })
  );
}

const IPS_COLLEGES_URL =
  'https://huggingface.co/datasets/fgaume/affelnet-paris-bonus-ips-colleges/raw/main/affelnet-paris-bonus-ips-colleges.json';

interface IpsCollegeRow {
  Identifiant: string;
  [key: string]: string | number | null;
}

let ipsCache: Map<string, number> | null = null;

export async function fetchBonusIpsColleges(): Promise<Map<string, number>> {
  if (ipsCache) return ipsCache;

  const response = await fetch(IPS_COLLEGES_URL);
  if (!response.ok) throw new Error(`Erreur chargement bonus IPS: ${response.status}`);

  const rows = (await response.json()) as IpsCollegeRow[];

  const currentYear = new Date().getFullYear();
  const currentField = `Bonus_IPS_${currentYear}`;
  const previousField = `Bonus_IPS_${currentYear - 1}`;
  const field = (rows[0]?.[currentField] !== undefined) ? currentField : previousField;

  ipsCache = new Map();
  for (const row of rows) {
    const value = row[field];
    if (typeof value === 'number') {
      ipsCache.set(row.Identifiant, value);
    }
  }
  return ipsCache;
}

const DNB_API_BASE =
  'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-indicateurs-valeur-ajoutee-colleges/exports/json';

interface DnbRow {
  uai: string;
  session: number;
  nb_candidats_g: number;
  taux_de_reussite_g: number;
}

interface DnbResult {
  admisMap: Map<string, number>;
  session: number | null;
}

let dnbCache: DnbResult | null = null;

export async function fetchDnbAdmisColleges(): Promise<DnbResult> {
  if (dnbCache) return dnbCache;

  const select = 'uai,session,nb_candidats_g,taux_de_reussite_g';
  const where = encodeURIComponent("academie = 'PARIS' AND secteur = 'PU'");
  const url = `${DNB_API_BASE}?select=${select}&where=${where}&order_by=session+desc&limit=-1`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erreur chargement DNB: ${response.status}`);

  const rows = (await response.json()) as DnbRow[];
  const admisMap = new Map<string, number>();
  let session: number | null = null;
  // Data is ordered by session desc, so first occurrence per UAI is the latest year
  for (const row of rows) {
    if (session === null && row.session != null) {
      session = row.session;
    }
    if (!admisMap.has(row.uai)) {
      admisMap.set(row.uai, Math.round(row.nb_candidats_g * row.taux_de_reussite_g / 100));
    }
  }
  dnbCache = { admisMap, session };
  return dnbCache;
}

export interface CollegeConcurrent {
  uai: string;
  nom: string;
  bonusIps: number;  // 0, 400, 800, 1200, or -1 if unknown
  nbAdmis: number;   // 0 if unknown
}

export interface ConcurrenceResult {
  colleges: CollegeConcurrent[];
  dnbSession: number | null;
}

const concurrentsCache = new Map<string, ConcurrenceResult>();

export async function fetchCollegesConcurrents(uaiLycee: string): Promise<ConcurrenceResult> {
  const cached = concurrentsCache.get(uaiLycee);
  if (cached) return cached;

  const collegeRefs = await fetchCollegesForLycee(uaiLycee);
  if (collegeRefs.length === 0) return { colleges: [], dnbSession: null };

  const [ipsMap, dnbResult] = await Promise.all([
    fetchBonusIpsColleges(),
    fetchDnbAdmisColleges(),
  ]);

  const colleges: CollegeConcurrent[] = collegeRefs.map((c) => ({
    uai: c.uai,
    nom: c.nom,
    bonusIps: ipsMap.get(c.uai) ?? -1,
    nbAdmis: dnbResult.admisMap.get(c.uai) ?? 0,
  }));

  const result: ConcurrenceResult = { colleges, dnbSession: dnbResult.session };
  concurrentsCache.set(uaiLycee, result);
  return result;
}
