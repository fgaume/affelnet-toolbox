export interface LinearRegressionResult {
  readonly slope: number;
  readonly intercept: number;
  readonly trendLine: readonly number[];
}

/**
 * Compute simple least-squares linear regression over index-based x-values.
 * Returns slope, intercept, and the projected trend line values.
 */
export function linearRegression(values: readonly number[]): LinearRegressionResult {
  const n = values.length;
  if (n === 0) {
    return { slope: 0, intercept: 0, trendLine: [] };
  }
  if (n === 1) {
    return { slope: 0, intercept: values[0], trendLine: [values[0]] };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denominator = n * sumX2 - sumX * sumX;
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  const trendLine = Array.from({ length: n }, (_, i) => intercept + slope * i);

  return { slope, intercept, trendLine };
}
