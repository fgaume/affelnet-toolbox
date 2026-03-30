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

export const SUBJECTS = [
  'FRANCAIS',
  'MATHEMATIQUES',
  'HISTOIRE_GEO',
  'LV1',
  'LV2',
  'EPS',
  'ARTS_PLASTIQUES',
  'EDUCATION_MUSICALE',
  'SVT',
  'TECHNOLOGIE',
  'PHYSIQUE_CHIMIE',
  'EMC',
] as const;

export type Subject = (typeof SUBJECTS)[number];

export const DISCIPLINARY_FIELDS = [
  'FRANCAIS',
  'MATHEMATIQUES',
  'HISTOIRE_GEO',
  'LANGUES_VIVANTES',
  'SCIENCES_TECHNO_DP',
  'ARTS',
  'EPS',
] as const;

export type DisciplinaryField = (typeof DISCIPLINARY_FIELDS)[number];

export type UserGrades = Record<Subject, number | null>;

export interface AcademicStats {
  moyenne: number;
  ecartType: number;
}

export interface ScoreDetail {
  rawAverage: number;
  harmonizedNote: number;
  contribution: number;
}

export interface UserScore {
  weightedSum: number; // Sum of weighted harmonized scores (before multiplier)
  totalScore: number; // Academic score = weightedSum * multiplier
  details: Record<DisciplinaryField, ScoreDetail>;
}

export interface FinalScores {
  academicScore: number;
  ipsBonus: number;
  boursierBonus: number;
  secteur1: number;
  secteur2: number;
  secteur3: number;
}

export interface AcademicStatsResponse {
  rows: Array<{
    row: {
      annee: number;
      champ: string;
      moyenne: number;
      'ecart-type': number;
    };
  }>;
  num_rows_total: number;
}

export type TopTab = 'search' | 'score';
export type SearchMode = 'address' | 'college';
