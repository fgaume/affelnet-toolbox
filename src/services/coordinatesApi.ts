// src/services/coordinatesApi.ts
// Fetches establishment coordinates from the Annuaire de l'Éducation (OpenData).

const ANNUAIRE_EXPORT_URL =
  'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-annuaire-education/exports/json/' +
  '?select=identifiant_de_l_etablissement+as+uai%2C+latitude%2C+longitude' +
  '&where=code_academie%3D%2201%22' +
  '+AND+(type_etablissement%3D%22Coll%C3%A8ge%22+OR+type_etablissement%3D%22Lyc%C3%A9e%22)' +
  '&limit=-1';

interface AnnuaireRecord {
  uai: string;
  latitude: number;
  longitude: number;
}

let coordsCache: Map<string, [number, number]> | null = null;

/** Load coordinates for all Paris colleges and lycées. Cached after first call. */
export async function loadCoordinates(): Promise<Map<string, [number, number]>> {
  if (coordsCache) return coordsCache;

  const response = await fetch(ANNUAIRE_EXPORT_URL);
  if (!response.ok) {
    coordsCache = new Map();
    return coordsCache;
  }

  const data: AnnuaireRecord[] = await response.json();
  coordsCache = new Map();
  for (const r of data) {
    if (r.latitude != null && r.longitude != null) {
      coordsCache.set(r.uai, [r.longitude, r.latitude]);
    }
  }
  return coordsCache;
}

/** Get coordinates for a single UAI. Returns undefined if not found. */
export async function getCoordinates(uai: string): Promise<[number, number] | undefined> {
  const coords = await loadCoordinates();
  return coords.get(uai);
}
