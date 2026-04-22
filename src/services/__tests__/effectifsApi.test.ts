import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockHfData = {
  rows: [
    { row: { UAI: '0750703G', Nom: 'MOLIERE', Effectif_2nde_GT_RS25: 243 } },
    { row: { UAI: '0750653C', Nom: 'SOPHIE GERMAIN', Effectif_2nde_GT_RS25: 310 } },
  ],
};

describe('fetchEffectif2nde', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('fetches from HuggingFace and returns matching lycée', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockHfData),
    }));

    const { fetchEffectif2nde } = await import('../effectifsApi');
    const result = await fetchEffectif2nde('0750703G');

    expect(result).toEqual({
      uai: '0750703G',
      nom: 'MOLIERE',
      effectif: 243,
      annee: '2025',
    });
  });

  it('returns null when UAI not found in dataset', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockHfData),
    }));

    const { fetchEffectif2nde } = await import('../effectifsApi');
    const result = await fetchEffectif2nde('UNKNOWN');

    expect(result).toBeNull();
  });
});

describe('fetchEffectifsSecteur1', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('returns effectifs for sector 1 lycées only', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockHfData),
    }));

    const { fetchEffectifsSecteur1 } = await import('../effectifsApi');
    const results = await fetchEffectifsSecteur1([
      { uai: '0750703G', nom: 'MOLIERE', secteur: 1 },
      { uai: '0750653C', nom: 'SOPHIE GERMAIN', secteur: 1 },
      { uai: '0750654D', nom: 'HENRI IV', secteur: 2 },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].effectif).toBe(243);
    expect(results[1].effectif).toBe(310);
  });

  it('caches dataset — only one fetch call', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockHfData),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchEffectifsSecteur1 } = await import('../effectifsApi');
    const lycees = [{ uai: '0750703G', nom: 'MOLIERE', secteur: 1 }];

    await fetchEffectifsSecteur1(lycees);
    await fetchEffectifsSecteur1(lycees);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
