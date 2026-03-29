import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  getUserGrades, 
  saveUserGrades, 
  getUserScore, 
  saveUserScore, 
  clearScoreData,
  getSearchHistory,
  addToHistory,
  clearHistory,
  removeFromHistory
} from '../storage';
import type { UserGrades, UserScore, Address, SectorResult } from '../../types';

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

vi.stubGlobal('localStorage', mockLocalStorage);
vi.stubGlobal('crypto', {
  randomUUID: () => 'test-uuid'
});

describe('storage service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should save and retrieve user grades', () => {
    const mockGrades: UserGrades = {
      FRANCAIS: 15,
      MATHEMATIQUES: 18,
      HISTOIRE_GEO: 14,
      LV1: 16,
      LV2: 15,
      EPS: 12,
      ARTS_PLASTIQUES: 14,
      EDUCATION_MUSICALE: 13,
      SVT: 15,
      TECHNOLOGIE: 16,
      PHYSIQUE_CHIMIE: 17,
      EMC: 15,
    };

    saveUserGrades(mockGrades);
    const retrieved = getUserGrades();
    expect(retrieved).toEqual(mockGrades);
  });

  it('should return null if no grades are stored', () => {
    expect(getUserGrades()).toBeNull();
  });

  it('should save and retrieve user score', () => {
    const mockScore: UserScore = {
      totalScore: 5000,
      details: {
        FRANCAIS: { rawAverage: 15, harmonizedNote: 100, contribution: 600 },
        MATHEMATIQUES: { rawAverage: 18, harmonizedNote: 120, contribution: 720 },
        HISTOIRE_GEO: { rawAverage: 14, harmonizedNote: 90, contribution: 540 },
        LANGUES_VIVANTES: { rawAverage: 15.5, harmonizedNote: 105, contribution: 630 },
        SCIENCES_TECHNO_DP: { rawAverage: 16, harmonizedNote: 110, contribution: 660 },
        ARTS: { rawAverage: 13.5, harmonizedNote: 85, contribution: 510 },
        EPS: { rawAverage: 12, harmonizedNote: 80, contribution: 480 },
      },
    };

    saveUserScore(mockScore);
    const retrieved = getUserScore();
    expect(retrieved).toEqual(mockScore);
  });

  it('should return null if no score is stored', () => {
    expect(getUserScore()).toBeNull();
  });

  it('should clear both grades and score data', () => {
    const mockGrades: UserGrades = { FRANCAIS: 15 } as UserGrades;
    const mockScore: UserScore = { totalScore: 5000 } as UserScore;

    saveUserGrades(mockGrades);
    saveUserScore(mockScore);

    expect(getUserGrades()).not.toBeNull();
    expect(getUserScore()).not.toBeNull();

    clearScoreData();

    expect(getUserGrades()).toBeNull();
    expect(getUserScore()).toBeNull();
  });

  it('should handle version mismatch for grades', () => {
    localStorage.setItem('affelnet-user-grades', JSON.stringify({ version: 0, data: { FRANCAIS: 10 } }));
    expect(getUserGrades()).toBeNull();
    expect(localStorage.getItem('affelnet-user-grades')).toBeNull();
  });

  it('should handle search history', () => {
    const address: Address = {
      label: '8 Avenue de Suffren, 75007 Paris',
      postcode: '75007',
      city: 'Paris',
      citycode: '75107',
      context: '75, Paris, Île-de-France',
      coordinates: [2.295, 48.858],
    };
    const result: SectorResult = {
      college: { nom: 'Collège test', uai: '0750001A' },
      lycees: [],
    };

    const entry = addToHistory(address, result);
    expect(entry.address.label).toBe(address.label);
    
    const history = getSearchHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('test-uuid');

    removeFromHistory('test-uuid');
    expect(getSearchHistory()).toHaveLength(0);

    addToHistory(address, result);
    clearHistory();
    expect(getSearchHistory()).toHaveLength(0);
  });
});
