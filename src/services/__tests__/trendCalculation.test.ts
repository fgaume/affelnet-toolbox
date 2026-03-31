import { describe, it, expect } from 'vitest';
import { linearRegression } from '../trendCalculation';

describe('linearRegression', () => {
  it('returns empty result for empty array', () => {
    const result = linearRegression([]);
    expect(result.slope).toBe(0);
    expect(result.intercept).toBe(0);
    expect(result.trendLine).toEqual([]);
  });

  it('returns flat trend for single value', () => {
    const result = linearRegression([42]);
    expect(result.slope).toBe(0);
    expect(result.intercept).toBe(42);
    expect(result.trendLine).toEqual([42]);
  });

  it('returns flat trend for constant values', () => {
    const result = linearRegression([100, 100, 100, 100]);
    expect(result.slope).toBeCloseTo(0);
    expect(result.intercept).toBeCloseTo(100);
    expect(result.trendLine).toHaveLength(4);
    result.trendLine.forEach(v => expect(v).toBeCloseTo(100));
  });

  it('computes correct slope for ascending values', () => {
    const result = linearRegression([10, 20, 30, 40, 50]);
    expect(result.slope).toBeCloseTo(10);
    expect(result.intercept).toBeCloseTo(10);
    expect(result.trendLine[0]).toBeCloseTo(10);
    expect(result.trendLine[4]).toBeCloseTo(50);
  });

  it('computes correct slope for descending values', () => {
    const result = linearRegression([50, 40, 30, 20, 10]);
    expect(result.slope).toBeCloseTo(-10);
    expect(result.intercept).toBeCloseTo(50);
  });

  it('handles noisy data', () => {
    const result = linearRegression([10, 12, 11, 13, 14]);
    expect(result.slope).toBeGreaterThan(0);
    expect(result.trendLine).toHaveLength(5);
  });
});
