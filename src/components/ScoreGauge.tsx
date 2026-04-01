import type { AdmissionDifficulty } from '../services/seuilsApi';
import './ScoreGauge.css';

export interface LyceeSeuil {
  uai: string;
  nom: string;
  seuil: number;
  difficulty: AdmissionDifficulty;
}

interface ScoreGaugeProps {
  sector1Score: number | null;
  lycees: LyceeSeuil[];
  axisMin: number;
  axisMax: number;
}

function scoreToPercent(score: number, min: number, max: number): number {
  return Math.max(0, Math.min(100, ((score - min) / (max - min)) * 100));
}

/** Difficulty thresholds mapped to gradient color stops */
const DIFFICULTY_STOPS = [
  { threshold: 38000, color: '#2563eb' },
  { threshold: 40250, color: '#f97316' },
  { threshold: 40600, color: '#dc2626' },
  { threshold: 40731, color: '#1a1a1a' },
];

function buildGradient(min: number, max: number): string {
  const stops: string[] = ['#2563eb 0%'];
  for (const { threshold, color } of DIFFICULTY_STOPS) {
    const pct = scoreToPercent(threshold, min, max);
    if (pct > 0 && pct < 100) {
      stops.push(`${color} ${pct.toFixed(1)}%`);
    }
  }
  stops.push('#1a1a1a 100%');
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

/** For labels: use a theme-aware color for 'extreme' level (black invisible in dark mode) */
function labelColor(difficulty: AdmissionDifficulty): string {
  return difficulty.level === 'extreme' ? 'var(--color-text-primary)' : difficulty.color;
}

function AdmissionIcon({ admitted }: { admitted: boolean }) {
  if (admitted) {
    return (
      <svg className="score-gauge-icon score-gauge-icon--success" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" fill="#16a34a" />
        <path d="M4.5 8.5L7 11L11.5 5.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg className="score-gauge-icon score-gauge-icon--failure" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" fill="#dc2626" />
      <path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ScoreGauge({ sector1Score, lycees, axisMin, axisMax }: ScoreGaugeProps) {
  const onGauge = lycees.filter(l => l.difficulty.level !== 'very-easy');
  const veryEasy = lycees.filter(l => l.difficulty.level === 'very-easy');

  // Sort by seuil for consistent alternating placement
  const sorted = [...onGauge].sort((a, b) => a.seuil - b.seuil);
  const above = sorted.filter((_, i) => i % 2 === 0);
  const below = sorted.filter((_, i) => i % 2 === 1);

  if (onGauge.length === 0 && veryEasy.length > 0) {
    return (
      <div className="score-gauge">
        <p className="score-gauge-title">Positionnement de votre score secteur 1</p>
        <div className="score-gauge-easy-only">
          Tous vos lycées de secteur 1 sont très facilement accessibles !
        </div>
        <div className="score-gauge-easy-list">
          <ul>
            {veryEasy.map(l => (
              <li key={l.uai} style={{ color: labelColor(l.difficulty) }}>
                {sector1Score != null && <AdmissionIcon admitted={sector1Score >= l.seuil} />}
                {l.nom} <span className="score-gauge-seuil-value">(seuil : {l.seuil.toLocaleString()})</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (onGauge.length === 0) return null;

  const gradient = buildGradient(axisMin, axisMax);
  const userPct = sector1Score != null ? scoreToPercent(sector1Score, axisMin, axisMax) : null;

  return (
    <div className="score-gauge">
      <p className="score-gauge-title">Positionnement de votre score secteur 1 vs seuils d'admission</p>

      <div className="score-gauge-inner">
        {/* Labels above the bar */}
        <div className="score-gauge-labels score-gauge-labels--above">
          {above.map(l => {
            const pct = scoreToPercent(l.seuil, axisMin, axisMax);
            const admitted = sector1Score != null && sector1Score >= l.seuil;
            return (
              <div
                key={l.uai}
                className="score-gauge-label"
                style={{ left: `${pct}%` }}
              >
                <span className="score-gauge-label-name" style={{ color: labelColor(l.difficulty) }}>
                  {sector1Score != null && <AdmissionIcon admitted={admitted} />}
                  {l.nom}
                </span>
                <span className="score-gauge-label-value" style={{ color: labelColor(l.difficulty) }}>
                  {l.seuil.toLocaleString()}
                </span>
                <span className="score-gauge-label-line" style={{ backgroundColor: labelColor(l.difficulty) }} />
              </div>
            );
          })}
        </div>

        {/* Gauge bar */}
        <div className="score-gauge-bar-container">
          <div className="score-gauge-bar" style={{ background: gradient }} />

          {/* User score marker */}
          {userPct != null && (
            <div className="score-gauge-user-marker" style={{ left: `${userPct}%` }}>
              <div className="score-gauge-user-triangle" />
              <div className="score-gauge-user-line" />
              <div className="score-gauge-user-value">
                {Math.round(sector1Score!).toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Labels below the bar */}
        <div className="score-gauge-labels score-gauge-labels--below">
          {below.map(l => {
            const pct = scoreToPercent(l.seuil, axisMin, axisMax);
            const admitted = sector1Score != null && sector1Score >= l.seuil;
            return (
              <div
                key={l.uai}
                className="score-gauge-label"
                style={{ left: `${pct}%` }}
              >
                <span className="score-gauge-label-line" style={{ backgroundColor: labelColor(l.difficulty) }} />
                <span className="score-gauge-label-value" style={{ color: labelColor(l.difficulty) }}>
                  {l.seuil.toLocaleString()}
                </span>
                <span className="score-gauge-label-name" style={{ color: labelColor(l.difficulty) }}>
                  {sector1Score != null && <AdmissionIcon admitted={admitted} />}
                  {l.nom}
                </span>
              </div>
            );
          })}
        </div>

        {/* Axis min/max labels */}
        <div className="score-gauge-axis-labels">
          <span>{axisMin.toLocaleString()}</span>
          <span>{axisMax.toLocaleString()}</span>
        </div>
      </div>

      {/* Very easy lycees list */}
      {veryEasy.length > 0 && (
        <div className="score-gauge-easy-list">
          <p className="score-gauge-easy-title">Lycées très facilement accessibles (hors échelle) :</p>
          <ul>
            {veryEasy.map(l => (
              <li key={l.uai} style={{ color: labelColor(l.difficulty) }}>
                {sector1Score != null && <AdmissionIcon admitted={sector1Score >= l.seuil} />}
                {l.nom} <span className="score-gauge-seuil-value">(seuil : {l.seuil.toLocaleString()})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
