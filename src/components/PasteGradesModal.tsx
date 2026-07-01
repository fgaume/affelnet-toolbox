import { useCallback, useMemo, useState } from 'react';
import type { Subject, UserGrades } from '../types';
import { parseGrades } from '../services/gradeParser';
import type { ParseResult } from '../services/gradeParser';
import './PasteGradesModal.css';

const SUBJECT_LABELS: Record<Subject, string> = {
  FRANCAIS: 'Français',
  MATHEMATIQUES: 'Mathématiques',
  HISTOIRE_GEO: 'Histoire-Géo',
  EMC: 'EMC',
  LV1: 'LV1 (anglais)',
  LV2: 'LV2',
  SVT: 'SVT',
  TECHNOLOGIE: 'Technologie',
  PHYSIQUE_CHIMIE: 'Physique-Chimie',
  ARTS_PLASTIQUES: 'Arts Plastiques',
  EDUCATION_MUSICALE: 'Éduc. Musicale',
  EPS: 'EPS',
};

interface PasteGradesModalProps {
  currentGrades: UserGrades;
  /** Reçoit les notes à écrire (déjà filtrées sur les champs vides). */
  onApply: (toApply: Partial<Record<Subject, number>>) => void;
  onClose: () => void;
}

function formatNote(n: number): string {
  return n.toFixed(2).replace('.', ',');
}

const PLACEHOLDER = `Collez ici vos notes, par exemple :

ANGLAIS LV1            17
FRANCAIS              12   13   11
HISTOIRE-GEOGRAPHIE    15
ITALIEN                13
MATHEMATIQUES          14,5
PHYSIQUE-CHIMIE        12
SCIENCES VIE & TERRE   11,5
TECHNOLOGIE            14
ARTS PLASTIQUES        15
ED.PHYSIQUE & SPORT.   18
EDUCATION MUSICALE     16`;

const PasteGradesModal: React.FC<PasteGradesModalProps> = ({ currentGrades, onApply, onClose }) => {
  const [text, setText] = useState('');
  const [result, setResult] = useState<ParseResult | null>(null);
  const [showIgnored, setShowIgnored] = useState(false);
  /** Libellé de la langue choisie pour résoudre un conflit LV2. */
  const [lv2Choice, setLv2Choice] = useState<string | null>(null);

  const handleAnalyze = useCallback(() => {
    setResult(parseGrades(text));
    setLv2Choice(null);
  }, [text]);

  const lv2Conflict = result?.conflicts.find((c) => c.kind === 'LV2_AMBIGUOUS') ?? null;

  /** Notes effectivement appliquées : matières détectées + LV2 résolue, sur champs vides uniquement. */
  const toApply = useMemo<Partial<Record<Subject, number>>>(() => {
    if (!result) return {};
    const map: Partial<Record<Subject, number>> = {};
    for (const m of result.matched) {
      if (currentGrades[m.subject] === null) map[m.subject] = m.value;
    }
    if (lv2Conflict && lv2Choice && currentGrades.LV2 === null) {
      const chosen = lv2Conflict.candidates.find((c) => c.label === lv2Choice);
      if (chosen) map.LV2 = chosen.value;
    }
    return map;
  }, [result, currentGrades, lv2Conflict, lv2Choice]);

  const handleApply = useCallback(() => {
    onApply(toApply);
    onClose();
  }, [toApply, onApply, onClose]);

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div
      className="paste-grades-overlay"
      role="button"
      tabIndex={0}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="paste-grades-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Coller mes notes"
        tabIndex={-1}
        onClick={stop}
        onKeyDown={stop}
      >
        <h3 className="paste-grades-title">Coller mes notes</h3>

        {result === null ? (
          <>
            <p className="paste-grades-help">
              Collez vos moyennes (relevé, bulletin…). Le format importe peu : on reconnaît les
              libellés courants même abrégés. Si une matière apparaît plusieurs fois (trimestres,
              semestres), la moyenne est calculée automatiquement.
            </p>
            <textarea
              className="paste-grades-textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={PLACEHOLDER}
              rows={12}
              autoFocus
              aria-label="Zone de collage des notes"
            />
            <div className="paste-grades-actions">
              <button type="button" className="paste-grades-btn-secondary" onClick={onClose}>
                Annuler
              </button>
              <button
                type="button"
                className="paste-grades-btn-primary"
                onClick={handleAnalyze}
                disabled={text.trim() === ''}
              >
                Analyser
              </button>
            </div>
          </>
        ) : (
          <>
            {result.matched.length === 0 && !lv2Conflict ? (
              <p className="paste-grades-empty">
                Aucune note n'a pu être reconnue. Vérifiez le contenu collé et réessayez.
              </p>
            ) : (
              <>
                <p className="paste-grades-help">
                  Vérifiez la synthèse ci-dessous. Seuls les champs encore <b>vides</b> seront
                  remplis ; les matières déjà saisies sont conservées.
                </p>
                <table className="paste-grades-summary">
                  <thead>
                    <tr>
                      <th>Matière</th>
                      <th>Note</th>
                      <th>Reconnu depuis</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.matched.map((m) => {
                      const alreadyFilled = currentGrades[m.subject] !== null;
                      return (
                        <tr key={m.subject} className={alreadyFilled ? 'row-skipped' : ''}>
                          <td>{SUBJECT_LABELS[m.subject]}</td>
                          <td className="cell-note">
                            {formatNote(m.value)}
                            {m.rawValues.length > 1 && (
                              <span className="cell-avg-hint">
                                {' '}
                                (moyenne de {m.rawValues.length} notes)
                              </span>
                            )}
                          </td>
                          <td className="cell-label">{m.matchedLabel}</td>
                          <td className="cell-status">
                            {alreadyFilled ? 'déjà saisi — ignoré' : 'sera ajouté'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}

            {lv2Conflict && (
              <div className="paste-grades-conflict">
                <p className="paste-grades-conflict-title">⚠ {lv2Conflict.message}</p>
                {currentGrades.LV2 !== null ? (
                  <p className="paste-grades-conflict-note">
                    LV2 est déjà saisie : aucune de ces langues ne sera appliquée.
                  </p>
                ) : (
                  <div className="paste-grades-conflict-options">
                    {lv2Conflict.candidates.map((c) => (
                      <label key={c.label} className="paste-grades-radio">
                        <input
                          type="radio"
                          name="lv2-choice"
                          checked={lv2Choice === c.label}
                          onChange={() => setLv2Choice(c.label)}
                        />
                        {c.label} ({formatNote(c.value)})
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {result.ignoredLines.length > 0 && (
              <div className="paste-grades-ignored">
                <button
                  type="button"
                  className="paste-grades-ignored-toggle"
                  onClick={() => setShowIgnored((v) => !v)}
                  aria-expanded={showIgnored}
                >
                  {showIgnored ? '▾' : '▸'} {result.ignoredLines.length} ligne
                  {result.ignoredLines.length > 1 ? 's' : ''} ignorée
                  {result.ignoredLines.length > 1 ? 's' : ''}
                </button>
                {showIgnored && (
                  <ul className="paste-grades-ignored-list">
                    {result.ignoredLines.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="paste-grades-actions">
              <button
                type="button"
                className="paste-grades-btn-secondary"
                onClick={() => setResult(null)}
              >
                Retour
              </button>
              <button
                type="button"
                className="paste-grades-btn-primary"
                onClick={handleApply}
                disabled={Object.keys(toApply).length === 0}
              >
                Appliquer{' '}
                {Object.keys(toApply).length > 0 && `(${Object.keys(toApply).length})`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PasteGradesModal;
