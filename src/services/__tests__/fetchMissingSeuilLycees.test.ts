import { describe, it, expect, vi, beforeEach } from 'vitest';

// URLs discriminées par le mot « boursiers » dans l'URL du dataset.
const NON_BOURSIERS = {
  rows: [
    { row: { code: '0750001A', nom: 'ALPHA', seuils: [1, 2, 3, 4, 5, 40000] } },
    { row: { code: '0750002B', nom: 'BETA', seuils: [1, 2, 3, 4, 5, 0] } },
    { row: { code: '0750003C', nom: 'GAMMA', seuils: [1, 2, 3, 4, 5, 0] } },
  ],
};
const BOURSIERS = {
  rows: [
    { row: { code: '0750001A', nom: 'ALPHA', seuils: [1, 2, 3, 4, 5, 0], taux_cible_boursiers: 0.2 } },
    { row: { code: '0750002B', nom: 'BETA', seuils: [1, 2, 3, 4, 5, 38000], taux_cible_boursiers: 0.2 } },
  ],
};

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () => (url.includes('boursiers') ? BOURSIERS : NON_BOURSIERS),
    })),
  );
});

describe('fetchMissingSeuilLycees', () => {
  it('non-boursier : ne retourne que les lycées au dernier seuil inconnu (0)', async () => {
    const { fetchMissingSeuilLycees } = await import('../seuilsApi');
    const missing = await fetchMissingSeuilLycees(false);
    expect(missing).toEqual([
      { code: '0750002B', nom: 'BETA' },
      { code: '0750003C', nom: 'GAMMA' },
    ]);
  });

  it('boursier : lit le dataset boursiers et filtre les manquants', async () => {
    const { fetchMissingSeuilLycees } = await import('../seuilsApi');
    const missing = await fetchMissingSeuilLycees(true);
    expect(missing).toEqual([{ code: '0750001A', nom: 'ALPHA' }]);
  });

  it('trie les résultats par nom', async () => {
    const { fetchMissingSeuilLycees } = await import('../seuilsApi');
    const missing = await fetchMissingSeuilLycees(false);
    expect(missing.map((l) => l.nom)).toEqual(['BETA', 'GAMMA']);
  });
});
