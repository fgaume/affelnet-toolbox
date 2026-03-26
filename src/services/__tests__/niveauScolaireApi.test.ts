import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('computeTauxTB', () => {
  it('computes TB rate from mentions and presents', async () => {
    const { computeTauxTB } = await import('../niveauScolaireApi');
    // 10 TB sans + 5 TB avec / 100 présents = 15%
    expect(computeTauxTB(10, 5, 100)).toBeCloseTo(15);
  });

  it('returns 0 when presents is 0', async () => {
    const { computeTauxTB } = await import('../niveauScolaireApi');
    expect(computeTauxTB(10, 5, 0)).toBe(0);
  });
});

describe('computeDecile', () => {
  it('returns decile 10 for highest value', async () => {
    const { computeDecile } = await import('../decile');
    const allValues = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    expect(computeDecile(100, allValues)).toBe(10);
  });

  it('returns decile 1 for lowest value', async () => {
    const { computeDecile } = await import('../decile');
    const allValues = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    expect(computeDecile(10, allValues)).toBe(1);
  });

  it('returns decile 5 for median value', async () => {
    const { computeDecile } = await import('../decile');
    const allValues = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(computeDecile(50, allValues)).toBe(5);
  });

  it('returns 5 for empty array', async () => {
    const { computeDecile } = await import('../decile');
    expect(computeDecile(50, [])).toBe(5);
  });

  it('handles ties correctly', async () => {
    const { computeDecile } = await import('../decile');
    // [10,10,10,50,50,50,90,90,90,90] — 50 has 3 values strictly less, rank=3, floor(3/10*10)+1 = 4
    const allValues = [10, 10, 10, 50, 50, 50, 90, 90, 90, 90];
    expect(computeDecile(50, allValues)).toBe(4);
  });
});

describe('fetchNiveauScolaire', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('fetches TB history and decile for a lycée', async () => {
    // Flat array — matches /exports/json format
    const mockData = [
      { annee: '2022-01-01', uai: '0750680G', nb_mentions_tb_sansf_g: 20, nb_mentions_tb_avecf_g: 10, presents_gnle: 200 },
      { annee: '2023-01-01', uai: '0750680G', nb_mentions_tb_sansf_g: 25, nb_mentions_tb_avecf_g: 15, presents_gnle: 200 },
      { annee: '2022-01-01', uai: '0750693W', nb_mentions_tb_sansf_g: 10, nb_mentions_tb_avecf_g: 5, presents_gnle: 100 },
      { annee: '2023-01-01', uai: '0750693W', nb_mentions_tb_sansf_g: 12, nb_mentions_tb_avecf_g: 8, presents_gnle: 100 },
    ];

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    }));

    const { fetchNiveauScolaire } = await import('../niveauScolaireApi');
    const result = await fetchNiveauScolaire('0750680G');

    expect(result).not.toBeNull();
    expect(result!.history).toHaveLength(2);
    expect(result!.history[0].annee).toBe('2022');
    expect(result!.history[0].tauxTB).toBeCloseTo(15);
    expect(result!.history[1].tauxTB).toBeCloseTo(20);
    expect(result!.decile).toBeGreaterThanOrEqual(1);
    expect(result!.decile).toBeLessThanOrEqual(10);
  });

  it('returns null when UAI not found', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { annee: '2023-01-01', uai: '0750680G', nb_mentions_tb_sansf_g: 20, nb_mentions_tb_avecf_g: 10, presents_gnle: 200 },
      ]),
    }));

    const { fetchNiveauScolaire } = await import('../niveauScolaireApi');
    const result = await fetchNiveauScolaire('UNKNOWN');
    expect(result).toBeNull();
  });

  it('returns null on fetch error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }));

    const { fetchNiveauScolaire } = await import('../niveauScolaireApi');
    const result = await fetchNiveauScolaire('0750680G');
    expect(result).toBeNull();
  });
});
