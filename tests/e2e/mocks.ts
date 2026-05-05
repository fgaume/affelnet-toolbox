import type { Page, Route } from '@playwright/test';

export interface MockOverrides {
  academicStats?: unknown;
  seuils?: unknown;
  address?: unknown;
  sectorCollege?: unknown;
  collegeUai?: unknown;
  sectorLycees?: unknown;
  effectifs?: unknown;
  statsModels?: unknown;
  niveauScolaire?: unknown;
  ipsLycees?: unknown;
  seuilsBoursiers?: unknown;
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
  sectorCollege: { features: [{ attributes: { NOM_COLLEG: 'VOLTAIRE' } }] },
  collegeUai: {
    features: [{ attributes: { UAI: '0750247L', NOM: 'VOLTAIRE' }, geometry: { x: 2.38, y: 48.85 } }],
  },
  sectorLycees: {
    features: [
      { attributes: { UAI: '0750680G', NOM_ETAB: 'ARAGO', SECTEUR: 1 }, geometry: { x: 2.39, y: 48.84 } },
    ],
  },
  effectifs: {
    results: [{ uai: '0750680G', nom: 'ARAGO', effectifs: 100 }],
  },
  statsModels: { rows: [], num_rows_total: 0 },
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
  await page.route(
    '**/services9.arcgis.com/**/Sector_College/FeatureServer/0/query**',
    (route) => json(route, m.sectorCollege),
  );
  await page.route(
    '**/services9.arcgis.com/**/COLLEGES_PARIS_UAI/FeatureServer/0/query**',
    (route) => json(route, m.collegeUai),
  );
  await page.route(
    '**/services9.arcgis.com/**/Sector_Lycees/FeatureServer/0/query**',
    (route) => json(route, m.sectorLycees),
  );
  await page.route(
    '**/data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-etablissements-publics-et-prives-d-ile-de-france/records**',
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
}
