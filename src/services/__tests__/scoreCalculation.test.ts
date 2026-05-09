import { describe, it, expect } from 'vitest';
import { calculateAffelnetScore } from '../scoreCalculation';
import type { UserGrades, AcademicStats, DisciplinaryField } from '../../types';

describe('scoreCalculation', () => {
  const mockStats: Record<DisciplinaryField, AcademicStats> = {
    FRANCAIS: { moyenne: 12, ecartType: 3 },
    MATHEMATIQUES: { moyenne: 10, ecartType: 4 },
    HISTOIRE_GEO: { moyenne: 11, ecartType: 2.5 },
    LANGUES_VIVANTES: { moyenne: 13, ecartType: 2 },
    SCIENCES_TECHNO_DP: { moyenne: 11.5, ecartType: 3.5 },
    ARTS: { moyenne: 14, ecartType: 1.5 },
    EPS: { moyenne: 15, ecartType: 2 },
  };

  const emptyGrades: UserGrades = {
    FRANCAIS: null,
    MATHEMATIQUES: null,
    HISTOIRE_GEO: null,
    LV1: null,
    LV2: null,
    EPS: null,
    ARTS_PLASTIQUES: null,
    EDUCATION_MUSICALE: null,
    SVT: null,
    TECHNOLOGIE: null,
    PHYSIQUE_CHIMIE: null,
    EMC: null,
  };

  it('calculates basic harmonization correctly', () => {
    // T = 15, mu = 12, sigma = 3
    // H = 10 * [10 + (15 - 12) / 3] = 10 * [10 + 1] = 110
    const grades: UserGrades = { ...emptyGrades, FRANCAIS: 15 };
    const score = calculateAffelnetScore(grades, mockStats);
    expect(score.details.FRANCAIS.harmonizedNote).toBeCloseTo(110);
  });

  it('uses HISTOIRE_GEO as fallback for EMC if EMC is null', () => {
    const grades: UserGrades = { ...emptyGrades, HISTOIRE_GEO: 14, EMC: null };
    const score = calculateAffelnetScore(grades, mockStats);
    // HISTOIRE_GEO field uses (HISTOIRE_GEO + EMC) / 2 if both present
    // If EMC is null, it should use HISTOIRE_GEO alone (effectively 14)
    expect(score.details.HISTOIRE_GEO.rawAverage).toBe(14);
  });

  it('correctly averages SCIENCES_TECHNO_DP (SVT, TECHNOLOGIE, PHYSIQUE_CHIMIE)', () => {
    const grades: UserGrades = {
      ...emptyGrades,
      SVT: 12,
      TECHNOLOGIE: 14,
      PHYSIQUE_CHIMIE: 16,
    };
    const score = calculateAffelnetScore(grades, mockStats);
    expect(score.details.SCIENCES_TECHNO_DP.rawAverage).toBe(14); // (12+14+16)/3
  });

  it('correctly averages ARTS (ARTS_PLASTIQUES, EDUCATION_MUSICALE)', () => {
    const grades: UserGrades = {
      ...emptyGrades,
      ARTS_PLASTIQUES: 13,
      EDUCATION_MUSICALE: 17,
    };
    const score = calculateAffelnetScore(grades, mockStats);
    expect(score.details.ARTS.rawAverage).toBe(15); // (13+17)/2
  });

  it('correctly averages LANGUES_VIVANTES (LV1, LV2)', () => {
    const grades: UserGrades = {
      ...emptyGrades,
      LV1: 14,
      LV2: 12,
    };
    const score = calculateAffelnetScore(grades, mockStats);
    expect(score.details.LANGUES_VIVANTES.rawAverage).toBe(13); // (14+12)/2
  });

  it('applies correct weights (x5 for FRANCAIS/MATHS, x4 for others)', () => {
    // All raw grades = mu => H = 100
    const grades: UserGrades = {
      FRANCAIS: 12,
      MATHEMATIQUES: 10,
      HISTOIRE_GEO: 11,
      LV1: 13,
      LV2: 13,
      EPS: 15,
      ARTS_PLASTIQUES: 14,
      EDUCATION_MUSICALE: 14,
      SVT: 11.5,
      TECHNOLOGIE: 11.5,
      PHYSIQUE_CHIMIE: 11.5,
      EMC: 11,
    };
    const score = calculateAffelnetScore(grades, mockStats);
    
    expect(score.details.FRANCAIS.contribution).toBe(500); // 100 * 5
    expect(score.details.MATHEMATIQUES.contribution).toBe(500); // 100 * 5
    expect(score.details.HISTOIRE_GEO.contribution).toBe(400); // 100 * 4
    expect(score.details.LANGUES_VIVANTES.contribution).toBe(400); // 100 * 4
    expect(score.details.SCIENCES_TECHNO_DP.contribution).toBe(400); // 100 * 4
    expect(score.details.ARTS.contribution).toBe(400); // 100 * 4
    expect(score.details.EPS.contribution).toBe(400); // 100 * 4
  });

  it('calculates the final total as (Sum of weighted scores) * multiplier', () => {
    // If all H = 100, Sum = (100*5)*2 + (100*4)*5 = 1000 + 2000 = 3000
    // Total = 3000 * 2.3 = 6900
    const grades: UserGrades = {
      FRANCAIS: 12,
      MATHEMATIQUES: 10,
      HISTOIRE_GEO: 11,
      LV1: 13,
      LV2: 13,
      EPS: 15,
      ARTS_PLASTIQUES: 14,
      EDUCATION_MUSICALE: 14,
      SVT: 11.5,
      TECHNOLOGIE: 11.5,
      PHYSIQUE_CHIMIE: 11.5,
      EMC: 11,
    };
    const score = calculateAffelnetScore(grades, mockStats);
    expect(score.totalScore).toBeCloseTo(6900, 9);
  });

  it('handles missing grades within a field correctly', () => {
    // Only one science grade
    const grades: UserGrades = {
      ...emptyGrades,
      SVT: 14,
      TECHNOLOGIE: null,
      PHYSIQUE_CHIMIE: null,
    };
    const score = calculateAffelnetScore(grades, mockStats);
    expect(score.details.SCIENCES_TECHNO_DP.rawAverage).toBe(14);
    
    // One language grade
    const grades2: UserGrades = {
      ...emptyGrades,
      LV1: 16,
      LV2: null,
    };
    const score2 = calculateAffelnetScore(grades2, mockStats);
    expect(score2.details.LANGUES_VIVANTES.rawAverage).toBe(16);
  });
});
