import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findCollegeDeSecteur, findCollegeUAI, findLyceesDeSecteur } from '../sectorApi';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('findCollegeDeSecteur', () => {
  it('returns college name from carte scolaire', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [{ attributes: { libelle: 'COLLEGE VOLTAIRE', type_etabl: 'COL' } }],
      }),
    });

    const result = await findCollegeDeSecteur(48.863685, 2.377174);
    expect(result).toBe('COLLEGE VOLTAIRE');

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('capgeo2.paris.fr');
    expect(calledUrl).toContain('type_etabl');
  });

  it('throws when no college found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [] }),
    });

    await expect(findCollegeDeSecteur(0, 0)).rejects.toThrow(
      'Aucun collège de secteur trouvé pour cette adresse'
    );
  });
});

describe('findCollegeUAI', () => {
  it('returns UAI and coordinates from ArcGIS Rectorat', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [{ attributes: { UAI: '0752536Z', Nom: 'VOLTAIRE', secteur: 'Tête' }, geometry: { x: 2.377, y: 48.863 } }],
      }),
    });

    const result = await findCollegeUAI('COLLEGE VOLTAIRE');
    expect(result).toEqual({
      uai: '0752536Z',
      coordinates: [2.377, 48.863],
    });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('Nom');
    expect(calledUrl).toContain('secteur');
    // Should strip "COLLEGE " prefix
    expect(calledUrl).toContain('VOLTAIRE');
    expect(calledUrl).not.toContain('COLLEGE%20VOLTAIRE');
  });

  it('throws when no match found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [] }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [] }),
    });

    await expect(findCollegeUAI('COLLEGE INCONNU')).rejects.toThrow(
      'Collège non référencé dans l\'annuaire Affelnet'
    );
  });
});

describe('findLyceesDeSecteur', () => {
  it('returns lycees sorted by sector with coordinates', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [
          { attributes: { UAI: '0750676C', Nom: 'DORIAN', secteur: '1' }, geometry: { x: 2.39, y: 48.85 } },
          { attributes: { UAI: '0750652B', Nom: 'CHARLEMAGNE', secteur: '1' }, geometry: { x: 2.36, y: 48.85 } },
          { attributes: { UAI: '0750711R', Nom: 'BERGSON', secteur: '2' }, geometry: { x: 2.37, y: 48.88 } },
        ],
      }),
    });

    const result = await findLyceesDeSecteur('0752536Z');
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ uai: '0750676C', nom: 'DORIAN', secteur: 1, coordinates: [2.39, 48.85] });
    expect(result[1]).toEqual({ uai: '0750652B', nom: 'CHARLEMAGNE', secteur: 1, coordinates: [2.36, 48.85] });
    expect(result[2]).toEqual({ uai: '0750711R', nom: 'BERGSON', secteur: 2, coordinates: [2.37, 48.88] });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('0752536Z');
    expect(calledUrl).toContain("secteur%3C%3E'Tete'");
  });

  it('returns empty array when no lycees found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [] }),
    });

    const result = await findLyceesDeSecteur('0000000X');
    expect(result).toEqual([]);
  });
});
