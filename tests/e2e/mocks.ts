import type { Page, Route } from '@playwright/test';

export interface MockOverrides {
  academicStats?: unknown;
  seuils?: unknown;
  address?: unknown;
  arcgisCollegeUai?: unknown;
  arcgisLycees?: unknown;
  effectifs?: unknown;
  statsModels?: unknown;
  niveauScolaire?: unknown;
  ipsLycees?: unknown;
  seuilsBoursiers?: unknown;
  bonusIpsColleges?: unknown;
  capgeoSector?: unknown;
  hfSecteurs?: unknown;
  collegeList?: unknown;
}

const thisYear = new Date().getFullYear();

const DEFAULTS = {
  academicStats: {
    rows: [
      { row: { annee: thisYear, champ: 'FRANCAIS', moyenne: 14, 'ecart-type': 3 } },
      { row: { annee: thisYear, champ: 'MATHEMATIQUES', moyenne: 13, 'ecart-type': 4 } },
      { row: { annee: thisYear, champ: 'HISTOIRE-GEO', moyenne: 15, 'ecart-type': 2 } },
      { row: { annee: thisYear, champ: 'LANGUES VIVANTES', moyenne: 14, 'ecart-type': 3 } },
      { row: { annee: thisYear, champ: 'SCIENCES-TECHNO-DP', moyenne: 12, 'ecart-type': 5 } },
      { row: { annee: thisYear, champ: 'ARTS', moyenne: 16, 'ecart-type': 2 } },
      { row: { annee: thisYear, champ: 'EPS', moyenne: 14, 'ecart-type': 3 } },
    ],
    num_rows_total: 7,
  },
  seuils: {
    rows: [
      { row: { code: '0750680G', nom: 'ARAGO', seuils: [38000, 39000, 40000, 41000, 42000] } },
      { row: { code: '0750654D', nom: 'HENRI IV', seuils: [0, 0, 0, 0, 0] } },
      { row: { code: '0750712T', nom: 'VOLTAIRE', seuils: [30000, 31000, 32000, 33000, 34000] } },
    ],
  },
  seuilsBoursiers: {
    rows: [
      { row: { code: '0750680G', nom: 'ARAGO', seuils: [0, 0, 0, 0, 35000], taux_cible_boursiers: 0.25 } },
      { row: { code: '0750712T', nom: 'VOLTAIRE', seuils: [0, 0, 0, 0, 28000], taux_cible_boursiers: 0.30 } },
    ],
  },
  address: {
    features: [
      {
        properties: { label: '12 passage Saint-Ambroise, 75011 Paris', postcode: '75011', city: 'Paris' },
        geometry: { coordinates: [2.37, 48.86] },
      },
    ],
  },
  arcgisCollegeUai: {
    features: [
      {
        attributes: { UAI: '0750247L', Nom: 'COLLEGE VOLTAIRE', secteur: 'Tête' },
        geometry: { x: 2.38, y: 48.85 },
      },
    ],
  },
  arcgisLycees: {
    features: [
      {
        attributes: { UAI: '0750680G', Nom: 'ARAGO', secteur: '1' },
        geometry: { x: 2.39, y: 48.84 },
      },
      {
        attributes: { UAI: '0750712T', Nom: 'VOLTAIRE', secteur: '1' },
        geometry: { x: 2.40, y: 48.86 },
      },
    ],
  },
  effectifs: {
    rows: [
      { row: { UAI: '0750680G', Nom: 'ARAGO', Effectif_2nde_GT_RS25: 280 } },
      { row: { UAI: '0750712T', Nom: 'VOLTAIRE', Effectif_2nde_GT_RS25: 320 } },
    ],
  },
  statsModels: { rows: [], num_rows_total: 0 },
  bonusIpsColleges: [
    {
      Identifiant: '0750247L',
      Nom: 'VOLTAIRE',
      IPS_2025: 110.5,
      Bonus_IPS_2025: 0,
    },
    {
      Identifiant: '0750678E',
      Nom: 'CESARIA EVORA',
      IPS_2025: 78.3,
      Bonus_IPS_2025: 600,
    },
  ],
  collegeList: [
    { uai: '0750247L', nom: 'COLLEGE VOLTAIRE' },
    { uai: '0750678E', nom: 'COLLEGE CESARIA EVORA' },
    { uai: '0751234F', nom: 'COLLEGE BEAUMARCHAIS' },
  ],
  capgeoSector: {
    features: [
      { attributes: { type_etabl: 'COL', libelle: 'VOLTAIRE' } },
    ],
  },
  hfSecteurs: [],
  niveauScolaire: { rows: [] },
  ipsLycees: { rows: [] },
};

const json = (route: Route, body: unknown) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

export async function setupApiMocks(page: Page, overrides: MockOverrides = {}): Promise<void> {
  const m = { ...DEFAULTS, ...overrides };

  await page.route(
    /datasets-server\.huggingface\.co\/rows\?dataset=fgaume(\/|%2F)affelnet-paris-statistiques-champs-disciplinaires/,
    (route) => json(route, m.academicStats),
  );
  await page.route(
    /datasets-server\.huggingface\.co\/rows\?dataset=fgaume(\/|%2F)affelnet-paris-seuils-admission-lycees&/,
    (route) => json(route, m.seuils),
  );
  await page.route(
    /datasets-server\.huggingface\.co\/first-rows\?dataset=fgaume(\/|%2F)affelnet-paris-seuils-admission-lycees-boursiers/,
    (route) => json(route, m.seuilsBoursiers),
  );
  await page.route('https://api-adresse.data.gouv.fr/search/**', (route) => json(route, m.address));
  // Single ArcGIS endpoint shared by 3 query types — branch on `where` param
  await page.route(/services9\.arcgis\.com\/.*\/FeatureServer\/0\/query/, (route) => {
    const url = new URL(route.request().url());
    const where = url.searchParams.get('where') ?? '';
    if (where.includes("secteur<>'Tête'")) return json(route, m.arcgisLycees);
    return json(route, m.arcgisCollegeUai);
  });
  await page.route(
    /datasets-server\.huggingface\.co\/rows\?dataset=fgaume(\/|%2F)affelnet-paris-lycees-effectifs-2nde/,
    (route) => json(route, m.effectifs),
  );
  await page.route(
    /datasets-server\.huggingface\.co\/rows\?dataset=fgaume(\/|%2F)affelnet-paris-stats-models/,
    (route) => json(route, m.statsModels),
  );
  await page.route(
    /datasets-server\.huggingface\.co\/rows\?dataset=fgaume(\/|%2F)affelnet-paris-niveaux-scolaires-lycees/,
    (route) => json(route, m.niveauScolaire),
  );
  await page.route(
    /datasets-server\.huggingface\.co\/rows\?dataset=fgaume(\/|%2F)affelnet-paris-ips-lycees/,
    (route) => json(route, m.ipsLycees),
  );
  await page.route(
    /huggingface\.co\/datasets\/fgaume\/affelnet-paris-bonus-ips-colleges\/raw\/main/,
    (route) => json(route, m.bonusIpsColleges),
  );
  await page.route(/capgeo2\.paris\.fr\//, (route) => json(route, m.capgeoSector));
  await page.route(
    /huggingface\.co\/datasets\/fgaume\/affelnet-paris-secteurs\/resolve\/main/,
    (route) => json(route, m.hfSecteurs),
  );
  await page.route(
    /data\.education\.gouv\.fr\/api\/explore\/v2\.1\/catalog\/datasets\/fr-en-college-effectifs-niveau-sexe-lv\/exports\/json/,
    (route) => json(route, m.collegeList),
  );
}
