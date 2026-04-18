import type { LyceeSecteur } from '../types';
import { wgs84ToWebMercator } from './geo';
import { fetchWithHfCache } from './hfCache';
import { getCoordinates, loadCoordinates } from './coordinatesApi';

const CAPGEO_BASE = 'https://capgeo2.paris.fr/public/rest/services/DASCO/DASCO_Carte_scolaire/MapServer/0/query';
const ARCGIS_BASE = 'https://services9.arcgis.com/ekT8MJFiVh8nvlV5/arcgis/rest/services/Affectation_Lyc%C3%A9es/FeatureServer/0/query';

// ----- Hugging Face fallback when ArcGIS requires authentication -----
const HF_SECTEURS_URL =
  'https://huggingface.co/datasets/fgaume/affelnet-paris-secteurs/resolve/main/secteur_college_lycee_affelnet.json';
const HF_SECTEURS_YEAR = 2025;

interface HfSecteurRecord {
  uai_college: string;
  nom_college: string;
  uai_lycee: string;
  nom_lycee: string;
  annee: number;
  secteur: number;
}

let hfSecteursCache: HfSecteurRecord[] | null = null;

async function loadHfSecteurs(): Promise<HfSecteurRecord[]> {
  if (hfSecteursCache) return hfSecteursCache;
  const all = await fetchWithHfCache<HfSecteurRecord[]>(HF_SECTEURS_URL);
  hfSecteursCache = all.filter((r) => r.annee === HF_SECTEURS_YEAR);
  return hfSecteursCache;
}

/** Returns true if ArcGIS response contains an error (e.g. token required) */
function isArcgisError(data: unknown): boolean {
  return typeof data === 'object' && data !== null && 'error' in data;
}
// ----- END Hugging Face fallback -----

function getAnneeScolaireCandidates(): [string, string] {
  const year = new Date().getFullYear();
  return [`${year}-${year + 1}`, `${year - 1}-${year}`];
}

async function queryCarteScolaire(
  lat: number,
  lon: number,
  anneeScolaire: string,
): Promise<string | null> {
  const { x, y } = wgs84ToWebMercator(lat, lon);
  const geometry = JSON.stringify({ x, y });
  const where = `annee_scol='${anneeScolaire}' AND type_etabl='COL'`;

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
  if (!response.ok) return null;

  const data = await response.json();
  const feature = data.features?.find(
    (f: { attributes: { type_etabl: string } }) => f.attributes.type_etabl === 'COL',
  );

  return feature ? (feature.attributes.libelle as string) : null;
}

export async function findCollegeDeSecteur(lat: number, lon: number): Promise<string> {
  const [current, previous] = getAnneeScolaireCandidates();

  const result = await queryCarteScolaire(lat, lon, current);
  if (result) return result;

  const fallback = await queryCarteScolaire(lat, lon, previous);
  if (fallback) return fallback;

  throw new Error('Aucun collège de secteur trouvé pour cette adresse');
}

function normalizeCollegeName(libelle: string): string {
  return libelle
    .replace(/^COLLEGE\s+/i, '')
    .replace(/^CLG\s+/i, '')
    .trim();
}

export async function findCollegeUAI(nomCollege: string): Promise<{ uai: string; coordinates?: [number, number] }> {
  const normalizedName = normalizeCollegeName(nomCollege);

  try {
    const params = new URLSearchParams({
      outFields: 'UAI,Nom,secteur',
      returnGeometry: 'true',
      outSR: '4326',
      f: 'pjson',
      where: `Nom like '%${normalizedName}' and secteur='Tête'`,
    });

    const response = await fetch(`${ARCGIS_BASE}?${params}`);
    if (!response.ok) throw new Error('ArcGIS HTTP error');

    const data = await response.json();
    if (isArcgisError(data)) throw new Error('ArcGIS token required');

    if (!data.features?.length) {
      // Fallback search without secteur='Tête' if not found
      const fallbackParams = new URLSearchParams({
        outFields: 'Réseau,Nom_Tete',
        returnGeometry: 'true',
        outSR: '4326',
        f: 'pjson',
        returnDistinctValues: 'true',
        where: `Nom_Tete like '%${normalizedName}'`,
      });
      const fallbackResponse = await fetch(`${ARCGIS_BASE}?${fallbackParams}`);
      const fallbackData = await fallbackResponse.json();
      if (isArcgisError(fallbackData)) throw new Error('ArcGIS token required');

      if (!fallbackData.features?.length) {
        throw new Error('Collège non référencé dans l\'annuaire Affelnet');
      }

      const feat = fallbackData.features[0];
      const geom = feat.geometry;
      return {
        uai: feat.attributes.Réseau as string,
        coordinates: geom?.x != null && geom?.y != null ? [geom.x, geom.y] : undefined
      };
    }

    const feat = data.features[0];
    const uai = feat.attributes.UAI as string;
    const geom = feat.geometry;
    const coordinates: [number, number] | undefined = geom?.x != null && geom?.y != null
      ? [geom.x, geom.y]
      : undefined;

    return { uai, coordinates };
  } catch {
    // Fallback: Hugging Face dataset + Annuaire coordinates
    const records = await loadHfSecteurs();
    const upperName = normalizedName.toUpperCase();
    const match = records.find((r) => r.nom_college === upperName);
    if (!match) throw new Error('Collège non référencé dans l\'annuaire Affelnet');
    const coordinates = await getCoordinates(match.uai_college);
    return { uai: match.uai_college, coordinates };
  }
}

