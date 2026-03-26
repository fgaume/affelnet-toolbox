// src/services/decile.ts
export function computeDecile(value: number, allValues: number[]): number {
  const sorted = [...allValues].sort((a, b) => a - b);
  if (sorted.length === 0) return 5;
  const rank = sorted.filter((v) => v < value).length;
  return Math.min(10, Math.floor((rank / sorted.length) * 10) + 1);
}
