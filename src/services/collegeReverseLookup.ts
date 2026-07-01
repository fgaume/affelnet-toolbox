// src/services/collegeReverseLookup.ts
// Recherche inverse : déduire le(s) collège(s) de secteur à partir d'une liste
// de lycées de secteur 1. Chaque collège parisien a exactement 5 lycées de
// secteur 1 ; 73 % des collèges sont identifiables de façon unique par cet
// ensemble, les autres partagent le même secteur (groupes ambigus).
import { fetchWithHfCache } from './hfCache';

const HF_SECTEURS_URL =
  'https://huggingface.co/datasets/fgaume/affelnet-paris-secteurs/resolve/main/secteur_college_lycee_affelnet.json';

interface HfSecteurRecord {
  uai_college: string;
  nom_college: string;
  uai_lycee: string;
  nom_lycee: string;
  annee: number;
  secteur: number;
}

export interface LyceeRef {
  uai: string;
  nom: string;
}

interface CollegeSecteur1 {
  uai: string;
  nom: string;
  lycees: Set<string>; // UAI des 5 lycées de secteur 1
}

interface Secteur1Graph {
  colleges: CollegeSecteur1[];
  /** Catalogue des lycées de secteur 1 (uai -> nom), pour l'autocomplete. */
  lyceeNames: Map<string, string>;
}

let graphCache: Secteur1Graph | null = null;

/** Construit le graphe collège -> {5 lycées de secteur 1} pour l'année la plus récente. */
async function loadGraph(): Promise<Secteur1Graph> {
  if (graphCache) return graphCache;

  const all = await fetchWithHfCache<HfSecteurRecord[]>(HF_SECTEURS_URL);
  const latestYear = all.reduce((max, r) => Math.max(max, r.annee), 0);
  const records = all.filter((r) => r.annee === latestYear && r.secteur === 1);

  const byCollege = new Map<string, CollegeSecteur1>();
  const lyceeNames = new Map<string, string>();
  for (const r of records) {
    let college = byCollege.get(r.uai_college);
    if (!college) {
      college = { uai: r.uai_college, nom: r.nom_college, lycees: new Set() };
      byCollege.set(r.uai_college, college);
    }
    college.lycees.add(r.uai_lycee);
    lyceeNames.set(r.uai_lycee, r.nom_lycee);
  }

  graphCache = { colleges: [...byCollege.values()], lyceeNames };
  return graphCache;
}

/** Liste triée des lycées de secteur 1 (pour le multi-select de saisie). */
export async function getSecteur1LyceeCatalog(): Promise<LyceeRef[]> {
  const { lyceeNames } = await loadGraph();
  return [...lyceeNames.entries()]
    .map(([uai, nom]) => ({ uai, nom }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

export interface CollegeMatch {
  uai: string;
  nom: string;
  /** Nb de lycées sélectionnés présents dans le secteur de ce collège. */
  matched: number;
  /** Taille du secteur du collège (5). */
  total: number;
  /** Lycées de secteur 1 du collège non encore sélectionnés (aide à compléter). */
  missing: LyceeRef[];
}

export interface ReverseLookupResult {
  candidates: CollegeMatch[];
  /** true si les candidats couvrent TOUS les lycées sélectionnés (sélection ⊆ secteur). */
  containment: boolean;
  /** true si plusieurs collèges partagent exactement le même secteur (indistinguables). */
  ambiguous: boolean;
}

const EMPTY_RESULT: ReverseLookupResult = {
  candidates: [],
  containment: true,
  ambiguous: false,
};

/**
 * Déduit les collèges compatibles avec une sélection de lycées de secteur 1.
 * - Sélection ⊆ secteur d'un collège → candidat par « inclusion » (le plus fiable).
 * - Aucune inclusion (ex. lycée hors-secteur saisi) → repli sur le meilleur recouvrement.
 * Les candidats sont triés du plus complet au moins complet, puis par nom.
 */
export async function matchCollegesByLycees(
  selectedUais: readonly string[],
): Promise<ReverseLookupResult> {
  if (selectedUais.length === 0) return EMPTY_RESULT;

  const { colleges, lyceeNames } = await loadGraph();
  const selected = new Set(selectedUais);

  const toMatch = (c: CollegeSecteur1): CollegeMatch => {
    let matched = 0;
    const missing: LyceeRef[] = [];
    for (const uai of c.lycees) {
      if (selected.has(uai)) matched += 1;
      else missing.push({ uai, nom: lyceeNames.get(uai) ?? uai });
    }
    missing.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    return { uai: c.uai, nom: c.nom, matched, total: c.lycees.size, missing };
  };

  const contained = colleges
    .filter((c) => c.lycees.size >= selected.size && [...selected].every((u) => c.lycees.has(u)))
    .map(toMatch);

  if (contained.length > 0) {
    contained.sort((a, b) => a.missing.length - b.missing.length || a.nom.localeCompare(b.nom, 'fr'));
    const ambiguous =
      contained.length > 1 && contained.every((c) => c.missing.length === 0);
    return { candidates: contained, containment: true, ambiguous };
  }

  // Repli : aucun collège ne contient toute la sélection → meilleur recouvrement.
  const overlaps = colleges
    .map(toMatch)
    .filter((c) => c.matched > 0)
    .sort((a, b) => b.matched - a.matched || a.nom.localeCompare(b.nom, 'fr'));

  return { candidates: overlaps, containment: false, ambiguous: false };
}

/** Réinitialise le cache (tests). */
export function __resetReverseLookupCache(): void {
  graphCache = null;
}
