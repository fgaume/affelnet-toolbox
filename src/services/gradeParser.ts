import type { Subject } from '../types';

/**
 * Parseur de notes collées par l'utilisateur (relevé / bulletin).
 *
 * Objectif : encaisser une forte variance de libellés ("Maths", "MATHÉMATIQUES",
 * "E.M.C.", ...), reconnaître anglais => LV1 et toute autre langue => LV2,
 * ignorer les lignes non pertinentes, et moyenner une matière qui apparaît
 * plusieurs fois (relevés semestriels = 2 notes, trimestriels = 3 notes).
 *
 * 100 % côté client, aucune dépendance réseau.
 */

export interface ParsedSubject {
  subject: Subject;
  /** Moyenne des notes collectées (arrondie à 1e-9 comme ailleurs dans l'app). */
  value: number;
  /** Toutes les notes reconnues pour cette matière (avant moyenne). */
  rawValues: number[];
  /** Libellé d'origine rencontré, pour vérification par l'utilisateur. */
  matchedLabel: string;
}

export interface ParseConflict {
  /** Type de conflit détecté. */
  kind: 'LV2_AMBIGUOUS';
  message: string;
  /** Candidats en jeu (ex. plusieurs langues non-anglaises). */
  candidates: { label: string; value: number; rawValues: number[] }[];
}

export interface ParseResult {
  matched: ParsedSubject[];
  conflicts: ParseConflict[];
  ignoredLines: string[];
}

/** Normalise un libellé : retire accents, ponctuation, casse, espaces superflus. */
export function normalizeLabel(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // accents (diacritiques combinants)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Alias par matière. Chaque alias est déjà normalisé (sans accent, minuscule).
 * On matche par inclusion de mot ; l'alias le plus long gagne pour éviter
 * que "chimie" l'emporte sur "physique chimie".
 */
const SUBJECT_ALIASES: Record<Exclude<Subject, 'LV1' | 'LV2'>, string[]> = {
  FRANCAIS: ['francais', 'lettres'],
  MATHEMATIQUES: ['mathematiques', 'maths', 'math'],
  HISTOIRE_GEO: [
    'histoire geographie',
    'histoire geo',
    'hist geo',
    'histoire',
    'geographie',
    'hg',
  ],
  EMC: [
    'enseignement moral et civique',
    'enseignement moral civique',
    'education civique',
    'emc',
  ],
  SVT: ['sciences de la vie et de la terre', 'sciences vie terre', 'svt'],
  TECHNOLOGIE: ['technologie', 'techno'],
  PHYSIQUE_CHIMIE: [
    'physique chimie',
    'sciences physiques',
    'physique',
    'chimie',
  ],
  ARTS_PLASTIQUES: ['arts plastiques', 'art plastique', 'arts pla'],
  EDUCATION_MUSICALE: [
    'education musicale',
    'chant choral',
    'musique',
  ],
  EPS: [
    'education physique et sportive',
    'education physique',
    'eps',
    'sport',
  ],
};

/** Langues vivantes reconnues. L'anglais => LV1, le reste => LV2. */
const LANGUAGE_ALIASES: Record<'EN' | 'OTHER', string[]> = {
  EN: ['anglais', 'english'],
  OTHER: [
    'espagnol',
    'allemand',
    'italien',
    'chinois',
    'arabe',
    'portugais',
    'russe',
    'japonais',
    'hebreu',
  ],
};

/**
 * Clé d'agrégation interne : un Subject classique, l'anglais (=> LV1),
 * ou une langue non-anglaise précise (=> candidate LV2), préfixée pour
 * conserver son nom et détecter les conflits.
 */
type CollectKey = Subject | 'LANG_EN' | `LANG_OTHER:${string}`;

interface SubjectMatch {
  key: CollectKey;
  /** Score de l'alias matché : nb de caractères des mots reconnus (pour départager). */
  score: number;
}

/**
 * Reconstruit les acronymes écrits avec des points ("E.M.C." -> "e m c" -> "emc",
 * "S.V.T." -> "svt") en fusionnant les suites de lettres isolées.
 */
function mergeAcronyms(normalized: string): string {
  return normalized.replace(/\b(?:[a-z] ){1,}[a-z]\b/g, (run) => run.replace(/ /g, ''));
}

/** Distance de Levenshtein (bornée à des chaînes courtes : libellés de matières). */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * Vrai si un token du libellé correspond à un mot d'alias :
 * - égalité stricte, ou
 * - abréviation : l'un est préfixe de l'autre (≥ 3 lettres, ou ≥ 2 lettres si le
 *   mot complet en fait au moins 4 — ex. "ed" -> "education", "phys" -> "physique"), ou
 * - faute de frappe : distance de Levenshtein ≤ 1 sur des mots d'au moins 5 lettres.
 */
function tokenSimilar(token: string, aliasWord: string): boolean {
  if (token === aliasWord) return true;
  const [short, long] =
    token.length <= aliasWord.length ? [token, aliasWord] : [aliasWord, token];
  if (long.startsWith(short)) {
    if (short.length >= 3) return true;
    if (short.length === 2 && long.length >= 4) return true;
  }
  if (Math.min(token.length, aliasWord.length) >= 5 && levenshtein(token, aliasWord) <= 1) {
    return true;
  }
  return false;
}

/**
 * Vrai si tous les mots de l'alias se retrouvent, dans l'ordre (pas forcément
 * adjacents), parmi les tokens du libellé via {@link tokenSimilar}.
 */
function aliasMatchesTokens(tokens: string[], aliasWords: string[]): boolean {
  let ti = 0;
  for (const word of aliasWords) {
    while (ti < tokens.length && !tokenSimilar(tokens[ti], word)) ti++;
    if (ti >= tokens.length) return false;
    ti++;
  }
  return true;
}

/** Score d'un alias = nombre total de lettres de ses mots (favorise la spécificité). */
function aliasScore(aliasWords: string[]): number {
  return aliasWords.reduce((sum, w) => sum + w.length, 0);
}

/** Trouve la meilleure matière correspondant à un libellé normalisé. */
function matchSubject(normalized: string): SubjectMatch | null {
  const tokens = mergeAcronyms(normalized).split(' ').filter(Boolean);
  let best: SubjectMatch | null = null;

  const consider = (key: CollectKey, alias: string) => {
    const aliasWords = alias.split(' ');
    if (!aliasMatchesTokens(tokens, aliasWords)) return;
    const score = aliasScore(aliasWords);
    if (!best || score > best.score) {
      best = { key, score };
    }
  };

  for (const [subject, aliases] of Object.entries(SUBJECT_ALIASES)) {
    for (const alias of aliases) consider(subject as Subject, alias);
  }
  for (const alias of LANGUAGE_ALIASES.EN) consider('LANG_EN', alias);
  for (const alias of LANGUAGE_ALIASES.OTHER) {
    consider(`LANG_OTHER:${alias}`, alias);
  }

  return best;
}

/**
 * Extrait les notes valides (0–20) d'une ligne, en gérant la virgule décimale FR
 * et les formes "14,5/20". Ignore les nombres introduits par un coefficient.
 */
function extractGrades(line: string): number[] {
  // Retire les segments de coefficient ("coef 3", "coefficient 2") pour éviter de les compter comme notes.
  const cleaned = line.replace(/coe?f(?:ficient)?\s*:?\s*\d+(?:[.,]\d+)?/gi, ' ');

  const grades: number[] = [];
  // Capture un nombre, éventuellement suivi de "/20" (qu'on ignore).
  const re = /(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:\/\s*20)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned)) !== null) {
    const value = parseFloat(m[1].replace(',', '.'));
    if (!Number.isNaN(value) && value >= 0 && value <= 20) {
      grades.push(value);
    }
  }
  return grades;
}

