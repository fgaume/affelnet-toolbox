import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAdmissionDifficulty } from '../seuilsApi';

describe('getAdmissionDifficulty', () => {
  it('returns black for seuil > 40731', () => {
    const result = getAdmissionDifficulty(40800);
    expect(result.color).toBe('#1a1a1a');
    expect(result.label).toBe('Inaccessible sans bonus');
  });

  it('returns red for seuil > 40600 and <= 40731', () => {
    const result = getAdmissionDifficulty(40650);
    expect(result.color).toBe('#dc2626');
    expect(result.label).toBe('Difficilement accessible');
  });

  it('returns orange for seuil > 40250 and <= 40600', () => {
    const result = getAdmissionDifficulty(40400);
    expect(result.color).toBe('#f97316');
    expect(result.label).toBe('Moyennement accessible');
  });

  it('returns blue for seuil > 38000 and <= 40250', () => {
    const result = getAdmissionDifficulty(39000);
    expect(result.color).toBe('#2563eb');
    expect(result.label).toBe('Facilement accessible (secteur 1)');
  });

  it('returns green for seuil <= 38000', () => {
    const result = getAdmissionDifficulty(37000);
    expect(result.color).toBe('#16a34a');
    expect(result.label).toBe('Très facilement accessible');
  });

  it('handles exact boundary 40731', () => {
    // 40731 is NOT > 40731, so it should be red
    expect(getAdmissionDifficulty(40731).color).toBe('#dc2626');
  });

  it('handles exact boundary 40600', () => {
    expect(getAdmissionDifficulty(40600).color).toBe('#f97316');
  });
});

describe('fetchSeuils', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Clear the module cache to reset the internal cache
    vi.resetModules();
  });

  it('fetches and maps UAI to seuil 2025', async () => {
    const mockData = {
      rows: [
        { row: { code: '0750680G', nom: 'ARAGO', seuils: [40386, 40467, 40536, 40590, 40531] } },
        { row: { code: '0750693W', nom: 'BUFFON', seuils: [40582, 40439, 40559, 40668, 40691] } },
      ],
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    }));

    // Re-import to get a fresh module with no cache
    const { fetchSeuils: freshFetch } = await import('../seuilsApi');
    const seuils = await freshFetch();

    expect(seuils.get('0750680G')).toBe(40531);
    expect(seuils.get('0750693W')).toBe(40691);
    expect(seuils.size).toBe(2);
  });
});

describe('fetchAllSeuils', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('returns full history sorted by name', async () => {
    const mockData = {
      rows: [
        { row: { code: '0750693W', nom: 'BUFFON', seuils: [40582, 40439, 40559, 40668, 40691] } },
        { row: { code: '0750680G', nom: 'ARAGO', seuils: [40386, 40467, 40536, 40590, 40531] } },
      ],
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    }));

    const { fetchAllSeuils } = await import('../seuilsApi');
    const history = await fetchAllSeuils();

    expect(history).toHaveLength(2);
    expect(history[0].nom).toBe('ARAGO');
    expect(history[0].code).toBe('0750680G');
    expect(history[0].seuils).toEqual([40386, 40467, 40536, 40590, 40531]);
    expect(history[1].nom).toBe('BUFFON');
  });

  it('throws on fetch error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }));

    const { fetchAllSeuils } = await import('../seuilsApi');
    await expect(fetchAllSeuils()).rejects.toThrow('Erreur chargement seuils: 500');
  });
});
