import { describe, it, expect } from 'vitest';
import { wgs84ToWebMercator } from '../geo';

describe('wgs84ToWebMercator', () => {
  it('converts Paris center coordinates correctly', () => {
    // 48.8566, 2.3522 (lat, lon) -> approx (261848, 6250566) in EPSG:3857
    const result = wgs84ToWebMercator(48.8566, 2.3522);
    expect(result.x).toBeCloseTo(261848, -1); // within ~10m
    expect(result.y).toBeCloseTo(6250566, -1);
  });

  it('converts passage Saint-Ambroise coordinates', () => {
    // 48.863685, 2.377174 -> approx (264625.8, 6251763.2)
    const result = wgs84ToWebMercator(48.863685, 2.377174);
    expect(result.x).toBeCloseTo(264626, -1);
    expect(result.y).toBeCloseTo(6251763, -1);
  });

  it('converts avenue de Suffren coordinates', () => {
    // 48.856645, 2.292077 -> approx (255152.8, 6250572.0)
    const result = wgs84ToWebMercator(48.856645, 2.292077);
    expect(result.x).toBeCloseTo(255153, -1);
    expect(result.y).toBeCloseTo(6250572, -1);
  });
});
