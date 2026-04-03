import { useState, useCallback } from 'react';
import type { AcademicStats, DisciplinaryField } from '../types';
import { DISCIPLINARY_FIELDS } from '../types';
import type { CustomStatsModel } from '../services/customModelsStorage';
import './CustomModelEditor.css';

const FIELD_NAMES: Record<DisciplinaryField, string> = {
  FRANCAIS: 'Français',
  MATHEMATIQUES: 'Mathématiques',
  HISTOIRE_GEO: 'Histoire-Géo',
  LANGUES_VIVANTES: 'Langues Vivantes',
  SCIENCES_TECHNO_DP: 'Sciences & Techno',
  ARTS: 'Arts',
  EPS: 'EPS',
};

interface CustomModelEditorProps {
  model: CustomStatsModel;
  onUpdate: (id: string, stats: Record<DisciplinaryField, AcademicStats>) => void;
  onDelete: (id: string) => void;
}

export function CustomModelEditor({ model, onUpdate, onDelete }: CustomModelEditorProps) {
  const [editingStats, setEditingStats] = useState<Record<DisciplinaryField, AcademicStats>>(
    () => structuredClone(model.stats) as Record<DisciplinaryField, AcademicStats>
  );

  const handleChange = useCallback((field: DisciplinaryField, prop: 'moyenne' | 'ecartType', value: string) => {
    const num = parseFloat(value);
    if (value !== '' && isNaN(num)) return;
    const rounded = value === '' ? 0 : Math.round(num * 10) / 10;

    const updated = {
      ...editingStats,
      [field]: {
        ...editingStats[field],
        [prop]: rounded,
      },
    };
    setEditingStats(updated);
    onUpdate(model.id, updated);
  }, [editingStats, model.id, onUpdate]);

  return (
    <div className="custom-model-editor">
      <div className="custom-model-header">
        <span className="custom-model-name">{model.name}</span>
        <button
          className="custom-model-delete"
          onClick={() => onDelete(model.id)}
          aria-label="Supprimer ce modèle"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <table className="custom-model-table">
        <thead>
          <tr>
            <th>Champ</th>
            <th className="numeric">Moyenne</th>
            <th className="numeric">Ecart-type</th>
          </tr>
        </thead>
        <tbody>
          {DISCIPLINARY_FIELDS.map(field => (
            <tr key={field}>
              <td>{FIELD_NAMES[field]}</td>
              <td className="numeric">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="20"
                  value={editingStats[field].moyenne}
                  onChange={e => handleChange(field, 'moyenne', e.target.value)}
                  className="custom-model-input"
                />
              </td>
              <td className="numeric">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="20"
                  value={editingStats[field].ecartType}
                  onChange={e => handleChange(field, 'ecartType', e.target.value)}
                  className="custom-model-input"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
