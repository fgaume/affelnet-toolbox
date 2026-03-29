import React from 'react';
import type { UserScore, DisciplinaryField } from '../types';
import { DISCIPLINARY_FIELDS } from '../types';
import { calculateFinalScores, GEO_BONUS } from '../services/scoreCalculation';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import './ScoreDisplay.css';

interface ScoreDisplayProps {
  score: UserScore | null;
  ipsBonus: number;
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

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score, ipsBonus }) => {
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
          <span>Score scolaire</span>
          <span className="summary-value">{Math.round(score.totalScore).toLocaleString()}</span>
        </div>
        <div className="summary-item">
          <span>Bonus IPS (collège de scolarisation)</span>
          <span className="summary-value">{ipsBonus}</span>
        </div>
        <div className="summary-item">
          <span>Bonus géographique</span>
          <div className="geo-bonuses">
            <div>Secteur 1: {GEO_BONUS.SECTEUR_1}</div>
            <div>Secteur 2: {GEO_BONUS.SECTEUR_2}</div>
            <div>Secteur 3: {GEO_BONUS.SECTEUR_3}</div>
          </div>
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
        </table>
      </div>

      <div className="score-info">
        <strong>Information sur le calcul :</strong><br />
        Le score total est composé de trois éléments : le score scolaire harmonisé, le bonus IPS de votre collège de scolarisation, et le bonus lié au secteur géographique du lycée demandé.
      </div>
    </div>
  );
};

export default ScoreDisplay;
