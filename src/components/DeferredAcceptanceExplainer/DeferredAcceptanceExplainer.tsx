import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  actionsForward,
  actionsReversed,
  candidatesFor,
  deriveState,
  lycees,
  students,
  voeuKey,
  type Action,
  type LyceeId,
  type StudentName,
} from "./scenario";

import "./DeferredAcceptanceExplainer.css";

type AnimationKind = "fly-accept" | "reject" | "evict";

interface Animation {
  readonly kind: AnimationKind;
  readonly studentName: StudentName;
  readonly fromRect: DOMRect;
  readonly toRect: DOMRect;
  readonly action: Action;
}

const FLY_ACCEPT_MS = 1200;
const REJECT_MS = 2200;
const EVICT_MS = 1600;

type TooltipSide = "above" | "below";

interface Tooltip {
  readonly text: string;
  readonly anchorX: number;
  readonly anchorY: number;
  readonly side: TooltipSide;
  /** Sert de clé React pour rejouer l'animation d'entrée à chaque tooltip. */
  readonly id: number;
}

const lyceeName = (id: LyceeId): string =>
  lycees.find((l) => l.id === id)?.name ?? id;

function StudentIcon({ size = 16 }: { readonly size?: number }) {
  return (
    <svg
      className="da-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  );
}

function LyceeIcon({ size = 14 }: { readonly size?: number }) {
  return (
    <svg
      className="da-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
    </svg>
  );
}

function InfoIcon({ size = 20 }: { readonly size?: number }) {
  return (
    <svg
      className="da-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
    </svg>
  );
}

function LightbulbIcon({ size = 18 }: { readonly size?: number }) {
  return (
    <svg
      className="da-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6C7.8 12.16 7 10.63 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z" />
    </svg>
  );
}

function TimerIcon({ size = 14 }: { readonly size?: number }) {
  return (
    <svg
      className="da-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.61.75-1.23-4.5-3.06z" />
    </svg>
  );
}

const kindCssSuffix = (k: AnimationKind): "accept" | "reject" | "evict" =>
  k === "fly-accept" ? "accept" : k === "reject" ? "reject" : "evict";

interface Connection {
  readonly id: string;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export function DeferredAcceptanceExplainer() {
  const [actionIndex, setActionIndex] = useState(0);
  const [animation, setAnimation] = useState<Animation | null>(null);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [connections, setConnections] = useState<readonly Connection[]>([]);
  const [resizeCount, setResizeCount] = useState(0);
  const [showCandidates, setShowCandidates] = useState(true);
  const [reversed, setReversed] = useState(false);
  const [reorderAnimating, setReorderAnimating] = useState(false);
  const tooltipIdRef = useRef(0);

  const currentActions: readonly Action[] = reversed
    ? actionsReversed
    : actionsForward;
  const displayedStudents = useMemo(
    () => (reversed ? [...students].reverse() : students),
    [reversed],
  );

  const derived = useMemo(
    () => deriveState(actionIndex, currentActions),
    [actionIndex, currentActions],
  );

  const boardRef = useRef<HTMLDivElement>(null);
  const voeuBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const slotRefs = useRef<Map<LyceeId, HTMLDivElement>>(new Map());
  const studentCardRefs = useRef<Map<StudentName, HTMLDivElement>>(new Map());
  const studentRowRefs = useRef<Map<StudentName, HTMLDivElement>>(new Map());
  const floaterRef = useRef<HTMLDivElement | null>(null);
  // FLIP : positions des lignes collégiens AVANT l'inversion, à consommer dans
  // un useLayoutEffect post-render pour animer le déplacement.
  const reorderFromRectsRef = useRef<Map<StudentName, DOMRect>>(new Map());

  // Mise à jour des flèches
  useLayoutEffect(() => {
    if (!boardRef.current || window.innerWidth <= 724) {
      if (connections.length > 0) {
        setConnections([]);
      }
      return;
    }

    const boardRect = boardRef.current.getBoundingClientRect();
    const newConnections: Connection[] = [];

    (Object.keys(derived.slots) as LyceeId[]).forEach((lyceeId) => {
      const studentName = derived.slots[lyceeId];
      if (!studentName) return;

      const studentEl = studentCardRefs.current.get(studentName);
      const slotEl = slotRefs.current.get(lyceeId);

      if (studentEl && slotEl) {
        const sRect = studentEl.getBoundingClientRect();
        const lRect = slotEl.getBoundingClientRect();

        newConnections.push({
          id: `${studentName}-${lyceeId}`,
          x1: sRect.right - boardRect.left,
          y1: sRect.top - boardRect.top + sRect.height / 2,
          x2: lRect.left - boardRect.left,
          y2: lRect.top - boardRect.top + lRect.height / 2,
        });
      }
    });

    // Éviter l'update si rien n'a changé
    const currentIds = connections.map((c) => c.id).join(",");
    const currentCoords = connections
      .map((c) => `${c.x1},${c.y1},${c.x2},${c.y2}`)
      .join("|");

    const newIds = newConnections.map((c) => c.id).join(",");
    const newCoords = newConnections
      .map((c) => `${c.x1},${c.y1},${c.x2},${c.y2}`)
      .join("|");

    if (currentIds !== newIds || currentCoords !== newCoords) {
      setConnections(newConnections);
    }
  }, [
    derived.slots,
    actionIndex,
    animation,
    resizeCount,
    connections,
    showCandidates,
  ]);

  // Mise à jour de resizeCount sur redimensionnement ou changement de visibilité
  useEffect(() => {
    const handleResize = () => setResizeCount((c) => c + 1);
    window.addEventListener("resize", handleResize);

    let observer: ResizeObserver | null = null;
    if (boardRef.current && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        setResizeCount((c) => c + 1);
      });
      observer.observe(boardRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      observer?.disconnect();
    };
  }, []);

  const setVoeuBtnRef = useCallback(
    (key: string, el: HTMLButtonElement | null) => {
      if (el) voeuBtnRefs.current.set(key, el);
      else voeuBtnRefs.current.delete(key);
    },
    [],
  );
  const setSlotRef = useCallback((id: LyceeId, el: HTMLDivElement | null) => {
    if (el) slotRefs.current.set(id, el);
    else slotRefs.current.delete(id);
  }, []);
  const setStudentCardRef = useCallback(
    (name: StudentName, el: HTMLDivElement | null) => {
      if (el) studentCardRefs.current.set(name, el);
      else studentCardRefs.current.delete(name);
    },
    [],
  );
  const setStudentRowRef = useCallback(
    (name: StudentName, el: HTMLDivElement | null) => {
      if (el) studentRowRefs.current.set(name, el);
      else studentRowRefs.current.delete(name);
    },
    [],
  );

  const handleVoeuClick = useCallback(() => {
    const action = derived.activeAction;
    if (!action || animation) return;
    const card = studentCardRefs.current.get(action.student);
    const slot = slotRefs.current.get(action.lycee);

    const advanceImmediately = () => setActionIndex((i) => i + 1);

    if (!card || !slot) {
      advanceImmediately();
      return;
    }
    const fromRect = card.getBoundingClientRect();
    const toRect = slot.getBoundingClientRect();
    if (fromRect.width === 0 && toRect.width === 0) {
      // Env non-DOM (JSDOM) : on saute l'animation.
      advanceImmediately();
      return;
    }
    setAnimation({
      kind: action.outcome.kind === "reject" ? "reject" : "fly-accept",
      studentName: action.student,
      fromRect,
      toRect,
      action,
    });
  }, [derived.activeAction, animation]);

  // Déclenche la translation (ou la custom property pour le keyframe reject)
  // pour que la transition CSS s'exécute depuis la position initiale.
  useLayoutEffect(() => {
    if (!animation || !floaterRef.current) return;
    const el = floaterRef.current;
    const dx =
      animation.toRect.left -
      animation.fromRect.left +
      (animation.toRect.width - animation.fromRect.width) / 2;
    const dy =
      animation.toRect.top -
      animation.fromRect.top +
      (animation.toRect.height - animation.fromRect.height) / 2;
    if (animation.kind === "reject") {
      el.style.setProperty(
        "--da-target-transform",
        `translate(${dx}px, ${dy}px)`,
      );
      return;
    }
    const raf = requestAnimationFrame(() => {
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      el.classList.add("da-floater--landed");
    });
    return () => cancelAnimationFrame(raf);
  }, [animation]);

  // Pilote la transition d'état après chaque phase d'animation.
  useEffect(() => {
    if (!animation) return;
    if (animation.kind === "fly-accept") {
      const t = window.setTimeout(() => {
        const action = animation.action;
        setActionIndex((i) => i + 1);
        if (action.outcome.kind === "accept-evict") {
          // Phase 2 (évincement) : le nom de l'évincé retourne vers sa carte.
          const slot = slotRefs.current.get(action.lycee);
          const card = studentCardRefs.current.get(action.outcome.evicted);
          if (slot && card) {
            const fromRect2 = slot.getBoundingClientRect();
            const toRect2 = card.getBoundingClientRect();
            if (fromRect2.width > 0 || toRect2.width > 0) {
              setAnimation({
                kind: "evict",
                studentName: action.outcome.evicted,
                fromRect: fromRect2,
                toRect: toRect2,
                action,
              });
              return;
            }
          }
        }
        setAnimation(null);
      }, FLY_ACCEPT_MS);
      return () => window.clearTimeout(t);
    }
    if (animation.kind === "evict") {
      const t = window.setTimeout(() => setAnimation(null), EVICT_MS);
      return () => window.clearTimeout(t);
    }
    // reject
    const t = window.setTimeout(() => {
      setActionIndex((i) => i + 1);
      setAnimation(null);
    }, REJECT_MS);
    return () => window.clearTimeout(t);
  }, [animation]);

  const handleReplay = useCallback(() => {
    setAnimation(null);
    setTooltip(null);
    setActionIndex(0);
  }, []);

  const handleReverseOrder = useCallback(() => {
    // FLIP step 1 (First) : capturer les positions actuelles des lignes
    // collégiens AVANT que React ne réordonne le DOM. Le useLayoutEffect
    // post-render se chargera d'inverser et de jouer la transition.
    const rects = new Map<StudentName, DOMRect>();
    studentRowRefs.current.forEach((el, name) => {
      rects.set(name, el.getBoundingClientRect());
    });
    reorderFromRectsRef.current = rects;
    setAnimation(null);
    setTooltip(null);
    setActionIndex(0);
    setReorderAnimating(true);
    setReversed((r) => !r);
  }, []);

  // FLIP steps 2-4 (Last/Invert/Play) : après le réordonnancement du DOM,
  // on applique aux lignes un transform qui les remet à leur ancienne
  // position, puis on laisse la transition CSS animer le retour à zéro.
  useLayoutEffect(() => {
    const oldRects = reorderFromRectsRef.current;
    if (oldRects.size === 0) return;
    reorderFromRectsRef.current = new Map();

    const animated: HTMLDivElement[] = [];
    studentRowRefs.current.forEach((el, name) => {
      const oldRect = oldRects.get(name);
      if (!oldRect) return;
      const newRect = el.getBoundingClientRect();
      const dy = oldRect.top - newRect.top;
      if (dy === 0) return;
      el.style.transition = "none";
      el.style.transform = `translateY(${dy}px)`;
      animated.push(el);
    });

    if (animated.length === 0) {
      setReorderAnimating(false);
      return;
    }

    const raf = requestAnimationFrame(() => {
      animated.forEach((el) => {
        el.style.transition = "transform 650ms cubic-bezier(0.4, 0, 0.2, 1)";
        el.style.transform = "";
      });
    });

    const timeout = window.setTimeout(() => {
      animated.forEach((el) => {
        el.style.transition = "";
        el.style.transform = "";
      });
      setReorderAnimating(false);
    }, 750);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
    };
  }, [reversed]);

  const handlePrevious = useCallback(() => {
    if (animation) return;
    setAnimation(null);
    setTooltip(null);
    setActionIndex((i) => Math.max(0, i - 1));
  }, [animation]);

  // Tooltip pédagogique positionnée au bon endroit : au-dessus du slot du
  // lycée concerné une fois l'action terminée, ou au-dessus du bouton orange
  // pour l'intro. Affichée seulement quand aucune animation n'est en cours.
  useLayoutEffect(() => {
    if (animation || reorderAnimating) {
      if (tooltip !== null) {
        setTooltip(null);
      }
      return;
    }
    let target: HTMLElement | null = null;
    let text: string = derived.lastNarrative;
    let side: TooltipSide = "above";

    if (actionIndex === 0) {
      const first = currentActions[0];
      target =
        voeuBtnRefs.current.get(voeuKey(first.student, first.lycee)) ?? null;
      side = "below";
    } else {
      const lastAction = currentActions[actionIndex - 1];
      target = slotRefs.current.get(lastAction.lycee) ?? null;
      side = "above";
    }

    if (!target) return;
    const rect = target.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return; // JSDOM
    const anchorX = rect.left + rect.width / 2;
    const anchorY = side === "above" ? rect.top - 10 : rect.bottom + 10;

    if (
      !tooltip ||
      tooltip.text !== text ||
      tooltip.anchorX !== anchorX ||
      tooltip.anchorY !== anchorY ||
      tooltip.side !== side
    ) {
      tooltipIdRef.current += 1;
      setTooltip({
        text,
        anchorX,
        anchorY,
        side,
        id: tooltipIdRef.current,
      });
    }
  }, [actionIndex, animation, tooltip, resizeCount, currentActions, reorderAnimating]);

  // La tooltip reste affichée jusqu'au prochain clic du user : c'est le
  // démarrage de la nouvelle animation (`setAnimation(...)`) qui la fait
  // disparaître via la branche `if (animation)` du useLayoutEffect ci-dessus.

  return (
    <section className="da-explainer" aria-labelledby="da-title">
      <h2 id="da-title" className="da-sr-only">
        Démonstration interactive de l'algorithme deferred acceptance
      </h2>

      <div className="da-intro">
        <strong className="da-intro-title">
          <InfoIcon /> Comment fonctionne l'algorithme d'Affelnet ?
        </strong>
        <p className="da-intro-text">
          <span>
            Cette animation illustre l'algorithme de{" "}
            <strong>Gale-Shapley</strong> (ou « acceptation différée ») utilisé
            par Affelnet. L'algorithme parcourt les choix des élèves un par un.
            Une place obtenue n'est <strong>jamais définitive</strong> tant que
            tous les élèves n'ont pas été traités : un candidat avec un meilleur
            score peut « évincer » un élève déjà accepté provisoirement.
          </span>
        </p>
        <p className="da-intro-text">
          <LightbulbIcon />
          <span>
            Cette animation vise à vous convaincre que{" "}
            <strong>tenter des lycées de "coeur"</strong> (où vos chances
            paraissent bien faibles a priori) en premiers voeux{" "}
            <strong>n'a absolument aucune incidence sur vos chances</strong>{" "}
            d'obtenir une place dans vos lycées de "raison", que vous avez
            classés plus bas dans votre liste de voeux.
          </span>
        </p>
      </div>

      <div
        className={
          "da-board" + (showCandidates ? "" : " da-board--candidates-hidden")
        }
        ref={boardRef}
      >
        {/* SVG des flèches de connexion */}
        <svg className="da-connections" aria-hidden="true">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" className="da-arrow-head" />
            </marker>
          </defs>
          {connections.map((c) => (
            <path
              key={c.id}
              d={`M ${c.x1} ${c.y1} L ${c.x2} ${c.y2}`}
              className="da-arrow-path"
              markerEnd="url(#arrowhead)"
            />
          ))}
        </svg>

        <div className="da-column">
          <div className="da-column-header">
            <div className="da-column-title">Collégiens</div>
          </div>
          {displayedStudents.map((s) => {
            const isAccepted = (Object.keys(derived.slots) as LyceeId[]).some(
              (l) => derived.slots[l] === s.name,
            );
            // La carte du collégien est masquée pendant qu'elle "vole" vers
            // le lycée (accept) ou tente puis rebondit (reject). On garde
            // l'espace via `visibility: hidden` pour stabiliser la grille.
            const isAnimSource =
              !!animation &&
              animation.studentName === s.name &&
              (animation.kind === "fly-accept" || animation.kind === "reject");
            return (
              <div
                key={s.name}
                ref={(el) => setStudentRowRef(s.name, el)}
                className={
                  "da-student-row" +
                  (isAccepted ? " da-student-row--accepted" : "")
                }
              >
                <div className="da-voeux">
                  <div className="da-voeux-title">Vœux de {s.name}</div>
                  <ol className="da-voeux-list">
                    {s.voeux.map((lyceeId, i) => {
                      const status =
                        derived.voeuStatus[voeuKey(s.name, lyceeId)] ??
                        "pending";
                      const isActive =
                        !!derived.activeAction &&
                        derived.activeAction.student === s.name &&
                        derived.activeAction.lycee === lyceeId;
                      const isClickable = isActive && !animation;
                      return (
                        <li
                          key={lyceeId}
                          className={`da-voeu da-voeu--${status}`}
                        >
                          <span className="da-voeu-rank">{i + 1}.</span>
                          {isActive ? (
                            <button
                              type="button"
                              className="da-voeu-btn"
                              ref={(el) =>
                                setVoeuBtnRef(voeuKey(s.name, lyceeId), el)
                              }
                              onClick={handleVoeuClick}
                              disabled={!isClickable}
                              aria-label={`Proposer ${lyceeName(lyceeId)} pour ${s.name}`}
                            >
                              <LyceeIcon />
                              {lyceeName(lyceeId)}
                            </button>
                          ) : (
                            <span className="da-voeu-label">
                              <LyceeIcon />
                              {lyceeName(lyceeId)}
                              {status === "accepted" && (
                                <span className="da-voeu-check"> ✓</span>
                              )}
                              {status === "rejected" && (
                                <span className="da-voeu-cross"> ✕</span>
                              )}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </div>
                <div
                  className="da-student-card"
                  ref={(el) => setStudentCardRef(s.name, el)}
                  style={isAnimSource ? { visibility: "hidden" } : undefined}
                >
                  <div className="da-student-name">
                    <StudentIcon size={16} />
                    {s.name}
                  </div>
                  <div className="da-student-status">
                    {isAccepted ? (
                      <span className="da-status-tag da-status-tag--accepted">
                        Affecté
                      </span>
                    ) : (
                      <span className="da-status-tag da-status-tag--pending">
                        En attente
                      </span>
                    )}
                  </div>
                  <div className="da-student-score">
                    {s.score.toLocaleString("fr-FR")} pts
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Colonne centrale élastique (spacer) */}
        <div className="da-spacer">
          <div className="da-column-header da-column-header--center">
            <div
              key={derived.round}
              className="da-round-indicator"
              title={`Tour ${derived.round}`}
            >
              <TimerIcon />
              {derived.round}
              {derived.round === 1 ? "ᵉʳ" : "ᵉ"} tour
            </div>
          </div>
        </div>

        <div className="da-column">
          <div className="da-column-header">
            <div className="da-column-title">Lycées</div>
            <button
              type="button"
              className="da-candidates-toggle"
              onClick={() => setShowCandidates((v) => !v)}
              aria-pressed={!showCandidates}
              aria-label={
                showCandidates
                  ? "Masquer les listes de préférences des lycées"
                  : "Afficher les listes de préférences des lycées"
              }
            >
              {showCandidates ? "Masquer préférences" : "Afficher préférences"}
            </button>
          </div>
          {lycees.map((l) => {
            const occupant = derived.slots[l.id];
            const occupantStudent =
              occupant && students.find((s) => s.name === occupant);
            const cands = candidatesFor(l.id);
            return (
              <div key={l.id} className="da-lycee-row">
                <div className="da-lycee-card">
                  <div className="da-lycee-name">
                    <LyceeIcon size={18} />
                    {l.name}
                  </div>
                  <div className="da-lycee-capacity">
                    {l.capacity === 1 ? "1 place" : `${l.capacity} places`}
                  </div>
                  <div
                    className="da-lycee-slot"
                    ref={(el) => setSlotRef(l.id, el)}
                  >
                    {occupantStudent ? (
                      <div
                        className={
                          "da-slot-filled" +
                          (derived.isComplete ? " da-slot-filled--final" : "")
                        }
                      >
                        <div className="da-slot-filled-name">
                          <StudentIcon size={16} />
                          {occupantStudent.name}
                        </div>
                        <div className="da-student-score">
                          {occupantStudent.score.toLocaleString("fr-FR")} pts
                        </div>
                        {derived.isComplete && (
                          <div className="da-slot-check">✓ affecté</div>
                        )}
                      </div>
                    ) : (
                      <div className="da-slot-empty">— vacant —</div>
                    )}
                  </div>
                </div>
                <div className="da-candidates">
                  <div className="da-candidates-title">Préfère (score ↓)</div>
                  <ol className="da-candidates-list">
                    {cands.map((c) => {
                      const cStatus =
                        derived.voeuStatus[voeuKey(c.name, l.id)] ?? "pending";
                      const cls =
                        cStatus === "accepted"
                          ? "da-candidate--accepted"
                          : cStatus === "rejected"
                            ? "da-candidate--rejected"
                            : "";
                      return (
                        <li
                          key={c.name}
                          className={`da-candidate ${cls}`.trim()}
                        >
                          <span>{c.name}</span>
                          <span className="da-candidate-score">
                            {c.score.toLocaleString("fr-FR")}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {(actionIndex > 0 || derived.isComplete) && (
        <div className="da-controls">
          {actionIndex > 0 && (
            <button
              type="button"
              className="da-control-btn"
              onClick={handlePrevious}
              disabled={!!animation}
            >
              ← Étape précédente
            </button>
          )}
          {derived.isComplete && (
            <button
              type="button"
              className="da-control-btn"
              onClick={handleReplay}
            >
              ↻ Rejouer l'animation
            </button>
          )}
          {derived.isComplete && (
            <button
              type="button"
              className="da-control-btn da-control-btn--secondary"
              onClick={handleReverseOrder}
              title="Rejouer l'algorithme en inversant l'ordre des collégiens : le résultat final sera identique."
            >
              ⇅ Inverser l'ordre des collégiens
            </button>
          )}
        </div>
      )}

      {animation &&
        (() => {
          const s = students.find((st) => st.name === animation.studentName);
          if (!s) return null;
          // Le floater adopte la taille de la destination (slot) dès le départ,
          // pour qu'il s'intègre parfaitement à l'arrivée. On le centre sur la
          // carte source pour que l'envol démarre depuis le centre du cadre du
          // collégien. Pour l'éviction (slot → carte), on garde la taille du
          // slot d'origine (sinon le floater déborderait du slot au départ).
          const isFlyToSlot =
            animation.kind === "fly-accept" || animation.kind === "reject";
          const floaterW = isFlyToSlot
            ? animation.toRect.width
            : animation.fromRect.width;
          const floaterH = isFlyToSlot
            ? animation.toRect.height
            : animation.fromRect.height;
          const startLeft =
            animation.fromRect.left + (animation.fromRect.width - floaterW) / 2;
          const startTop =
            animation.fromRect.top + (animation.fromRect.height - floaterH) / 2;
          return (
            <div
              key={`${animation.kind}-${animation.action.student}-${animation.action.lycee}`}
              ref={floaterRef}
              className={`da-floater da-floater--${kindCssSuffix(animation.kind)}`}
              aria-hidden="true"
              style={{
                left: startLeft,
                top: startTop,
                width: floaterW,
                height: floaterH,
              }}
            >
              <div className="da-floater-name">
                <StudentIcon size={16} />
                {s.name}
              </div>
              <div className="da-floater-score">
                {s.score.toLocaleString("fr-FR")} pts
              </div>
            </div>
          );
        })()}

      {tooltip && (
        <div
          key={tooltip.id}
          className={`da-tooltip da-tooltip--${tooltip.side}`}
          role="status"
          aria-live="polite"
          style={{ left: tooltip.anchorX, top: tooltip.anchorY }}
        >
          {tooltip.text}
        </div>
      )}
    </section>
  );
}
