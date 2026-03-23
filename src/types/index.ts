export interface Address {
  label: string;
  housenumber?: string;
  street?: string;
  postcode: string;
  city: string;
  citycode: string;
  context: string;
  coordinates: [number, number]; // [longitude, latitude]
}

export interface AddressSuggestion {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: {
    label: string;
    score: number;
    housenumber?: string;
    id: string;
    name: string;
    postcode: string;
    citycode: string;
    x: number;
    y: number;
    city: string;
    context: string;
    type: string;
    street?: string;
  };
}

export interface College {
  uai: string;
  nom: string;
  adresse: string;
  codePostal: string;
  commune: string;
  telephone?: string;
  email?: string;
  siteWeb?: string;
  latitude?: number;
  longitude?: number;
  secteur: string;
}

export interface SearchHistory {
  id: string;
  address: Address;
  college: College | null;
  timestamp: number;
}

export interface ApiAddressResponse {
  type: string;
  version: string;
  features: AddressSuggestion[];
  attribution: string;
  licence: string;
  query: string;
  limit: number;
}
