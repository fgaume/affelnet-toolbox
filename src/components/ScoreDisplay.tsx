import React from "react";
import type { UserScore, DisciplinaryField } from "../types";
import { DISCIPLINARY_FIELDS } from "../types";
import {
  calculateFinalScores,
  GEO_BONUS,
  FIELD_WEIGHTS,
  WEIGHTING_COEFFICIENT,
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

const FIELD_NAMES: Record<DisciplinaryField, string> = {
  FRANCAIS: "Français",
  MATHEMATIQUES: "Mathématiques",
  HISTOIRE_GEO: "Histoire-Géo / EMC",
  LANGUES_VIVANTES: "Langues Vivantes",
  SCIENCES_TECHNO_DP: "Sciences & Technologie",
  ARTS: "Arts",
  EPS: "EPS",
};

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

      <div className="score-breakdown">
        <h3>Détails par champ disciplinaire</h3>
        <p className="harmonisation-explanation">
          La note harmonisée replace chaque moyenne dans le contexte académique
          : elle mesure l'écart à la moyenne de l'académie, rapporté à la
          dispersion des résultats. Concrètement, on prend la note brute, on lui
          soustrait la moyenne académique, puis on divise par l'écart-type. On y
          ajoute 10 puis on multiplie le tout par 10 pour obtenir une note
          harmonisée autour de 100. Les moyennes académiques et les écarts-types
          utilisés pour cette harmonisation sont fournis pas les modèles tout en
          bas.
        </p>
        <table className="score-table">
          <thead>
            <tr>
              <th scope="col">Champ</th>
              <th scope="col" className="numeric">
                Brut
              </th>
              <th scope="col" className="numeric">
                Harmonisé
              </th>
            </tr>
          </thead>
          <tbody>
            {DISCIPLINARY_FIELDS.map((field) => {
              const detail = score.details[field];
              const harmonizedValue = detail.harmonizedNote;

              return (
                <tr key={field}>
                  <td>{FIELD_NAMES[field]}</td>
                  <td className="numeric">{detail.rawAverage.toFixed(9)}</td>
                  <td className="numeric">
                    <span className="weight-prefix">
                      {FIELD_WEIGHTS[field]}x
                    </span>{" "}
                    {harmonizedValue.toFixed(9)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="score-total-row">
              <td>Total pondéré</td>
              <td className="numeric"></td>
              <td className="numeric">
                {Math.round(score.weightedSum).toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="score-summary-breakdown" style={{ marginTop: "1rem" }}>
        <div className="summary-item summary-item-emphasis">
          <span className="multiplier-label">
            Coefficient de pondération
            <span className="multiplier-value">×{WEIGHTING_COEFFICIENT.toFixed(1)}</span>
          </span>
          <span className="summary-value">
            {Math.round(score.totalScore).toLocaleString()}
          </span>
        </div>
      </div>

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
