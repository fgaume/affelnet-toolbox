import React from 'react';
import type { UserScore, DisciplinaryField } from '../types';
import { DISCIPLINARY_FIELDS } from '../types';
import { calculateFinalScores, GEO_BONUS } from '../services/scoreCalculation';
import { ALT_MODEL_KEY, ALT_MODEL_LABEL } from '../services/scoreApi';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import './ScoreDisplay.css';

interface ScoreDisplayProps {
  score: UserScore | null;
  ipsBonus: number;
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

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score, ipsBonus, collegeName, multiplier, onMultiplierChange, statsYear, availableStatsYears, onStatsYearChange }) => {
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

  const breakdownData = DISCIPLINARY_FIELDS.map(field => ({
    name: FIELD_NAMES[field],
    value: score.details[field].contribution * 2,
  })).sort((a, b) => b.value - a.value);

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
        <div className="summary-item">
          <span>Bonus géographique Secteur 2</span>
          <span className="summary-value">{GEO_BONUS.SECTEUR_2.toLocaleString()}</span>
        </div>
        <div className="summary-item">
          <span>Bonus géographique Secteur 3</span>
          <span className="summary-value">{GEO_BONUS.SECTEUR_3.toLocaleString()}</span>
        </div>
      </div>

      <div className="score-chart-container" role="img" aria-label="Graphique des points par champ disciplinaire">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={breakdownData} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
            <XAxis type="number" hide domain={[0, 'dataMax']} />
            <YAxis dataKey="name" type="category" width={150} fontSize={12} tick={{ fill: 'currentColor' }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="var(--color-primary)" barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>

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
