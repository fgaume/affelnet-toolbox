import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCollegeList, fetchCollegeIps, resetIpsCache } from '../collegeApi';

describe('collegeApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetIpsCache();
  });

  describe('fetchCollegeList', () => {
    it('returns deduplicated colleges from API', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { uai: '0750490A', nom: 'CONDORCET' },
          { uai: '0750524M', nom: 'COURTELINE' },
          { uai: '0750490A', nom: 'CONDORCET' }, // duplicate
        ],
      } as Response);

      const result = await fetchCollegeList();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ uai: '0750490A', nom: 'CONDORCET' });
      expect(result[1]).toEqual({ uai: '0750524M', nom: 'COURTELINE' });
    });

    it('throws on network error', async () => {
      // Mock all 3 year attempts as failing
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
        .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
        .mockResolvedValueOnce({ ok: false, status: 500 } as Response);

      await expect(fetchCollegeList()).rejects.toThrow('Impossible de charger la liste des collèges');
    });
  });

  describe('fetchCollegeIps', () => {
    it('returns IPS info for a college UAI', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { Identifiant: '0750490A', Nom: 'CLG CONDORCET', Secteur: 'Public', IPS_2026: 126.3, Bonus_IPS_2026: 800 },
          { Identifiant: '0750524M', Nom: 'CLG COURTELINE', Secteur: 'Public', IPS_2026: 98.2, Bonus_IPS_2026: 1200 },
        ],
      } as Response);

      const result = await fetchCollegeIps('0750490A');
      expect(result).toEqual({ ips: 126.3, bonus: 800 });
    });

    it('falls back to previous year if current year has no data', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { Identifiant: '0750490A', Nom: 'CLG CONDORCET', Secteur: 'Public', IPS_2025: 125.0, Bonus_IPS_2025: 800 },
        ],
      } as Response);

      const result = await fetchCollegeIps('0750490A');
      expect(result).toEqual({ ips: 125.0, bonus: 800 });
    });

    it('returns null if college not found', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      const result = await fetchCollegeIps('UNKNOWN');
      expect(result).toBeNull();
    });
  });
});
