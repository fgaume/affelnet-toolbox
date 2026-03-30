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

/** Alternative 2026 model with different µ/σ values */
const ALT_MODEL_LABEL = '2026 (alt)';
const ALT_MODEL_KEY = -2026; // negative to distinguish from real years

const ALT_MODEL_STATS: Record<DisciplinaryField, AcademicStats> = {
  FRANCAIS:           { moyenne: 12.583, ecartType: 3.145 },
  MATHEMATIQUES:      { moyenne: 12.049, ecartType: 3.962 },
  HISTOIRE_GEO:       { moyenne: 12.885, ecartType: 3.039 },
  LANGUES_VIVANTES:   { moyenne: 13.273, ecartType: 3.050 },
  SCIENCES_TECHNO_DP: { moyenne: 13.157, ecartType: 2.681 },
  ARTS:               { moyenne: 14.700, ecartType: 1.855 },
  EPS:                { moyenne: 14.807, ecartType: 1.774 },
};

export { ALT_MODEL_LABEL, ALT_MODEL_KEY };

interface AllStatsResult {
  availableYears: number[];
  statsByYear: Map<number, Record<DisciplinaryField, AcademicStats>>;
}

let cachedAllStats: AllStatsResult | null = null;

/**
 * Fetches all academic statistics from the Hugging Face API.
 * Returns available years and stats indexed by year.
 */
export async function fetchAllAcademicStats(): Promise<AllStatsResult> {
  if (cachedAllStats) return cachedAllStats;

  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch academic stats: ${response.statusText}`);
  }

  const data: AcademicStatsResponse = await response.json();

  if (!data.rows || data.rows.length === 0) {
    throw new Error('No data found in academic stats response');
  }

  const years = [...new Set(data.rows.map((r) => r.row.annee))].filter(y => y >= 2025).sort();
  const statsByYear = new Map<number, Record<DisciplinaryField, AcademicStats>>();

  for (const year of years) {
    const partial: Partial<Record<DisciplinaryField, AcademicStats>> = {};
    data.rows
      .filter((r) => r.row.annee === year)
      .forEach((r) => {
        const field = FIELD_MAPPING[r.row.champ];
        if (field) {
          partial[field] = {
            moyenne: r.row.moyenne,
            ecartType: r.row['ecart-type'],
          };
        }
      });

    const result = {} as Record<DisciplinaryField, AcademicStats>;
    DISCIPLINARY_FIELDS.forEach((field) => {
      result[field] = partial[field] || { moyenne: 0, ecartType: 0 };
    });
    statsByYear.set(year, result);
  }

  // Inject alternative 2026 model
  statsByYear.set(ALT_MODEL_KEY, ALT_MODEL_STATS);
  years.push(ALT_MODEL_KEY);

  cachedAllStats = { availableYears: years, statsByYear };
  return cachedAllStats;
}

/**
 * Fetches academic statistics for a specific year (defaults to most recent).
 */
export async function fetchAcademicStats(year?: number): Promise<Record<DisciplinaryField, AcademicStats>> {
  const { availableYears, statsByYear } = await fetchAllAcademicStats();
  const targetYear = year ?? Math.max(...availableYears);
  const stats = statsByYear.get(targetYear);
  if (!stats) throw new Error(`No stats available for year ${targetYear}`);
  return stats;
}
