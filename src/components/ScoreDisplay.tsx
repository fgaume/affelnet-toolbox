import React from "react";
import type { UserScore } from "../types";
import {
  calculateFinalScores,
  GEO_BONUS,
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
  onStatsKeyChange: (key: string) => void;
  sector1Lycees?: LyceeSeuil[];
  allSeuilsRange?: { min: number; max: number };
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  score,
  ipsBonus,
  collegeName,
  statsKey,
  availableStatsKeys,
  onStatsKeyChange,
  sector1Lycees,
  allSeuilsRange,
}) => {
  if (!score) {
    return (
      <div className="score-display">
        <div className="score-placeholder">
          Saisissez vos notes pour calculer votre score
        </div>
      </div>
    );
  }

  const finalScores = calculateFinalScores(score.totalScore, ipsBonus);

  return (
    <div className="score-display">
      <h2>Barème selon le secteur</h2>

      <div className="final-scores-grid">
        <div className="final-score-card secteur-1">
          <div className="score-label">Secteur 1</div>
          <div className="score-value">
            {Math.round(finalScores.secteur1).toLocaleString()}
          </div>
        </div>
        <div className="final-score-card secteur-2">
          <div className="score-label">Secteur 2</div>
          <div className="score-value">
            {Math.round(finalScores.secteur2).toLocaleString()}
          </div>
        </div>
        <div className="final-score-card secteur-3">
          <div className="score-label">Secteur 3</div>
          <div className="score-value">
            {Math.round(finalScores.secteur3).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="score-summary-breakdown">
        <div className="summary-item">
          <span>Barème scolaire total</span>
          <span className="summary-value">
            {Math.round(score.totalScore).toLocaleString()}
          </span>
        </div>
        <div className="summary-item">
          <span>
            Bonus IPS {collegeName ? collegeName : "(collège de scolarisation)"}
          </span>
          <span className="summary-value">{ipsBonus}</span>
        </div>
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

      {availableStatsKeys.length > 1 && statsKey && (
        <div className="stats-year-selector">
          <span className="stats-year-label">
            Statistiques d'harmonisation :
          </span>
          <div className="stats-year-buttons">
            {availableStatsKeys.map((key) => (
              <button
                key={key}
                className={`stats-year-btn${statsKey === key ? " active" : ""}`}
                onClick={() => onStatsKeyChange(key)}
              >
                {STATS_MODEL_LABELS[key] ?? key}
              </button>
            ))}
          </div>
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
