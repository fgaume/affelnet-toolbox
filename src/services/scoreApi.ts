import type {
  AcademicStats,
  AcademicStatsResponse,
  DisciplinaryField,
} from '../types/index.ts';
import { DISCIPLINARY_FIELDS } from '../types/index.ts';
import { fetchWithHfCache } from './hfCache';

/** URL for the legacy year-based stats dataset */
const LEGACY_API_URL =
  'https://datasets-server.huggingface.co/rows?dataset=fgaume%2Faffelnet-paris-statistiques-champs-disciplinaires&config=default&split=train&offset=0&length=100';

/** URL for the new stats models V1/V2 dataset */
const MODELS_API_URL =
  'https://datasets-server.huggingface.co/rows?dataset=fgaume%2Faffelnet-paris-stats-models&config=default&split=train';

const FIELD_MAPPING: Record<string, DisciplinaryField> = {
  FRANCAIS: 'FRANCAIS',
  MATHEMATIQUES: 'MATHEMATIQUES',
  'HISTOIRE-GEO': 'HISTOIRE_GEO',
  'LANGUES VIVANTES': 'LANGUES_VIVANTES',
  'SCIENCES-TECHNO-DP': 'SCIENCES_TECHNO_DP',
  ARTS: 'ARTS',
  EPS: 'EPS',
};

/** Default stats model key – resolved dynamically to latest year */
export let DEFAULT_STATS_MODEL = '2025';

/** Human-readable labels for each stats key (populated dynamically) */
export const STATS_MODEL_LABELS: Record<string, string> = {};

interface StatsModelsResponse {
  rows: Array<{
    row: {
      model: string;
      champ: string;
      moyenne: number;
      'ecart-type': number;
    };
  }>;
  num_rows_total: number;
}

interface AllStatsResult {
  availableKeys: string[];
  statsByKey: Map<string, Record<DisciplinaryField, AcademicStats>>;
}

let cachedAllStats: AllStatsResult | null = null;

function parseRows(
  rows: Array<{ row: { champ: string; moyenne: number; 'ecart-type': number } }>,
): Record<DisciplinaryField, AcademicStats> {
  const partial: Partial<Record<DisciplinaryField, AcademicStats>> = {};
  for (const r of rows) {
    const field = FIELD_MAPPING[r.row.champ];
    if (field) {
      partial[field] = { moyenne: r.row.moyenne, ecartType: r.row['ecart-type'] };
    }
  }
  const result = {} as Record<DisciplinaryField, AcademicStats>;
  DISCIPLINARY_FIELDS.forEach((field) => {
    result[field] = partial[field] || { moyenne: 0, ecartType: 0 };
  });
  return result;
}

/**
 * Fetches all academic statistics: latest year from the legacy dataset, V1/V2 from the models dataset.
 * Returns available keys and stats indexed by key.
 */
export async function fetchAllAcademicStats(): Promise<AllStatsResult> {
  if (cachedAllStats) return cachedAllStats;

  const [legacyData, modelsData] = await Promise.all([
    fetchWithHfCache<AcademicStatsResponse>(LEGACY_API_URL),
    fetchWithHfCache<StatsModelsResponse>(MODELS_API_URL),
  ]);

  const statsByKey = new Map<string, Record<DisciplinaryField, AcademicStats>>();
  const keys: string[] = [];

  // Parse latest year from legacy dataset: try current year, fallback to previous
  const legacyRows = legacyData.rows ?? [];
  const currentYear = new Date().getFullYear();
  const legacyCurrentRows = legacyRows.filter((r) => r.row.annee === currentYear);
  const legacyTargetRows = legacyCurrentRows.length > 0
    ? legacyCurrentRows
    : legacyRows.filter((r) => r.row.annee === currentYear - 1);
  if (legacyTargetRows.length > 0) {
    const legacyYear = String(legacyTargetRows[0].row.annee);
    statsByKey.set(legacyYear, parseRows(legacyTargetRows));
    keys.push(legacyYear);
    STATS_MODEL_LABELS[legacyYear] = legacyYear;
    DEFAULT_STATS_MODEL = legacyYear;
  }

  // Parse all experimental models from models dataset
  const modelNames = [...new Set((modelsData.rows ?? []).map((r) => r.row.model))].sort();
  for (const model of modelNames) {
    const modelRows = modelsData.rows.filter((r) => r.row.model === model);
    statsByKey.set(model, parseRows(modelRows));
    keys.push(model);
    STATS_MODEL_LABELS[model] = model;
  }

  cachedAllStats = { availableKeys: keys, statsByKey };
  return cachedAllStats;
}

/**
 * Fetches academic statistics for a specific key (defaults to DEFAULT_STATS_MODEL).
 */
export async function fetchAcademicStats(key?: string): Promise<Record<DisciplinaryField, AcademicStats>> {
  const { availableKeys, statsByKey } = await fetchAllAcademicStats();
  const targetKey = key ?? DEFAULT_STATS_MODEL;
  const stats = statsByKey.get(targetKey);
  if (!stats) throw new Error(`No stats available for key ${targetKey} (available: ${availableKeys.join(', ')})`);
  return stats;
}
