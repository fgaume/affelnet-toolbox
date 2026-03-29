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

export interface CollegeSecteur {
  nom: string;
  uai: string;
  coordinates?: [number, number]; // [longitude, latitude]
}

export interface LyceeSecteur {
  uai: string;
  nom: string;
  secteur: number;
  isNew?: boolean;
  coordinates?: [number, number]; // [longitude, latitude]
}

export interface EffectifLycee {
  uai: string;
  nom: string;
  effectif: number;
  annee: string;
}

export interface SectorResult {
  college: CollegeSecteur;
  lycees: LyceeSecteur[] | null;
  lyceeError?: string;
}

export interface SearchHistory {
  id: string;
  address: Address;
  result: SectorResult;
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

export interface College {
  uai: string;
  nom: string;
}

export interface IpsInfo {
  ips: number;
  bonus: number;
}
