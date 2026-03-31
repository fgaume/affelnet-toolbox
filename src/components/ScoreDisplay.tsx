import React from 'react';
import type { UserScore, DisciplinaryField } from '../types';
import { DISCIPLINARY_FIELDS } from '../types';
import { calculateFinalScores, GEO_BONUS } from '../services/scoreCalculation';
import { ALT_MODEL_KEY, ALT_MODEL_LABEL } from '../services/scoreApi';
import { AdmissionGauge } from './';
import './ScoreDisplay.css';

interface ScoreDisplayProps {
  score: UserScore | null;
  ipsBonus: number;
  collegeUai?: string;
  collegeName?: string;
  multiplier: number;
  onMultiplierChange: (delta: number) => void;
  statsYear: number | null;
  availableStatsYears: number[];
  onStatsYearChange: (year: number) => void;
}

const FIELD_NAMES: Record<DisciplinaryField, string> = {
  FRANCAIS: 'Français',
  MATHEMATIQUES: 'Mathématiques',
  HISTOIRE_GEO: 'Histoire-Géo / EMC',
  LANGUES_VIVANTES: 'Langues Vivantes',
  SCIENCES_TECHNO_DP: 'Sciences & Technologie',
  ARTS: 'Arts',
  EPS: 'EPS',
};

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score, ipsBonus, collegeUai, collegeName, multiplier, onMultiplierChange, statsYear, availableStatsYears, onStatsYearChange }) => {
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
      <h2>Votre Score Affelnet</h2>
      
      <div className="final-scores-grid">
        <div className="final-score-card secteur-1">
          <div className="score-label">Secteur 1</div>
          <div className="score-value">{Math.round(finalScores.secteur1).toLocaleString()}</div>
        </div>
        <div className="final-score-card secteur-2">
          <div className="score-label">Secteur 2</div>
          <div className="score-value">{Math.round(finalScores.secteur2).toLocaleString()}</div>
        </div>
        <div className="final-score-card secteur-3">
          <div className="score-label">Secteur 3</div>
          <div className="score-value">{Math.round(finalScores.secteur3).toLocaleString()}</div>
        </div>
      </div>

      <div className="score-summary-breakdown">
        <div className="summary-item">
          <span>Total champs disciplinaires</span>
          <span className="summary-value">{Math.round(score.weightedSum).toLocaleString()}</span>
        </div>
        <div className="summary-item">
          <span className="multiplier-label">
            Coefficient de pondération
            <span className="multiplier-controls">
              <button className="multiplier-btn" onClick={() => onMultiplierChange(-0.1)} aria-label="Diminuer">−</button>
              <span className="multiplier-value">×{multiplier.toFixed(1)}</span>
              <button className="multiplier-btn" onClick={() => onMultiplierChange(0.1)} aria-label="Augmenter">+</button>
            </span>
          </span>
          <span className="summary-value">{Math.round(score.totalScore).toLocaleString()}</span>
        </div>
        <div className="summary-item">
          <span>Bonus IPS {collegeName ? collegeName : '(collège de scolarisation)'}</span>
          <span className="summary-value">{ipsBonus}</span>
        </div>
        <div className="summary-item">
          <span>Bonus géographique Secteur 1</span>
          <span className="summary-value">{GEO_BONUS.SECTEUR_1.toLocaleString()}</span>
        </div>
      </div>

      <AdmissionGauge userScore={finalScores.secteur1} collegeUai={collegeUai} />

      <div className="score-breakdown">
        <h3>Détails par champ disciplinaire</h3>
        <table className="score-table">
          <thead>
            <tr>
              <th scope="col">Champ</th>
              <th scope="col" className="numeric">Brut</th>
              <th scope="col" className="numeric">Harmonisé</th>
            </tr>
          </thead>
          <tbody>
            {DISCIPLINARY_FIELDS.map((field) => {
              const detail = score.details[field];
              const harmonizedValue = detail.harmonizedNote;

              return (
                <tr key={field}>
                  <td>{FIELD_NAMES[field]}</td>
                  <td className="numeric">{detail.rawAverage.toFixed(2)}</td>
                  <td className="numeric">{harmonizedValue.toFixed(3)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="score-total-row">
              <td>Total</td>
              <td className="numeric"></td>
              <td className="numeric">{Math.round(score.weightedSum).toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {availableStatsYears.length > 1 && statsYear && (
        <div className="stats-year-selector">
          <span className="stats-year-label">Statistiques d'harmonisation :</span>
          <div className="stats-year-buttons">
            {availableStatsYears.map((year) => (
              <button
                key={year}
                className={`stats-year-btn${statsYear === year ? ' active' : ''}`}
                onClick={() => onStatsYearChange(year)}
              >
                {year === ALT_MODEL_KEY ? ALT_MODEL_LABEL : year}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="score-info">
        <strong>Information sur le calcul :</strong><br />
        Le score total est composé de trois éléments : le score scolaire harmonisé, le bonus IPS de votre collège de scolarisation, et le bonus lié au secteur géographique du lycée demandé.
      </div>
    </div>
  );
};

export default ScoreDisplay;
