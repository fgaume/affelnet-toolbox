import React, { useState, useCallback } from "react";
import type { UserScore, DisciplinaryField, AcademicStats } from "../types";
import { DISCIPLINARY_FIELDS } from "../types";
import { calculateFinalScores, GEO_BONUS, FIELD_WEIGHTS } from "../services/scoreCalculation";
import { STATS_MODEL_LABELS } from "../services/scoreApi";
import type { CustomStatsModel } from "../services/customModelsStorage";
import { ScoreGauge } from "./ScoreGauge";
import type { LyceeSeuil } from "./ScoreGauge";
import { CustomModelEditor } from "./CustomModelEditor";
import "./ScoreDisplay.css";

interface ScoreDisplayProps {
  score: UserScore | null;
  ipsBonus: number;
  collegeName?: string;
  multiplier: number;
  onMultiplierChange: (delta: number) => void;
  statsKey: string | null;
  availableStatsKeys: string[];
  onStatsKeyChange: (key: string) => void;
  sector1Lycees?: LyceeSeuil[];
  allSeuilsRange?: { min: number; max: number };
  customModels: CustomStatsModel[];
  onCreateCustomModel: (baseKey: string) => void;
  onUpdateCustomModel: (id: string, stats: Record<DisciplinaryField, AcademicStats>) => void;
  onDeleteCustomModel: (id: string) => void;
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
  multiplier,
  onMultiplierChange,
  statsKey,
  availableStatsKeys,
  onStatsKeyChange,
  sector1Lycees,
  allSeuilsRange,
  customModels,
  onCreateCustomModel,
  onUpdateCustomModel,
  onDeleteCustomModel,
}) => {
  const [baseKey, setBaseKey] = useState(availableStatsKeys[0] ?? '');

  const handleCreate = useCallback(() => {
    if (baseKey) onCreateCustomModel(baseKey);
  }, [baseKey, onCreateCustomModel]);

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
  const activeCustomModel = customModels.find(m => `custom:${m.id}` === statsKey);

  return (
    <div className="score-display">
      <h2>Simuler votre barème</h2>

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
                  <td className="numeric">{detail.rawAverage.toFixed(2)}</td>
                  <td className="numeric"><span className="weight-prefix">{FIELD_WEIGHTS[field]}x</span> {harmonizedValue.toFixed(3)}</td>
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

      <div className="score-summary-breakdown" style={{ marginTop: '1rem' }}>
        <div className="summary-item summary-item-emphasis">
          <span className="multiplier-label">
            Coefficient de pondération
            <span className="multiplier-controls">
              <button
                className="multiplier-btn"
                onClick={() => onMultiplierChange(-0.1)}
                aria-label="Diminuer"
              >
                −
              </button>
              <span className="multiplier-value">×{multiplier.toFixed(1)}</span>
              <button
                className="multiplier-btn"
                onClick={() => onMultiplierChange(0.1)}
                aria-label="Augmenter"
              >
                +
              </button>
            </span>
          </span>
          <span className="summary-value">
            {Math.round(score.totalScore).toLocaleString()}
          </span>
        </div>
      </div>

      {(availableStatsKeys.length > 1 || customModels.length > 0) && statsKey && (
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
            {customModels.map((m) => (
              <button
                key={m.id}
                className={`stats-year-btn${statsKey === `custom:${m.id}` ? " active" : ""}`}
                onClick={() => onStatsKeyChange(`custom:${m.id}`)}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="custom-model-create">
        <span className="custom-model-create-label">Créer un modèle perso à partir de :</span>
        <div className="custom-model-create-controls">
          <select
            className="custom-model-base-select"
            value={baseKey}
            onChange={e => setBaseKey(e.target.value)}
          >
            {availableStatsKeys.map(key => (
              <option key={key} value={key}>{STATS_MODEL_LABELS[key] ?? key}</option>
            ))}
          </select>
          <button className="custom-model-create-btn" onClick={handleCreate}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            Créer
          </button>
        </div>
      </div>

      {activeCustomModel && (
        <CustomModelEditor
          model={activeCustomModel}
          onUpdate={onUpdateCustomModel}
          onDelete={onDeleteCustomModel}
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
