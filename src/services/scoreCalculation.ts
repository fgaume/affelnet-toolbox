import type {
  UserGrades,
  AcademicStats,
  DisciplinaryField,
  UserScore,
  Subject,
  ScoreDetail,
  FinalScores,
} from '../types';
import { DISCIPLINARY_FIELDS } from '../types';

export const GEO_BONUS = {
  SECTEUR_1: 32640,
  SECTEUR_2: 17760,
  SECTEUR_3: 16800,
} as const;

const FIELD_MAPPING: Record<DisciplinaryField, Subject[]> = {
  FRANCAIS: ['FRANCAIS'],
  MATHEMATIQUES: ['MATHEMATIQUES'],
  HISTOIRE_GEO: ['HISTOIRE_GEO', 'EMC'],
  LANGUES_VIVANTES: ['LV1', 'LV2'],
  SCIENCES_TECHNO_DP: ['SVT', 'TECHNOLOGIE', 'PHYSIQUE_CHIMIE'],
  ARTS: ['ARTS_PLASTIQUES', 'EDUCATION_MUSICALE'],
  EPS: ['EPS'],
};

export const FIELD_WEIGHTS: Record<DisciplinaryField, number> = {
  FRANCAIS: 5,
  MATHEMATIQUES: 5,
  HISTOIRE_GEO: 4,
  LANGUES_VIVANTES: 4,
  SCIENCES_TECHNO_DP: 4,
  ARTS: 4,
  EPS: 4,
};

/**
 * Calculates the Affelnet score based on user grades and academic stats.
 * 
 * The calculation follows these steps:
 * 1. Subject Grouping: Map 12 subjects into 7 disciplinary fields.
 * 2. Raw Average: Calculate the average of non-null grades in each field.
 * 3. Harmonization: Apply H = 10 * [10 + (T - mu) / sigma]
 * 4. Weighting: Apply coefficients (5 for FR/Maths, 4 for others).
 * 5. Final Score: (Sum of weighted harmonized scores) * 2.
 */
export const DEFAULT_MULTIPLIER = 2.3;

export function calculateAffelnetScore(
  grades: UserGrades,
  stats: Record<DisciplinaryField, AcademicStats>,
  multiplier: number = DEFAULT_MULTIPLIER
): UserScore {
  const details = {} as Record<DisciplinaryField, ScoreDetail>;
  let weightedSum = 0;

  for (const field of DISCIPLINARY_FIELDS) {
    const subjects = FIELD_MAPPING[field];
    const fieldGrades = subjects
      .map((s) => grades[s])
      .filter((g): g is number => g !== null);

    let rawAverage = 0;
    let harmonizedNote = 0;
    let contribution = 0;

    if (fieldGrades.length > 0) {
      rawAverage = fieldGrades.reduce((a, b) => a + b, 0) / fieldGrades.length;
      
      const fieldStats = stats[field];
      if (fieldStats) {
        const { moyenne: mu, ecartType: sigma } = fieldStats;
        // H = 10 * [10 + (T - mu) / sigma]
        harmonizedNote = 10 * (10 + (rawAverage - mu) / sigma);
      }
      
      const weight = FIELD_WEIGHTS[field];
      contribution = harmonizedNote * weight;
    }

    details[field] = {
      rawAverage,
      harmonizedNote,
      contribution,
    };

    weightedSum += contribution;
  }

  return {
    weightedSum,
    totalScore: weightedSum * multiplier,
    details,
  };
}

export function calculateFinalScores(
  academicScore: number,
  ipsBonus: number = 0,
  boursierBonus: number = 0
): FinalScores {
  return {
    academicScore,
    ipsBonus,
    boursierBonus,
    secteur1: academicScore + ipsBonus + boursierBonus + GEO_BONUS.SECTEUR_1,
    secteur2: academicScore + ipsBonus + boursierBonus + GEO_BONUS.SECTEUR_2,
    secteur3: academicScore + ipsBonus + boursierBonus + GEO_BONUS.SECTEUR_3,
  };
}
