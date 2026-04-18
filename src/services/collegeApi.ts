import type { College, IpsInfo } from '../types';
import { fetchWithHfCache } from './hfCache';

const COLLEGE_LIST_URL =
  'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-college-effectifs-niveau-sexe-lv/exports/json/' +
  '?lang=fr' +
  '&select=numero_college+as+uai%2C+patronyme+as+nom' +
  '&timezone=Europe%2FParis' +
  '&where=code_aca%3D%2201%22' +
  '+AND+year(rentree_scolaire)%3DYEAR' +
  '+AND+secteur%3D%22PUBLIC%22' +
  '+AND+denomination_principale%3D%22COLLEGE%22';

const IPS_DATASET_URL =
  'https://huggingface.co/datasets/fgaume/affelnet-paris-bonus-ips-colleges/raw/main/affelnet-paris-bonus-ips-colleges.json';

const CURRENT_YEAR = new Date().getFullYear();

/** Fetch full list of public Paris colleges. Tries current year first, then previous. */
export async function fetchCollegeList(): Promise<College[]> {
  for (const year of [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2]) {
    const url = COLLEGE_LIST_URL.replace('YEAR', String(year));
    const resp = await fetch(url);
    if (!resp.ok) continue;
    const data: College[] = await resp.json();
    if (data.length > 0) {
      // Deduplicate by UAI
      const seen = new Set<string>();
      return data.filter((c) => {
        if (seen.has(c.uai)) return false;
        seen.add(c.uai);
        return true;
      });
    }
  }
  throw new Error('Impossible de charger la liste des collèges');
}

interface IpsRawEntry {
  Identifiant: string;
  [key: string]: string | number | null;
}

let ipsCache: IpsRawEntry[] | null = null;

/** Reset the IPS cache — intended for use in tests only. */
export function resetIpsCache(): void {
  ipsCache = null;
}

async function loadIpsData(): Promise<IpsRawEntry[]> {
  if (ipsCache) return ipsCache;
  ipsCache = await fetchWithHfCache<IpsRawEntry[]>(IPS_DATASET_URL);
  return ipsCache;
}

/** Fetch IPS + bonus for a given college UAI. Returns null if not found. */
export async function fetchCollegeIps(uai: string): Promise<IpsInfo | null> {
  const data = await loadIpsData();
  const entry = data.find((e) => e.Identifiant === uai);
  if (!entry) return null;

  // Try most recent year first (2026, 2025, 2024...)
  for (let year = CURRENT_YEAR; year >= 2021; year--) {
    const ipsKey = `IPS_${year}`;
    const bonusKey = `Bonus_IPS_${year}`;
    const ips = entry[ipsKey];
    const bonus = entry[bonusKey];
    if (ips != null && typeof ips === 'number') {
      return {
        ips,
        bonus: typeof bonus === 'number' ? bonus : 0,
      };
    }
  }
  return null;
}
