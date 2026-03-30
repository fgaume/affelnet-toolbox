import React, { useState, useEffect } from 'react';
import type { Subject, DisciplinaryField, UserGrades } from '../types';
import { DISCIPLINARY_FIELDS } from '../types';
import { getUserGrades, saveUserGrades, clearScoreData } from '../services/storage';
import './GradeInputForm.css';

const FIELD_MAPPING: Record<DisciplinaryField, Subject[]> = {
  FRANCAIS: ['FRANCAIS'],
  MATHEMATIQUES: ['MATHEMATIQUES'],
  HISTOIRE_GEO: ['HISTOIRE_GEO', 'EMC'],
  LANGUES_VIVANTES: ['LV1', 'LV2'],
  SCIENCES_TECHNO_DP: ['SVT', 'TECHNOLOGIE', 'PHYSIQUE_CHIMIE'],
  ARTS: ['ARTS_PLASTIQUES', 'EDUCATION_MUSICALE'],
  EPS: ['EPS'],
};

const SUBJECT_LABELS: Record<Subject, string> = {
  FRANCAIS: 'Français',
  MATHEMATIQUES: 'Mathématiques',
  HISTOIRE_GEO: 'Histoire-Géo',
  EMC: 'EMC',
  LV1: 'LV1',
  LV2: 'LV2',
  SVT: 'SVT',
  TECHNOLOGIE: 'Technologie',
  PHYSIQUE_CHIMIE: 'Physique-Chimie',
  ARTS_PLASTIQUES: 'Arts Plastiques',
  EDUCATION_MUSICALE: 'Éduc. Musicale',
  EPS: 'EPS',
};

const FIELD_LABELS: Record<DisciplinaryField, string> = {
  FRANCAIS: 'Français',
  MATHEMATIQUES: 'Mathématiques',
  HISTOIRE_GEO: 'Histoire-Géo & EMC',
  LANGUES_VIVANTES: 'Langues Vivantes',
  SCIENCES_TECHNO_DP: 'Sciences & Technologie',
  ARTS: 'Arts',
  EPS: 'EPS',
};

const INITIAL_GRADES: UserGrades = {
  FRANCAIS: null,
  MATHEMATIQUES: null,
  HISTOIRE_GEO: null,
  EMC: null,
  LV1: null,
  LV2: null,
  SVT: null,
  TECHNOLOGIE: null,
  PHYSIQUE_CHIMIE: null,
  ARTS_PLASTIQUES: null,
  EDUCATION_MUSICALE: null,
  EPS: null,
};

interface GradeInputFormProps {
  onGradesChange?: (grades: UserGrades) => void;
}

const NON_EPS_SUBJECTS: Subject[] = [
  'FRANCAIS', 'MATHEMATIQUES', 'HISTOIRE_GEO', 'EMC',
  'LV1', 'LV2', 'SVT', 'TECHNOLOGIE', 'PHYSIQUE_CHIMIE',
  'ARTS_PLASTIQUES', 'EDUCATION_MUSICALE',
];

function computeEpsDispenseGrade(grades: UserGrades): number | null {
  const values = NON_EPS_SUBJECTS
    .map((s) => grades[s])
    .filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

const GradeInputForm: React.FC<GradeInputFormProps> = ({ onGradesChange }) => {
  const [grades, setGrades] = useState<UserGrades>(INITIAL_GRADES);
  const [epsDispense, setEpsDispense] = useState(false);

  useEffect(() => {
    const savedGrades = getUserGrades();
    if (savedGrades) {
      setGrades(savedGrades);
      if (onGradesChange) {
        onGradesChange(savedGrades);
      }
    }
  }, [onGradesChange]);

  const applyEpsDispense = (g: UserGrades): UserGrades => {
    if (!epsDispense) return g;
    return { ...g, EPS: computeEpsDispenseGrade(g) };
  };

  const updateGrades = (newGrades: UserGrades) => {
    const final = applyEpsDispense(newGrades);
    setGrades(final);
    saveUserGrades(final);
    if (onGradesChange) onGradesChange(final);
  };

  const handleGradeChange = (subject: Subject, value: string) => {
    if (subject === 'EPS' && epsDispense) return;
    const numValue = value === '' ? null : parseFloat(value);

    // Validation: only block values outside [0, 20] if not null
    if (numValue !== null && (isNaN(numValue) || numValue < 0 || numValue > 20)) {
      return;
    }

    updateGrades({ ...grades, [subject]: numValue });
  };

  const handleEpsDispenseToggle = () => {
    const next = !epsDispense;
    setEpsDispense(next);
    if (next) {
      const epsGrade = computeEpsDispenseGrade(grades);
      const newGrades = { ...grades, EPS: epsGrade };
      setGrades(newGrades);
      saveUserGrades(newGrades);
      if (onGradesChange) onGradesChange(newGrades);
    }
  };

  const handleFillAll = () => {
    const francaisValue = grades.FRANCAIS;
    if (francaisValue === null) return;
    const newGrades = { ...grades };
    for (const key of Object.keys(newGrades) as Subject[]) {
      if (key === 'EPS' && epsDispense) continue;
      if (newGrades[key] === null) {
        newGrades[key] = francaisValue;
      }
    }
    updateGrades(newGrades);
  };

  const handleReset = () => {
    if (window.confirm('Voulez-vous vraiment réinitialiser toutes les notes ?')) {
      setGrades(INITIAL_GRADES);
      setEpsDispense(false);
      clearScoreData();
      if (onGradesChange) {
        onGradesChange(INITIAL_GRADES);
      }
    }
  };

  return (
    <div className="grade-input-form">
      <div className="grade-form-header">
        <h3>Moyennes de 3ème</h3>
      </div>

      <div className="disciplinary-fields">
        {DISCIPLINARY_FIELDS.map((field) => (
          <section key={field} className="field-section">
            <h4>{FIELD_LABELS[field]}</h4>
            <div className="subjects-grid">
              {FIELD_MAPPING[field].map((subject) => (
                <div key={subject} className="subject-input-group">
                  <label htmlFor={`grade-${subject}`}>{SUBJECT_LABELS[subject]}</label>
                  <div className="subject-input-row">
                    <input
                      id={`grade-${subject}`}
                      type="number"
                      step="0.01"
                      min="0"
                      max="20"
                      inputMode="decimal"
                      value={grades[subject] ?? ''}
                      onChange={(e) => handleGradeChange(subject, e.target.value)}
                      placeholder="--"
                      aria-label={`Moyenne annuelle de ${SUBJECT_LABELS[subject]}`}
                      readOnly={subject === 'EPS' && epsDispense}
                    />
                    {subject === 'FRANCAIS' && grades.FRANCAIS !== null && (
                      <button
                        type="button"
                        className="btn-fill-all"
                        onClick={handleFillAll}
                        title="Appliquer cette note aux matières vides"
                        aria-label="Appliquer cette note aux matières vides"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                          <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                        </svg>
                      </button>
                    )}
                    {subject === 'EPS' && (
                      <button
                        type="button"
                        className={`btn-eps-dispense${epsDispense ? ' active' : ''}`}
                        onClick={handleEpsDispenseToggle}
                        title={epsDispense ? 'Désactiver la dispense EPS' : 'Dispensé(e) de sport — note = moyenne des autres matières'}
                        aria-label="Dispense EPS"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="form-actions">
        <button type="button" className="btn-reset" onClick={handleReset}>
          Réinitialiser
        </button>
      </div>
    </div>
  );
};

export default GradeInputForm;
