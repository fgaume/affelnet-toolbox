import type {
  UserGrades,
  AcademicStats,
  DisciplinaryField,
  UserScore,
  Subject,
  ScoreDetail,
  ScoreLinearTerm,
  FinalScores,
} from '../types';
import { DISCIPLINARY_FIELDS } from '../types';

// Official weekly hours per subject (3ème)
const HOURLY_WEIGHTS: Array<[Subject, number]> = [
  ['FRANCAIS', 4],
  ['MATHEMATIQUES', 3.5],
  ['LV1', 3],
  ['LV2', 2.5],
  ['EPS', 3],
  ['PHYSIQUE_CHIMIE', 1.5],
  ['SVT', 1.5],
  ['TECHNOLOGIE', 1.5],
  ['ARTS_PLASTIQUES', 1],
  ['EDUCATION_MUSICALE', 1],
];

// HISTOIRE_GEO and EMC share 3.5h: average them first, then apply the weight
export function calculateWeightedAverage(grades: UserGrades): number | null {
  let weightedSum = 0;
  let totalHours = 0;

  for (const [subject, hours] of HOURLY_WEIGHTS) {
    const grade = grades[subject];
    if (grade !== null) {
      weightedSum += grade * hours;
      totalHours += hours;
    }
  }

  const hgGrade = grades.HISTOIRE_GEO;
  const emcGrade = grades.EMC;
  if (hgGrade !== null) {
    const avg = emcGrade !== null ? (hgGrade + emcGrade) / 2 : hgGrade;
    weightedSum += avg * 3.5;
    totalHours += 3.5;
  }

  return totalHours > 0 ? weightedSum / totalHours : null;
}

/**
 * Seuils d'admission LLG/H4 (moyenne pondérée) par tier de bonus IPS.
 * Valeurs observées du dernier admis selon la catégorie de bonus IPS
 * (source : Rectorat de Paris).
 */
export const LLG_H4_THRESHOLD_BY_IPS_BONUS: Record<number, number> = {
  1200: 18.0,
  800: 18.25,
  400: 18.15,
  0: 18.26,
};

/**
 * Seuil LLG/H4 applicable pour un bonus IPS donné. Tout bonus inconnu
 * retombe sur le seuil « sans bonus » (le plus exigeant).
 */
export function getLlgH4Threshold(ipsBonus: number): number {
  return LLG_H4_THRESHOLD_BY_IPS_BONUS[ipsBonus] ?? LLG_H4_THRESHOLD_BY_IPS_BONUS[0];
}

export const GEO_BONUS = {
  SECTEUR_1: 32640,
  SECTEUR_2: 17760,
  SECTEUR_3: 16800,
} as const;

/** Bonus forfaitaire ajouté au barème pour les élèves boursiers. */
export const BOURSIER_BONUS = 600;

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
 * 5. Final Score: (Sum of weighted harmonized scores) * WEIGHTING_COEFFICIENT.
 */

/** Coefficient de pondération scolaire — valeur officielle fixe. */
export const WEIGHTING_COEFFICIENT = 2.5;

export function calculateAffelnetScore(
  grades: UserGrades,
  stats: Record<DisciplinaryField, AcademicStats>
): UserScore {
  const details = {} as Record<DisciplinaryField, ScoreDetail>;
  let weightedSum = 0;

  // Développement affine du barème : B = intercept + Σ slope·T (cf. ScoreLinearModel).
  let intercept = 0;
  const linearTerms: ScoreLinearTerm[] = [];

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
      const weight = FIELD_WEIGHTS[field];

      const fieldStats = stats[field];
      if (fieldStats) {
        const { moyenne: mu, ecartType: sigma } = fieldStats;
        // H = 10 * [10 + (T - mu) / sigma]
        harmonizedNote = 10 * (10 + (rawAverage - mu) / sigma);

        // 2.5·coef·H développé : partie constante + partie proportionnelle à T.
        // 2.5·coef·H = 2.5·coef·(100 − 10μ/σ) + (25·coef/σ)·T
        const slope = (WEIGHTING_COEFFICIENT * 10 * weight) / sigma;
        intercept += WEIGHTING_COEFFICIENT * weight * (100 - (10 * mu) / sigma);
        linearTerms.push({ field, rawAverage, slope, contribution: slope * rawAverage });
      }

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
    totalScore: weightedSum * WEIGHTING_COEFFICIENT,
    details,
    linearModel: { intercept, terms: linearTerms },
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
