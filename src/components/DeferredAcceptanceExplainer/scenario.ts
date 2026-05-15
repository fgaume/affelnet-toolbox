// Données + machine à dériver l'état pour la démonstration Gale-Shapley
// (côté collégien proposant) appliquée à Affelnet : 3 collégiens, 3 lycées
// (1 place chacun). Le user joue la séquence des candidatures une par une.

export type StudentName = "Bob" | "Léa" | "Théo" | "Rose";
export type LyceeId = "bach" | "chopin" | "liszt";

export interface Student {
  readonly name: StudentName;
  readonly score: number;
  readonly voeux: readonly LyceeId[];
}

export interface Lycee {
  readonly id: LyceeId;
  readonly name: string;
  readonly capacity: number;
}

export const students: readonly Student[] = [
  { name: "Bob", score: 40000, voeux: ["chopin", "bach", "liszt"] },
  { name: "Léa", score: 41000, voeux: ["bach", "liszt", "chopin"] },
  { name: "Théo", score: 40500, voeux: ["bach", "chopin", "liszt"] },
];

export const rose: Student = {
  name: "Rose",
  score: 40200,
  voeux: ["bach", "chopin", "liszt"],
};

export const studentsWithRose: readonly Student[] = [...students, rose];

export const lycees: readonly Lycee[] = [
  { id: "bach", name: "Bach", capacity: 1 },
  { id: "chopin", name: "Chopin", capacity: 1 },
  { id: "liszt", name: "Liszt", capacity: 1 },
];

export type Outcome =
  | { readonly kind: "accept-vacant" }
  | { readonly kind: "accept-evict"; readonly evicted: StudentName }
  | { readonly kind: "reject" };

export interface Action {
  readonly student: StudentName;
  readonly lycee: LyceeId;
  readonly outcome: Outcome;
  /** Court récit affiché après l'action (mode pédagogique). */
  readonly narrative: string;
}

/**
 * Séquence des candidatures dans l'ordre où le user va les déclencher.
 * Gale-Shapley est ordre-indépendant côté résultat final ; on choisit ici un
 * ordre pédagogique (Bob → Léa → Théo, puis les rejetés repassent).
 */
export const actionsForward: readonly Action[] = [
  {
    student: "Bob",
    lycee: "chopin",
    outcome: { kind: "accept-vacant" },
    narrative:
      "Bob propose Chopin. Place vacante, il est accepté provisoirement.",
  },
  {
    student: "Léa",
    lycee: "bach",
    outcome: { kind: "accept-vacant" },
    narrative:
      "Léa propose Bach. Place vacante, elle est acceptée provisoirement.",
  },
  {
    student: "Théo",
    lycee: "bach",
    outcome: { kind: "reject" },
    narrative:
      "Théo propose Bach. Léa (41 000) est déjà là avec un meilleur score que Théo (40 500) donc Théo est refusé.",
  },
  {
    student: "Théo",
    lycee: "chopin",
    outcome: { kind: "accept-evict", evicted: "Bob" },
    narrative:
      "Théo propose Chopin. Le score de Théo (40 500) est supérieur à celui de Bob (40 000). Théo prend donc la place, Bob est évincé et retourne dans le groupe des non-affectés.",
  },
  {
    student: "Bob",
    lycee: "bach",
    outcome: { kind: "reject" },
    narrative:
      "Bob propose Bach. Léa (41 000) garde sa place puisque son score est supérieur à celui de Bob (40 000). Bob est donc refusé.",
  },
  {
    student: "Bob",
    lycee: "liszt",
    outcome: { kind: "accept-vacant" },
    narrative:
      "Bob propose Liszt. Place vacante, il est accepté. Tous les collégiens sont affectés, donc l'algorithme s'arrête et les affectations sont définitives.",
  },
];

/**
 * Même algorithme, mais en inversant l'ordre des collégiens (Théo → Léa → Bob).
 * Le résultat final est identique : Bach=Léa, Chopin=Théo, Liszt=Bob — ce qui
 * illustre que Gale-Shapley est indépendant de l'ordre de traitement.
 */
export const actionsReversed: readonly Action[] = [
  {
    student: "Théo",
    lycee: "bach",
    outcome: { kind: "accept-vacant" },
    narrative:
      "Théo propose Bach. Place vacante, il est accepté provisoirement.",
  },
  {
    student: "Léa",
    lycee: "bach",
    outcome: { kind: "accept-evict", evicted: "Théo" },
    narrative:
      "Léa propose Bach. Le score de Léa (41 000) est supérieur à celui de Théo (40 500). Léa prend donc la place, Théo est évincé et retourne dans le groupe des non-affectés.",
  },
  {
    student: "Bob",
    lycee: "chopin",
    outcome: { kind: "accept-vacant" },
    narrative:
      "Bob propose Chopin. Place vacante, il est accepté provisoirement.",
  },
  {
    student: "Théo",
    lycee: "chopin",
    outcome: { kind: "accept-evict", evicted: "Bob" },
    narrative:
      "Théo propose Chopin. Le score de Théo (40 500) est supérieur à celui de Bob (40 000). Théo prend donc la place, Bob est évincé et retourne dans le groupe des non-affectés.",
  },
  {
    student: "Bob",
    lycee: "bach",
    outcome: { kind: "reject" },
    narrative:
      "Bob propose Bach. Léa (41 000) garde sa place puisque son score est supérieur à celui de Bob (40 000). Bob est donc refusé.",
  },
  {
    student: "Bob",
    lycee: "liszt",
    outcome: { kind: "accept-vacant" },
    narrative:
      "Bob propose Liszt. Place vacante, il est accepté. Tous les collégiens sont affectés : le résultat final est identique à l'ordre précédent : l'algorithme de Gale-Shapley est bien indépendant de l'ordre de traitement.",
  },
];

