import React, { useState } from "react";
import type { UserScore, DisciplinaryField } from "../types";
import {
  calculateFinalScores,
  GEO_BONUS,
  BOURSIER_BONUS,
  WEIGHTING_COEFFICIENT,
} from "../services/scoreCalculation";
import { STATS_MODEL_LABELS } from "../services/scoreApi";
import { ScoreGauge } from "./ScoreGauge";
import type { LyceeSeuil } from "./ScoreGauge";
import "./ScoreDisplay.css";

const FIELD_NAMES: Record<DisciplinaryField, string> = {
  FRANCAIS: "Français",
  MATHEMATIQUES: "Mathématiques",
  HISTOIRE_GEO: "Histoire-Géo / EMC",
  LANGUES_VIVANTES: "Langues Vivantes",
  SCIENCES_TECHNO_DP: "Sciences & Technologie",
  ARTS: "Arts",
  EPS: "EPS",
};

interface ScoreDisplayProps {
  score: UserScore | null;
  ipsBonus: number;
  collegeName?: string;
  statsKey: string | null;
  availableStatsKeys: string[];
  sector1Lycees?: LyceeSeuil[];
  allSeuilsRange?: { min: number; max: number };
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  score,
  ipsBonus,
  collegeName,
  statsKey,
  availableStatsKeys,
  sector1Lycees,
  allSeuilsRange,
}) => {
  const [isBoursier, setIsBoursier] = useState(false);

  if (!score) {
    return (
      <div className="score-display">
        <div className="score-placeholder">
          Saisissez vos notes pour calculer votre score
        </div>
      </div>
    );
  }

  const boursierBonus = isBoursier ? BOURSIER_BONUS : 0;
  const finalScores = calculateFinalScores(
    score.totalScore,
    ipsBonus,
    boursierBonus,
  );

  // Barèmes affichés à 6 décimales (le modèle σ/μ* à 8 décimales reproduit
  // les fiches barèmes à ~1e-7 pt près : 6 décimales sont significatives).
  const fmt6 = (n: number) =>
    n.toLocaleString(undefined, {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6,
    });

  // Format lisible à 2 décimales pour le détail par discipline.
  const fmt2 = (n: number) =>
    n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Format arrondi (labels du graphique de contributions).
  const fmt0 = (n: number) => Math.round(n).toLocaleString();

  // Indicateur du millésime de statistiques d'harmonisation utilisé.
  const currentYear = new Date().getFullYear();
  const activeLabel = statsKey ? STATS_MODEL_LABELS[statsKey] ?? statsKey : null;
  const activeIsYear = statsKey !== null && /^\d{4}$/.test(statsKey);
  const currentYearAvailable = availableStatsKeys.includes(String(currentYear));
  const isFallbackYear =
    activeIsYear && Number(statsKey) < currentYear && !currentYearAvailable;

  return (
    <div className="score-display">
      <h2>Barème selon le secteur</h2>

      <label className="boursier-toggle">
        <input
          type="checkbox"
          checked={isBoursier}
          onChange={(e) => setIsBoursier(e.target.checked)}
        />
        <span>Je suis boursier (bonus {BOURSIER_BONUS})</span>
      </label>

      <div className="final-scores-grid">
        <div className="final-score-card secteur-1">
          <div className="score-label">Secteur 1</div>
          <div className="score-value">{fmt6(finalScores.secteur1)}</div>
        </div>
        <div className="final-score-card secteur-2">
          <div className="score-label">Secteur 2</div>
          <div className="score-value">{fmt6(finalScores.secteur2)}</div>
        </div>
        <div className="final-score-card secteur-3">
          <div className="score-label">Secteur 3</div>
          <div className="score-value">{fmt6(finalScores.secteur3)}</div>
        </div>
      </div>

      <div className="score-summary-breakdown">
        <div className="summary-item">
          <span className="summary-label-with-badge">
            Barème scolaire total
            {activeLabel && (
              <span
                className={`stats-source-badge${isFallbackYear ? " is-fallback" : ""}`}
                title="Statistiques d'harmonisation utilisées pour ce calcul"
              >
                <span className="stats-source-badge-dot" aria-hidden="true" />
                {activeIsYear ? `stats ${activeLabel}` : `modèle ${activeLabel}`}
              </span>
            )}
          </span>
          <span className="summary-value">{fmt6(score.totalScore)}</span>
        </div>
        {isFallbackYear && (
          <p className="stats-fallback-note">
            Harmonisation basée sur le millésime {statsKey} : les statistiques{" "}
            {currentYear} ne sont pas encore disponibles.
          </p>
        )}
        <div className="summary-item">
          <span>
            Bonus IPS {collegeName ? collegeName : "(collège de scolarisation)"}
          </span>
          <span className="summary-value">{ipsBonus}</span>
        </div>
        {isBoursier && (
          <div className="summary-item">
            <span>Bonus boursier</span>
            <span className="summary-value">{BOURSIER_BONUS}</span>
          </div>
        )}
        <div className="summary-item">
          <span>Bonus géographique Secteur 1</span>
          <span className="summary-value">
            {GEO_BONUS.SECTEUR_1.toLocaleString()}
          </span>
        </div>
        <div className="summary-item">
          <span>Bonus géographique Secteur 2</span>
          <span className="summary-value">
            {GEO_BONUS.SECTEUR_2.toLocaleString()}
          </span>
        </div>
        <div className="summary-item">
          <span>Bonus géographique Secteur 3</span>
          <span className="summary-value">
            {GEO_BONUS.SECTEUR_3.toLocaleString()}
          </span>
        </div>
      </div>

      {sector1Lycees && sector1Lycees.length > 0 && allSeuilsRange && (
        <ScoreGauge
          sector1Score={Math.round(finalScores.secteur1)}
          lycees={sector1Lycees}
          axisMin={allSeuilsRange.min}
          axisMax={allSeuilsRange.max}
        />
      )}

      {score.linearModel && score.linearModel.terms.length > 0 && (
        <div className="score-breakdown">
          <h3>Détail du calcul</h3>
          <p className="harmonisation-explanation">
            Le barème scolaire est une fonction affine de vos moyennes : un
            barème de base, auquel s'ajoute pour chaque discipline sa moyenne
            multipliée par un coefficient propre. Ce coefficient vaut 25 × (poids
            de la discipline) ÷ (écart-type académique) — plus une matière est
            discriminante dans l'académie, plus elle pèse. La constante et les
            coefficients intègrent déjà l'harmonisation académique et la
            pondération scolaire (× {WEIGHTING_COEFFICIENT.toLocaleString()}).
          </p>
          <table className="score-table">
            <thead>
              <tr>
                <th scope="col">Discipline</th>
                <th scope="col" className="numeric">
                  Moyenne
                </th>
                <th scope="col" className="numeric">
                  Coefficient
                </th>
                <th scope="col" className="numeric">
                  Contribution
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Barème de base</td>
                <td className="numeric">—</td>
                <td className="numeric">—</td>
                <td className="numeric">{fmt6(score.linearModel.intercept)}</td>
              </tr>
              {score.linearModel.terms.map((term) => (
                <tr key={term.field}>
                  <td>{FIELD_NAMES[term.field]}</td>
                  <td className="numeric">{fmt2(term.rawAverage)}</td>
                  <td className="numeric">{fmt6(term.slope)}</td>
                  <td className="numeric">{fmt6(term.contribution)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="score-total-row">
                <td colSpan={3}>Barème scolaire total</td>
                <td className="numeric">{fmt6(score.totalScore)}</td>
              </tr>
            </tfoot>
          </table>

          {(() => {
            const terms = [...score.linearModel.terms].sort(
              (a, b) => b.contribution - a.contribution,
            );
            const maxContribution = Math.max(...terms.map((t) => t.contribution));
            return (
              <figure className="contribution-chart">
                <figcaption className="contribution-chart-title">
                  Poids de chaque discipline dans le barème
                </figcaption>
                <ul className="contribution-bars">
                  {terms.map((term) => {
                    const pctOfTotal = (term.contribution / score.totalScore) * 100;
                    const barWidth = (term.contribution / maxContribution) * 100;
                    return (
                      <li key={term.field} className="contribution-row">
                        <span className="contribution-label">
                          {FIELD_NAMES[term.field]}
                        </span>
                        <span
                          className="contribution-track"
                          title={`${FIELD_NAMES[term.field]} : ${fmt6(term.contribution)} pts (${pctOfTotal.toFixed(1)} % du barème)`}
                        >
                          <span
                            className="contribution-fill"
                            style={{ width: `${barWidth}%` }}
                          />
                        </span>
                        <span className="contribution-value">
                          {fmt0(term.contribution)}
                          <span className="contribution-pct">
                            {" "}
                            · {pctOfTotal.toFixed(1)} %
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="contribution-caption">
                  Le reste du barème provient du barème de base (
                  {fmt0(score.linearModel.intercept)} pts), indépendant des notes.
                </p>
              </figure>
            );
          })()}
        </div>
      )}

      <div className="score-info">
        <strong>Information sur le calcul :</strong>
        <br />
        Le score total est composé de trois éléments : le score scolaire
        harmonisé, le bonus IPS de votre collège de scolarisation, et le bonus
        lié au secteur géographique du lycée demandé.
      </div>
    </div>
  );
};

export default ScoreDisplay;
