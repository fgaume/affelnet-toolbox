// src/services/__tests__/collegesConcurrenceApi.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('collegesConcurrenceApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  describe('fetchCollegesForLycee', () => {
    it('returns college UAIs and names from ArcGIS', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          features: [
            { attributes: { Réseau: '0752536Z', Nom_Tete: 'VOLTAIRE' } },
            { attributes: { Réseau: '0752319N', Nom_Tete: 'COYSEVOX' } },
          ],
        }),
      }));

      const { fetchCollegesForLycee } = await import('../collegesConcurrenceApi');
      const result = await fetchCollegesForLycee('0750676C');

      expect(result).toEqual([
        { uai: '0752536Z', nom: 'VOLTAIRE' },
        { uai: '0752319N', nom: 'COYSEVOX' },
      ]);

      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain('0750676C');
      expect(calledUrl).toContain("secteur='1'");
    });

    it('returns empty array when no colleges found', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ features: [] }),
      }));

      const { fetchCollegesForLycee } = await import('../collegesConcurrenceApi');
      const result = await fetchCollegesForLycee('0000000X');
      expect(result).toEqual([]);
    });
  });
});
