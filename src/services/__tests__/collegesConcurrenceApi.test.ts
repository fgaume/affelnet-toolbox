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
            { attributes: { Réseau: '0752536Z', Nom_tete: 'VOLTAIRE' } },
            { attributes: { Réseau: '0752319N', Nom_tete: 'COYSEVOX' } },
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

  describe('fetchCollegesConcurrents', () => {
    it('joins ArcGIS + IPS + effectifs 3eme data into CollegeConcurrent[]', async () => {
      let callIndex = 0;
      vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) {
          // ArcGIS call
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              features: [
                { attributes: { Réseau: '0752536Z', Nom_tete: 'VOLTAIRE' } },
                { attributes: { Réseau: '0752319N', Nom_tete: 'COYSEVOX' } },
              ],
            }),
          });
        }
        if (callIndex === 2) {
          // HuggingFace IPS
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              { Identifiant: '0752536Z', Bonus_IPS_2026: 800 },
              { Identifiant: '0752319N', Bonus_IPS_2026: 1200 },
            ]),
          });
        }
        // HuggingFace effectifs 3eme
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            rows: [
              { row: { UAI: '0752536Z', Nom: 'VOLTAIRE', Effectif_3eme_RS25: 104 } },
              { row: { UAI: '0752319N', Nom: 'COYSEVOX', Effectif_3eme_RS25: 89 } },
            ],
          }),
        });
      }));

      const { fetchCollegesConcurrents } = await import('../collegesConcurrenceApi');
      const result = await fetchCollegesConcurrents('0750676C');

      expect(result.colleges).toHaveLength(2);
      expect(result.colleges).toContainEqual({
        uai: '0752536Z',
        nom: 'VOLTAIRE',
        bonusIps: 800,
        effectif3eme: 104,
      });
      expect(result.colleges).toContainEqual({
        uai: '0752319N',
        nom: 'COYSEVOX',
        bonusIps: 1200,
        effectif3eme: 89,
      });
    });

    it('handles missing IPS/effectifs data gracefully', async () => {
      let callIndex = 0;
      vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              features: [
                { attributes: { Réseau: '0752536Z', Nom_tete: 'VOLTAIRE' } },
              ],
            }),
          });
        }
        if (callIndex === 2) {
          // IPS — no data for this college
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
          });
        }
        // Effectifs — no data either
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ rows: [] }),
        });
      }));

      const { fetchCollegesConcurrents } = await import('../collegesConcurrenceApi');
      const result = await fetchCollegesConcurrents('0750676C');

      expect(result.colleges).toHaveLength(1);
      expect(result.colleges[0]).toEqual({
        uai: '0752536Z',
        nom: 'VOLTAIRE',
        bonusIps: -1,
        effectif3eme: 0,
      });
    });
  });
});
