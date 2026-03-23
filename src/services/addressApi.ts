import type { Address, AddressSuggestion, ApiAddressResponse } from '../types';

const API_BASE_URL = 'https://api-adresse.data.gouv.fr';

export async function searchAddress(query: string): Promise<AddressSuggestion[]> {
  if (!query || query.length < 3) {
    return [];
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/search/?q=${encodeURIComponent(query)}&limit=5&type=housenumber&citycode=75056`
    );

    if (!response.ok) {
      throw new Error('Erreur lors de la recherche d\'adresse');
    }

    const data: ApiAddressResponse = await response.json();
    return data.features;
  } catch (error) {
    console.error('Erreur API Adresse:', error);
    return [];
  }
}

export function suggestionToAddress(suggestion: AddressSuggestion): Address {
  const { properties, geometry } = suggestion;
  return {
    label: properties.label,
    housenumber: properties.housenumber,
    street: properties.street,
    postcode: properties.postcode,
    city: properties.city,
    citycode: properties.citycode,
    context: properties.context,
    coordinates: geometry.coordinates,
  };
}
