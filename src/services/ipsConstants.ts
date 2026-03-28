/** Seuils IPS Affelnet 2026 — evaluated in order, first match wins */
export const IPS_THRESHOLDS = [
  { maxIps: 106.7, bonus: 1200, label: 'Moyenne nationale public/privé' },
  { maxIps: 117.1, bonus: 800, label: 'Moyenne académique collèges publics' },
  { maxIps: 129.8, bonus: 400, label: 'Moyenne académique publics et privés' },
] as const;

export const IPS_DEFAULT_BONUS = 0;

export function computeIpsBonus(ips: number): number {
  for (const threshold of IPS_THRESHOLDS) {
    if (ips < threshold.maxIps) {
      return threshold.bonus;
    }
  }
  return IPS_DEFAULT_BONUS;
}
