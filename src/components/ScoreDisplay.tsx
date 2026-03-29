import React from 'react';
import type { UserScore, DisciplinaryField } from '../types';
import { DISCIPLINARY_FIELDS } from '../types';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import './ScoreDisplay.css';

interface ScoreDisplayProps {
  score: UserScore | null;
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

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score }) => {
  if (!score) {
    return (
      <div className="score-display">
        <div className="score-placeholder">
          Saisissez vos notes pour calculer votre score
        </div>
      </div>
    );
  }

  const breakdownData = DISCIPLINARY_FIELDS.map(field => ({
    name: FIELD_NAMES[field],
    value: score.details[field].contribution * 2,
  })).sort((a, b) => b.value - a.value);

  return (
    <div className="score-display">
      <h2>Votre Score Affelnet</h2>
      <div className="total-score-container">
        <div className="total-score-value">
          {Math.round(score.totalScore).toLocaleString()}
        </div>
        <div className="total-score-max">
          sur 38 400 points
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
              <th scope="col" className="numeric">Moyenne</th>
              <th scope="col" className="numeric">Points</th>
              <th scope="col" className="numeric">Contrib.</th>
            </tr>
          </thead>
          <tbody>
            {DISCIPLINARY_FIELDS.map((field) => {
              const detail = score.details[field];
              const points = detail.contribution * 2;
              const contributionPct = (points / score.totalScore) * 100;

              return (
                <tr key={field}>
                  <td>{FIELD_NAMES[field]}</td>
                  <td className="numeric">{detail.rawAverage.toFixed(2)}</td>
                  <td className="numeric">{Math.round(points).toLocaleString()}</td>
                  <td className="numeric">
                    {isNaN(contributionPct) ? '0%' : `${contributionPct.toFixed(1)}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="score-info">
        <strong>Information sur le calcul :</strong><br />
        Le score académique est calculé en harmonisant vos moyennes par champ disciplinaire. 
        Cette harmonisation prend en compte la moyenne et l'écart-type de l'académie de Paris pour l'année précédente.
        Chaque champ a un coefficient (5 pour le Français et les Mathématiques, 4 pour les autres) et le résultat final est multiplié par 2.
      </div>
    </div>
  );
};

export default ScoreDisplay;
