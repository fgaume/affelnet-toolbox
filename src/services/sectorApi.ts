import type { LyceeSecteur } from '../types';
import { wgs84ToWebMercator } from './geo';

const CAPGEO_BASE = 'https://capgeo2.paris.fr/public/rest/services/DASCO/DASCO_Carte_scolaire/MapServer/0/query';
const ARCGIS_BASE = 'https://services9.arcgis.com/ekT8MJFiVh8nvlV5/arcgis/rest/services/Affectation_Lyc%C3%A9es/FeatureServer/0/query';
const ANNEE_SCOLAIRE = '2025-2026';

export async function findCollegeDeSecteur(lat: number, lon: number): Promise<string> {
  const { x, y } = wgs84ToWebMercator(lat, lon);
  const geometry = JSON.stringify({ x, y });
  const where = `annee_scol='${ANNEE_SCOLAIRE}' AND type_etabl='COL'`;

  const params = new URLSearchParams({
    f: 'json',
    where,
    outFields: 'libelle,type_etabl',
    returnGeometry: 'false',
    spatialRel: 'esriSpatialRelIntersects',
    geometryType: 'esriGeometryPoint',
    inSR: '102100',
    outSR: '102100',
    geometry,
  });

  const response = await fetch(`${CAPGEO_BASE}?${params}`);
  if (!response.ok) throw new Error('Erreur de connexion à la carte scolaire');

  const data = await response.json();
  const feature = data.features?.find(
    (f: { attributes: { type_etabl: string } }) => f.attributes.type_etabl === 'COL'
  );

  if (!feature) {
    throw new Error('Aucun collège de secteur trouvé pour cette adresse');
  }

  return feature.attributes.libelle as string;
}

function normalizeCollegeName(libelle: string): string {
  return libelle
    .replace(/^COLLEGE\s+/i, '')
    .replace(/^CLG\s+/i, '')
    .trim();
}

export async function findCollegeUAI(nomCollege: string): Promise<string> {
  const normalizedName = normalizeCollegeName(nomCollege);

  const params = new URLSearchParams({
    outFields: 'Réseau,Nom_Tete',
    returnGeometry: 'false',
    f: 'pjson',
    returnDistinctValues: 'true',
    where: `Nom_Tete like '%${normalizedName}'`,
  });

  const response = await fetch(`${ARCGIS_BASE}?${params}`);
  if (!response.ok) throw new Error('Erreur de connexion à l\'annuaire Affelnet');

  const data = await response.json();

  if (!data.features?.length) {
    throw new Error('Collège non référencé dans l\'annuaire Affelnet');
  }

  return data.features[0].attributes.Réseau as string;
}

// ----- TEMPORARY: Rabelais closure workaround (remove when Rectorat API is updated) -----
const RABELAIS_UAI = '0750688R';
const RABELAIS_REPLACEMENT: Record<string, LyceeSecteur> = {
  // COYSEVOX, BERLIOZ → DECOUR
  '0752319N': { uai: '0750668U', nom: 'JACQUES DECOUR', secteur: 1, isNew: true },
  '0752252R': { uai: '0750668U', nom: 'JACQUES DECOUR', secteur: 1, isNew: true },
  // MALLARMÉ, DORGELÈS, BALZAC → QUINET
  '0752554U': { uai: '0750671X', nom: 'EDGAR QUINET', secteur: 1, isNew: true },
  '0750429J': { uai: '0750671X', nom: 'EDGAR QUINET', secteur: 1, isNew: true },
  '0752553T': { uai: '0750671X', nom: 'EDGAR QUINET', secteur: 1, isNew: true },
  // BORIS VIAN → FERRY
  '0752958H': { uai: '0750669V', nom: 'JULES FERRY', secteur: 1, isNew: true },
  // UTRILLO, FERRY, CLEMENCEAU → COLBERT
  '0751793S': { uai: '0750673Z', nom: 'COLBERT', secteur: 1, isNew: true },
  '0752533W': { uai: '0750673Z', nom: 'COLBERT', secteur: 1, isNew: true },
  '0750546L': { uai: '0750673Z', nom: 'COLBERT', secteur: 1, isNew: true },
  // Gérard PHILIPE, Marie CURIE → BALZAC
  '0752195D': { uai: '0750705J', nom: 'HONORE DE BALZAC', secteur: 1, isNew: true },
  '0754706H': { uai: '0750705J', nom: 'HONORE DE BALZAC', secteur: 1, isNew: true },
};

function applyRabelaisClosure(lycees: LyceeSecteur[], uaiCollege: string): LyceeSecteur[] {
  if (!lycees.some((l) => l.uai === RABELAIS_UAI)) return lycees;
  const filtered = lycees.filter((l) => l.uai !== RABELAIS_UAI);
  const replacement = RABELAIS_REPLACEMENT[uaiCollege];
  if (replacement) {
    const existing = filtered.find((l) => l.uai === replacement.uai && l.secteur === 1);
    if (existing) {
      // Lycée already in sector 1 — just mark it as new
      existing.isNew = true;
    } else {
      filtered.push(replacement);
    }
  }
  return filtered;
}
// ----- END TEMPORARY -----

export async function findLyceesDeSecteur(uaiCollege: string): Promise<LyceeSecteur[]> {
  const params = new URLSearchParams({
    outFields: 'UAI,Nom,secteur',
    returnGeometry: 'false',
    f: 'pjson',
    orderByFields: 'secteur',
  });
  // Manually append 'where' to preserve single quotes unencoded (URLSearchParams encodes ' as %27)
  const whereClause = `secteur<>'Tete' and Réseau='${uaiCollege}'`;
  const url = `${ARCGIS_BASE}?${params}&where=${encodeURIComponent(whereClause).replace(/%27/g, "'")}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Erreur de connexion à l\'annuaire Affelnet');

  const data = await response.json();

  const lycees = (data.features || []).map(
    (f: { attributes: { UAI: string; Nom: string; secteur: string } }) => ({
      uai: f.attributes.UAI,
      nom: f.attributes.Nom,
      secteur: parseInt(f.attributes.secteur, 10),
    })
  );

  return applyRabelaisClosure(lycees, uaiCollege);
}
