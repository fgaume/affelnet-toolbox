import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('fetchEffectif2nde', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('fetches and maps API fields to EffectifLycee', async () => {
    const mockData = {
      total_count: 1,
      results: [
        { rentree_scolaire: '2024', '2ndes_gt': 243, patronyme: 'MOLIERE' },
      ],
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    }));

    const { fetchEffectif2nde } = await import('../effectifsApi');
    const result = await fetchEffectif2nde('0750703G');

    expect(result).toEqual({
      uai: '0750703G',
      nom: 'MOLIERE',
      effectif: 243,
      annee: '2024',
    });
  });

  it('returns null when no results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ total_count: 0, results: [] }),
    }));

    const { fetchEffectif2nde } = await import('../effectifsApi');
    const result = await fetchEffectif2nde('UNKNOWN');

    expect(result).toBeNull();
  });

  it('returns null on fetch error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }));

    const { fetchEffectif2nde } = await import('../effectifsApi');
    const result = await fetchEffectif2nde('0750703G');

    expect(result).toBeNull();
  });
});

describe('fetchEffectifsSecteur1', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('fetches effectifs for all sector 1 lycées', async () => {
    const mockResponses: Record<string, object> = {
      '0750703G': { total_count: 1, results: [{ rentree_scolaire: '2024', '2ndes_gt': 243, patronyme: 'MOLIERE' }] },
      '0750653C': { total_count: 1, results: [{ rentree_scolaire: '2024', '2ndes_gt': 310, patronyme: 'SOPHIE GERMAIN' }] },
    };

    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      const uai = url.match(/numero_lycee='(\w+)'/)?.[1] ?? '';
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponses[uai] ?? { total_count: 0, results: [] }),
      });
    }));

    const { fetchEffectifsSecteur1 } = await import('../effectifsApi');
    const results = await fetchEffectifsSecteur1([
      { uai: '0750703G', nom: 'MOLIERE', secteur: 1 },
      { uai: '0750653C', nom: 'SOPHIE GERMAIN', secteur: 1 },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].effectif).toBe(243);
    expect(results[1].effectif).toBe(310);
  });

  it('handles partial failures with Promise.allSettled', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ total_count: 1, results: [{ rentree_scolaire: '2024', '2ndes_gt': 243, patronyme: 'MOLIERE' }] }),
      })
      .mockRejectedValueOnce(new Error('Network error'))
    );

    const { fetchEffectifsSecteur1 } = await import('../effectifsApi');
    const results = await fetchEffectifsSecteur1([
      { uai: '0750703G', nom: 'MOLIERE', secteur: 1 },
      { uai: '0750653C', nom: 'SOPHIE GERMAIN', secteur: 1 },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].uai).toBe('0750703G');
  });

  it('caches results for the same set of UAIs', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ total_count: 1, results: [{ rentree_scolaire: '2024', '2ndes_gt': 243, patronyme: 'MOLIERE' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchEffectifsSecteur1 } = await import('../effectifsApi');
    const lycees = [{ uai: '0750703G', nom: 'MOLIERE', secteur: 1 }];

    await fetchEffectifsSecteur1(lycees);
    await fetchEffectifsSecteur1(lycees);

    // fetch should only be called once (cached on second call)
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
