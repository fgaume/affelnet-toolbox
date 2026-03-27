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

  describe('fetchBonusIpsColleges', () => {
    it('returns a Map of UAI to bonus IPS 2026', async () => {
      const mockData = [
        { Identifiant: '0752536Z', Nom: 'CLG VOLTAIRE', Secteur: 'Public', Bonus_IPS_2026: 800 },
        { Identifiant: '0752319N', Nom: 'CLG COYSEVOX', Secteur: 'Public', Bonus_IPS_2026: 1200 },
        { Identifiant: '0750182R', Nom: 'CLG PRIVE', Secteur: 'Privé', Bonus_IPS_2026: null },
      ];

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      }));

      const { fetchBonusIpsColleges } = await import('../collegesConcurrenceApi');
      const result = await fetchBonusIpsColleges();

      expect(result.get('0752536Z')).toBe(800);
      expect(result.get('0752319N')).toBe(1200);
      // null bonus → not in map
      expect(result.has('0750182R')).toBe(false);
    });

    it('caches results across calls', async () => {
      const mockFn = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([
          { Identifiant: '0752536Z', Bonus_IPS_2026: 400 },
        ]),
      });
      vi.stubGlobal('fetch', mockFn);

      const { fetchBonusIpsColleges } = await import('../collegesConcurrenceApi');
      await fetchBonusIpsColleges();
      await fetchBonusIpsColleges();

      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchDnbAdmisColleges', () => {
    it('returns a Map of UAI to nb admis (candidats * taux / 100)', async () => {
      const mockData = [
        { uai: '0752536Z', nb_candidats_g: 100, taux_de_reussite_g: 92.0 },
        { uai: '0752319N', nb_candidats_g: 80, taux_de_reussite_g: 95.0 },
      ];

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      }));

      const { fetchDnbAdmisColleges } = await import('../collegesConcurrenceApi');
      const result = await fetchDnbAdmisColleges();

      expect(result.get('0752536Z')).toBe(92); // Math.round(100 * 92 / 100)
      expect(result.get('0752319N')).toBe(76); // Math.round(80 * 95 / 100)
    });

    it('caches results across calls', async () => {
      const mockFn = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([
          { uai: '0752536Z', nb_candidats_g: 100, taux_de_reussite_g: 90.0 },
        ]),
      });
      vi.stubGlobal('fetch', mockFn);

      const { fetchDnbAdmisColleges } = await import('../collegesConcurrenceApi');
      await fetchDnbAdmisColleges();
      await fetchDnbAdmisColleges();

      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });
});
