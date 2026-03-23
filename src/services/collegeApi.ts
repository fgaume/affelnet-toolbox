import type { Address, College } from '../types';

const ANNUAIRE_API_URL = 'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-annuaire-education/records';

export async function findCollegeByAddress(address: Address): Promise<College | null> {
  try {
    // Recherche du collège de secteur par code commune
    // On utilise l'API de l'annuaire de l'éducation nationale
    const [longitude, latitude] = address.coordinates;

    // Recherche les collèges publics les plus proches dans un rayon de 5km
    const response = await fetch(
      `${ANNUAIRE_API_URL}?` + new URLSearchParams({
        where: `type_etablissement="Collège" AND statut_public_prive="Public"`,
        geofilter_distance: `${latitude},${longitude},5000`,
        order_by: `distance(position, geom'POINT(${longitude} ${latitude})')`,
        limit: '5',
      })
    );

    if (!response.ok) {
      throw new Error('Erreur lors de la recherche du collège');
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const college = data.results[0];
      return {
        uai: college.identifiant_de_l_etablissement || '',
        nom: college.nom_etablissement || '',
        adresse: college.adresse_1 || '',
        codePostal: college.code_postal || '',
        commune: college.nom_commune || '',
        telephone: college.telephone || undefined,
        email: college.mail || undefined,
        siteWeb: college.web || undefined,
        latitude: college.latitude,
        longitude: college.longitude,
        secteur: college.libelle_zone || 'Non défini',
      };
    }

    // Si pas de résultat avec le filtre géographique, recherche par commune
    const fallbackResponse = await fetch(
      `${ANNUAIRE_API_URL}?` + new URLSearchParams({
        where: `type_etablissement="Collège" AND statut_public_prive="Public" AND code_commune="${address.citycode}"`,
        limit: '5',
      })
    );

    if (!fallbackResponse.ok) {
      return null;
    }

    const fallbackData = await fallbackResponse.json();

    if (fallbackData.results && fallbackData.results.length > 0) {
      const college = fallbackData.results[0];
      return {
        uai: college.identifiant_de_l_etablissement || '',
        nom: college.nom_etablissement || '',
        adresse: college.adresse_1 || '',
        codePostal: college.code_postal || '',
        commune: college.nom_commune || '',
        telephone: college.telephone || undefined,
        email: college.mail || undefined,
        siteWeb: college.web || undefined,
        latitude: college.latitude,
        longitude: college.longitude,
        secteur: college.libelle_zone || 'Non défini',
      };
    }

    return null;
  } catch (error) {
    console.error('Erreur API Collège:', error);
    return null;
  }
}

export async function searchCollegeByName(query: string): Promise<College[]> {
  if (!query || query.length < 2) {
    return [];
  }

  try {
    const response = await fetch(
      `${ANNUAIRE_API_URL}?` + new URLSearchParams({
        where: `type_etablissement="Collège" AND nom_etablissement LIKE "%${query.toUpperCase()}%"`,
        limit: '10',
      })
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    return (data.results || []).map((college: Record<string, unknown>) => ({
      uai: college.identifiant_de_l_etablissement || '',
      nom: college.nom_etablissement || '',
      adresse: college.adresse_1 || '',
      codePostal: college.code_postal || '',
      commune: college.nom_commune || '',
      telephone: college.telephone || undefined,
      email: college.mail || undefined,
      siteWeb: college.web || undefined,
      latitude: college.latitude,
      longitude: college.longitude,
      secteur: college.libelle_zone || 'Non défini',
    }));
  } catch (error) {
    console.error('Erreur recherche collège:', error);
    return [];
  }
}