/**
 * Actions additionnelles déclenchées quand le user clique sur « Ajouter Rose »
 * après la fin de l'algo normal. Rose (40 200) propose Bach → refusée par Léa
 * (41 000), Chopin → refusée par Théo (40 500), puis Liszt → prend la place de
 * Bob (40 000). Bob a épuisé tous ses vœux et reste non affecté : c'est normal
 * puisqu'il y a alors 4 collégiens pour 3 places.
 */
export const actionsRoseAddon: readonly Action[] = [
  {
    student: "Rose",
    lycee: "bach",
    outcome: { kind: "reject" },
    narrative:
      "Rose propose Bach. Léa (41 000) y est déjà avec un meilleur score que Rose (40 200), donc Rose est refusée.",
  },
  {
    student: "Rose",
    lycee: "chopin",
    outcome: { kind: "reject" },
    narrative:
      "Rose propose Chopin. Théo (40 500) y est déjà avec un meilleur score que Rose (40 200), donc Rose est refusée.",
  },
  {
    student: "Rose",
    lycee: "liszt",
    outcome: { kind: "accept-evict", evicted: "Bob" },
    narrative:
      "Rose propose Liszt. Le score de Rose (40 200) est supérieur à celui de Bob (40 000) : Rose prend la place et Bob est évincé. Bob a épuisé ses 3 vœux et reste donc non affecté (c'est normal puisqu'il y a 4 collégiens pour 3 places). On voit donc bien que Rose aurait pu tenter tous les lycées possibles puisque le score de son dernier lui assurait sa place à Liszt",
  },
];

/** Alias rétro-compatible : par défaut on joue l'ordre « forward ». */
export const actions = actionsForward;

export type VoeuStatus = "pending" | "accepted" | "rejected";

export interface DerivedState {
  readonly slots: Readonly<Record<LyceeId, StudentName | null>>;
  /** key = `${student}:${lycee}` */
  readonly voeuStatus: Readonly<Record<string, VoeuStatus>>;
  readonly activeAction: Action | null;
  readonly isComplete: boolean;
  /** Narratif de la dernière action exécutée (ou message d'intro). */
  readonly lastNarrative: string;
  readonly round: number;
}

export function voeuKey(student: StudentName, lycee: LyceeId): string {
  return `${student}:${lycee}`;
}

export function deriveState(
  actionIndex: number,
  currentActions: readonly Action[] = actions,
  studentsList: readonly Student[] = students,
): DerivedState {
  const slots: Record<LyceeId, StudentName | null> = {
    bach: null,
    chopin: null,
    liszt: null,
  };
  const voeuStatus: Record<string, VoeuStatus> = {};
  for (const s of studentsList) {
    for (const l of s.voeux) voeuStatus[voeuKey(s.name, l)] = "pending";
  }
  let lastNarrative =
    "Le 1ᵉʳ collégien va proposer son vœu favori. Cliquez sur les boutons oranges successifs pour faire avancer l'algorithme.";
  for (let i = 0; i < actionIndex; i += 1) {
    const a = currentActions[i];
    lastNarrative = a.narrative;
    if (a.outcome.kind === "reject") {
      voeuStatus[voeuKey(a.student, a.lycee)] = "rejected";
    } else {
      voeuStatus[voeuKey(a.student, a.lycee)] = "accepted";
      slots[a.lycee] = a.student;
      if (a.outcome.kind === "accept-evict") {
        voeuStatus[voeuKey(a.outcome.evicted, a.lycee)] = "rejected";
      }
    }
  }
  const activeAction =
    actionIndex < currentActions.length ? currentActions[actionIndex] : null;
  const isComplete = actionIndex === currentActions.length;

  // Calcul du tour :
  // - Tour 1 : 3 premiers vœux (indices 0..2)
  // - Tour 2..4 : actions normales restantes (indices 3..5)
  // - Tour 5..7 : actions additionnelles de Rose (indices 6..8) le cas échéant
  let round = 1;
  if (actionIndex >= 8) round = 7;
  else if (actionIndex >= 7) round = 6;
  else if (actionIndex >= 6) round = 5;
  else if (actionIndex >= 5) round = 4;
  else if (actionIndex >= 4) round = 3;
  else if (actionIndex >= 3) round = 2;

  return { slots, voeuStatus, activeAction, isComplete, lastNarrative, round };
}

/** Pour chaque lycée, la liste des collégiens qui le citent, triés par score décroissant. */
export function candidatesFor(
  lyceeId: LyceeId,
  studentsList: readonly Student[] = students,
): readonly Student[] {
  return [...studentsList]
    .filter((s) => s.voeux.includes(lyceeId))
    .sort((a, b) => b.score - a.score);
}
