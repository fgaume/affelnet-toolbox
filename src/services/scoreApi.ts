import type {
  AcademicStats,
  AcademicStatsResponse,
  DisciplinaryField,
} from '../types/index.ts';
import { DISCIPLINARY_FIELDS } from '../types/index.ts';

const API_URL =
  'https://datasets-server.huggingface.co/rows?dataset=fgaume%2Faffelnet-paris-statistiques-champs-disciplinaires&config=default&split=train&offset=0&length=100';

const FIELD_MAPPING: Record<string, DisciplinaryField> = {
  FRANCAIS: 'FRANCAIS',
  MATHEMATIQUES: 'MATHEMATIQUES',
  'HISTOIRE-GEO': 'HISTOIRE_GEO',
  'LANGUES VIVANTES': 'LANGUES_VIVANTES',
  'SCIENCES-TECHNO-DP': 'SCIENCES_TECHNO_DP',
  ARTS: 'ARTS',
  EPS: 'EPS',
};

/**
 * Fetches academic statistics from the Hugging Face API.
 * Maps the most recent year's data to a Record<DisciplinaryField, AcademicStats>.
 */
export async function fetchAcademicStats(): Promise<Record<DisciplinaryField, AcademicStats>> {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch academic stats: ${response.statusText}`);
    }

    const data: AcademicStatsResponse = await response.json();

    if (!data.rows || data.rows.length === 0) {
      throw new Error('No data found in academic stats response');
    }

    // Find the most recent year
    const maxAnnee = Math.max(...data.rows.map((r) => r.row.annee));

    // Filter rows for the most recent year and map them
    const stats: Partial<Record<DisciplinaryField, AcademicStats>> = {};

    data.rows
      .filter((r) => r.row.annee === maxAnnee)
      .forEach((r) => {
        const field = FIELD_MAPPING[r.row.champ];
        if (field) {
          stats[field] = {
            moyenne: r.row.moyenne,
            ecartType: r.row['ecart-type'],
          };
        }
      });

    // Ensure all fields are present (default to 0 if missing, though they shouldn't be)
    const result = {} as Record<DisciplinaryField, AcademicStats>;
    DISCIPLINARY_FIELDS.forEach((field) => {
      result[field] = stats[field] || { moyenne: 0, ecartType: 0 };
    });

    return result;
  } catch (error) {
    console.error('Error fetching academic stats:', error);
    throw error;
  }
}
