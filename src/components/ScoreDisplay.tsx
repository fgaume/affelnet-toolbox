import React, { useState } from "react";
import type { UserScore } from "../types";
import {
  calculateFinalScores,
  GEO_BONUS,
  BOURSIER_BONUS,
} from "../services/scoreCalculation";
import { STATS_MODEL_LABELS } from "../services/scoreApi";
import { ScoreGauge } from "./ScoreGauge";
import type { LyceeSeuil } from "./ScoreGauge";
import "./ScoreDisplay.css";

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
          <span className="summary-value">
            {fmt6(score.totalScore)}
          </span>
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
