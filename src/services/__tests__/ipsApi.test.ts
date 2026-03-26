// src/services/__tests__/ipsApi.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('fetchIps', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('fetches IPS history and decile for a lycée', async () => {
    const mockData = [
      { uai: '0750680G', rentree_scolaire: '2023', ips: 120.5, ecart_type: 28.3 },
      { uai: '0750680G', rentree_scolaire: '2024', ips: 122.0, ecart_type: 27.1 },
      { uai: '0750693W', rentree_scolaire: '2023', ips: 110.0, ecart_type: 30.0 },
      { uai: '0750693W', rentree_scolaire: '2024', ips: 112.0, ecart_type: 29.5 },
    ];

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    }));

    const { fetchIps } = await import('../ipsApi');
    const result = await fetchIps('0750680G');

    expect(result).not.toBeNull();
    expect(result!.history).toHaveLength(2);
    expect(result!.history[0].annee).toBe('2023');
    expect(result!.history[0].ips).toBe(120.5);
    expect(result!.history[0].ecartType).toBe(28.3);
    expect(result!.history[1].ips).toBe(122.0);
    expect(result!.decile).toBeGreaterThanOrEqual(1);
    expect(result!.decile).toBeLessThanOrEqual(10);
  });

  it('returns null when lycée not found', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    }));

    const { fetchIps } = await import('../ipsApi');
    const result = await fetchIps('UNKNOWN');
    expect(result).toBeNull();
  });

  it('returns null on fetch error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }));

    const { fetchIps } = await import('../ipsApi');
    const result = await fetchIps('0750680G');
    expect(result).toBeNull();
  });
});