/** Look up college coordinates by UAI from ArcGIS */
export async function findCollegeCoordinates(uai: string): Promise<[number, number] | undefined> {
  try {
    const params = new URLSearchParams({
      outFields: 'UAI',
      returnGeometry: 'true',
      outSR: '4326',
      f: 'pjson',
      where: `UAI='${uai}' and secteur='Tête'`,
    });
    const response = await fetch(`${ARCGIS_BASE}?${params}`);
    if (!response.ok) return undefined;
    const data = await response.json();
    if (isArcgisError(data)) return undefined;
    if (!data.features?.length) return undefined;
    const geom = data.features[0].geometry;
    return geom?.x != null && geom?.y != null ? [geom.x, geom.y] : undefined;
  } catch {
    // ArcGIS unavailable — use Annuaire de l'Éducation
    return getCoordinates(uai);
  }
}

// ----- TEMPORARY: Rabelais closure workaround (remove when Rectorat API is updated) -----
const RABELAIS_UAI = '0750688R';
const RABELAIS_REPLACEMENT: Record<string, LyceeSecteur> = {
  // COYSEVOX, BERLIOZ → DECOUR
  '0752319N': { uai: '0750668U', nom: 'JACQUES DECOUR', secteur: 1, isNew: true, coordinates: [2.3426829, 48.8817204] },
  '0752252R': { uai: '0750668U', nom: 'JACQUES DECOUR', secteur: 1, isNew: true, coordinates: [2.3426829, 48.8817204] },
  // MALLARMÉ, DORGELÈS, BALZAC → QUINET
  '0752554U': { uai: '0750671X', nom: 'EDGAR QUINET', secteur: 1, isNew: true, coordinates: [2.3274218, 48.8824345] },
  '0750429J': { uai: '0750671X', nom: 'EDGAR QUINET', secteur: 1, isNew: true, coordinates: [2.3274218, 48.8824345] },
  '0752553T': { uai: '0750671X', nom: 'EDGAR QUINET', secteur: 1, isNew: true, coordinates: [2.3274218, 48.8824345] },
  // BORIS VIAN → FERRY
  '0752958H': { uai: '0750669V', nom: 'JULES FERRY', secteur: 1, isNew: true, coordinates: [2.3308332, 48.8841496] },
  // UTRILLO, FERRY, CLEMENCEAU → COLBERT
  '0751793S': { uai: '0750673Z', nom: 'COLBERT', secteur: 1, isNew: true, coordinates: [2.3683884, 48.8770514] },
  '0752533W': { uai: '0750673Z', nom: 'COLBERT', secteur: 1, isNew: true, coordinates: [2.3683884, 48.8770514] },
  '0750546L': { uai: '0750673Z', nom: 'COLBERT', secteur: 1, isNew: true, coordinates: [2.3683884, 48.8770514] },
  // Gérard PHILIPE, Marie CURIE → BALZAC
  '0752195D': { uai: '0750705J', nom: 'HONORE DE BALZAC', secteur: 1, isNew: true, coordinates: [2.3134106, 48.8920405] },
  '0754706H': { uai: '0750705J', nom: 'HONORE DE BALZAC', secteur: 1, isNew: true, coordinates: [2.3134106, 48.8920405] },
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
  try {
    const params = new URLSearchParams({
      outFields: 'UAI,Nom,secteur',
      returnGeometry: 'true',
      outSR: '4326',
      f: 'pjson',
      orderByFields: 'secteur',
    });
    // Manually append 'where' to preserve single quotes unencoded (URLSearchParams encodes ' as %27)
    const whereClause = `secteur<>'Tête' and Réseau='${uaiCollege}'`;
    const url = `${ARCGIS_BASE}?${params}&where=${encodeURIComponent(whereClause).replace(/%27/g, "'")}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('ArcGIS HTTP error');

    const data = await response.json();
    if (isArcgisError(data)) throw new Error('ArcGIS token required');

    const lycees = (data.features || []).map(
      (f: { attributes: { UAI: string; Nom: string; secteur: string }; geometry?: { x: number; y: number } }) => ({
        uai: f.attributes.UAI,
        nom: f.attributes.Nom,
        secteur: parseInt(f.attributes.secteur, 10),
        coordinates: f.geometry?.x != null && f.geometry?.y != null ? [f.geometry.x, f.geometry.y] as [number, number] : undefined,
      })
    );

    return applyRabelaisClosure(lycees, uaiCollege);
  } catch {
    // Fallback: Hugging Face dataset + Annuaire coordinates
    const [records, coordsMap] = await Promise.all([loadHfSecteurs(), loadCoordinates()]);
    const matches = records.filter((r) => r.uai_college === uaiCollege);
    if (!matches.length) throw new Error('Aucun lycée de secteur trouvé');

    const lycees: LyceeSecteur[] = matches.map((r) => ({
      uai: r.uai_lycee,
      nom: r.nom_lycee,
      secteur: r.secteur,
      coordinates: coordsMap.get(r.uai_lycee),
    }));

    return applyRabelaisClosure(lycees, uaiCollege);
  }
}
