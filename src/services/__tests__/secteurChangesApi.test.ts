import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('fetchPreviousSecteur1', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('fetches and builds a Map of college → Set of lycée UAIs', async () => {
    const mockRows = {
      rows: [
        { row: { uai_college: '0750360J', uai_lycee: '0750653C' } },
        { row: { uai_college: '0750360J', uai_lycee: '0750675B' } },
        { row: { uai_college: '0750362L', uai_lycee: '0750653C' } },
      ],
      num_rows_total: 3,
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRows),
    }));

    const { fetchPreviousSecteur1 } = await import('../secteurChangesApi');
    const map = await fetchPreviousSecteur1();

    expect(map.get('0750360J')).toEqual(new Set(['0750653C', '0750675B']));
    expect(map.get('0750362L')).toEqual(new Set(['0750653C']));
    expect(map.has('0750999Z')).toBe(false);
  });

  it('paginates when dataset has more than 100 rows', async () => {
    // First page: 100 rows
    const page1Rows = Array.from({ length: 100 }, (_, i) => ({
      row: { uai_college: `COL${i}`, uai_lycee: `LYC${i}` },
    }));
    // Second page: 10 rows
    const page2Rows = Array.from({ length: 10 }, (_, i) => ({
      row: { uai_college: `COL${100 + i}`, uai_lycee: `LYC${100 + i}` },
    }));

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ rows: page1Rows, num_rows_total: 110 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ rows: page2Rows, num_rows_total: 110 }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const { fetchPreviousSecteur1 } = await import('../secteurChangesApi');
    const map = await fetchPreviousSecteur1();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    // Check first and last entries
    expect(map.get('COL0')?.has('LYC0')).toBe(true);
    expect(map.get('COL109')?.has('LYC109')).toBe(true);
  });
});

describe('detectNewSecteur1Lycees', () => {
  it('marks lycées not in previous year as new', async () => {
    vi.resetModules();

    const mockRows = {
      rows: [
        { row: { uai_college: '0750360J', uai_lycee: '0750653C' } },
        { row: { uai_college: '0750360J', uai_lycee: '0750675B' } },
      ],
      num_rows_total: 2,
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRows),
    }));

    const { detectNewSecteur1Lycees } = await import('../secteurChangesApi');

    const currentLycees = [
      { uai: '0750653C', nom: 'SOPHIE GERMAIN', secteur: 1 },  // existed before
      { uai: '0750675B', nom: 'VOLTAIRE', secteur: 1 },         // existed before
      { uai: '0750680G', nom: 'ARAGO', secteur: 1 },             // NEW!
      { uai: '0750693W', nom: 'BUFFON', secteur: 2 },            // secteur 2, ignored
    ];

    const newUais = await detectNewSecteur1Lycees('0750360J', currentLycees);

    expect(newUais).toContain('0750680G');
    expect(newUais).not.toContain('0750653C');
    expect(newUais).not.toContain('0750675B');
    expect(newUais).not.toContain('0750693W'); // secteur 2 not checked
  });

  it('returns empty set when college not in previous data', async () => {
    vi.resetModules();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ rows: [], num_rows_total: 0 }),
    }));

    const { detectNewSecteur1Lycees } = await import('../secteurChangesApi');

    const currentLycees = [
      { uai: '0750653C', nom: 'SOPHIE GERMAIN', secteur: 1 },
    ];

    const newUais = await detectNewSecteur1Lycees('UNKNOWN', currentLycees);

    // No previous data → can't determine what's new → empty
    expect(newUais.size).toBe(0);
  });
});