function roundNote(n: number): number {
  return Math.round(n * 1e9) / 1e9;
}

function average(values: number[]): number {
  return roundNote(values.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Parse le texte collé et retourne les matières reconnues, les conflits, et les
 * lignes ignorées.
 */
export function parseGrades(text: string): ParseResult {
  const ignoredLines: string[] = [];

  // Accumulateurs : Subject classiques + langues séparées (anglais et chaque
  // langue non-anglaise distincte, pour pouvoir détecter un conflit LV2).
  const collected = new Map<CollectKey, { values: number[]; label: string }>();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const normalized = normalizeLabel(line);
    const match = matchSubject(normalized);
    const grades = extractGrades(line);

    if (!match || grades.length === 0) {
      ignoredLines.push(line);
      continue;
    }

    const existing = collected.get(match.key);
    if (existing) {
      existing.values.push(...grades);
    } else {
      collected.set(match.key, { values: [...grades], label: line });
    }
  }

  const matched: ParsedSubject[] = [];
  const conflicts: ParseConflict[] = [];
  const otherLanguages: { label: string; value: number; rawValues: number[] }[] = [];

  for (const [key, data] of collected) {
    if (key === 'LANG_EN') {
      matched.push({
        subject: 'LV1',
        value: average(data.values),
        rawValues: data.values,
        matchedLabel: data.label,
      });
    } else if (typeof key === 'string' && key.startsWith('LANG_OTHER:')) {
      otherLanguages.push({
        label: data.label,
        value: average(data.values),
        rawValues: data.values,
      });
    } else {
      matched.push({
        subject: key as Subject,
        value: average(data.values),
        rawValues: data.values,
        matchedLabel: data.label,
      });
    }
  }

  // LV2 : une seule langue non-anglaise => affectée ; plusieurs => conflit
  // signalé (pas d'affectation automatique, l'utilisateur tranche).
  if (otherLanguages.length === 1) {
    const only = otherLanguages[0];
    matched.push({
      subject: 'LV2',
      value: only.value,
      rawValues: only.rawValues,
      matchedLabel: only.label,
    });
  } else if (otherLanguages.length > 1) {
    conflicts.push({
      kind: 'LV2_AMBIGUOUS',
      message:
        'Plusieurs langues non-anglaises détectées. Choisissez celle à utiliser comme LV2.',
      candidates: otherLanguages,
    });
  }

  return { matched, conflicts, ignoredLines };
}
