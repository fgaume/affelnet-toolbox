import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Label } from 'recharts';
import type { EffectifLycee } from '../types';
import type { AdmissionDifficulty } from '../services/seuilsApi';
import './EffectifsDonut.css';

const DEFAULT_COLOR = '#9ca3af';

interface EffectifsDonutProps {
  effectifs: EffectifLycee[];
  difficulties: Map<string, AdmissionDifficulty>;
  requestedCount?: number;
}

interface CenterLabelProps {
  viewBox?: {
    cx?: number;
    cy?: number;
    innerRadius?: number;
    outerRadius?: number;
    startAngle?: number;
    endAngle?: number;
    midAngle?: number;
    [key: string]: unknown;
  };
  total: number;
}

function CenterLabel({ viewBox, total }: CenterLabelProps) {
  const cx = viewBox?.cx ?? 0;
  const cy = viewBox?.cy ?? 0;
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" className="donut-center-total">
        {total}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="donut-center-label">
        places en 2nde
      </text>
    </g>
  );
}

interface TooltipPayloadItem {
  payload: {
    nom: string;
    effectif: number;
    pct: number;
    color: string;
    difficultyLabel?: string;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.[0]) return null;
  const { nom, effectif, pct, difficultyLabel } = payload[0].payload;
  return (
    <div style={{
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 13,
      color: 'var(--color-text-primary)',
      boxShadow: '0 2px 8px var(--color-shadow-md)',
    }}>
      <strong>{nom}</strong>
      <br />
      {effectif} places ({pct}%)
      {difficultyLabel && (
        <>
          <br />
          <span style={{ fontSize: 11, opacity: 0.8 }}>{difficultyLabel}</span>
        </>
      )}
    </div>
  );
}

/**
 * Sort entries so that slices with the same difficulty color are never adjacent.
 * Uses a greedy approach: pick the largest remaining entry whose color differs
 * from the last placed one. Falls back to any remaining entry if no different
 * color is available.
 */
function separateColors<T>(entries: T[], colorOf: (e: T) => string): T[] {
  const remaining = [...entries];
  const result: T[] = [];
  let lastColor = '';
  while (remaining.length > 0) {
    // Find best candidate: different color from last, largest effectif first
    const idx = remaining.findIndex((e) => colorOf(e) !== lastColor);
    const pick = idx >= 0 ? idx : 0;
    const item = remaining.splice(pick, 1)[0];
    result.push(item);
    lastColor = colorOf(item);
  }
  return result;
}

export function EffectifsDonut({ effectifs, difficulties, requestedCount }: EffectifsDonutProps) {
  const total = effectifs.reduce((sum, e) => sum + e.effectif, 0);
  if (total === 0) return null;

  const colorOf = (e: EffectifLycee) => difficulties.get(e.uai)?.color ?? DEFAULT_COLOR;

  // Sort by effectif desc, then separate same colors
  const sorted = [...effectifs].sort((a, b) => b.effectif - a.effectif);
  const separated = separateColors(sorted, colorOf);

  const data = separated.map((e) => ({
    ...e,
    pct: Math.round((e.effectif / total) * 100),
    color: colorOf(e),
    difficultyLabel: difficulties.get(e.uai)?.label,
  }));

  const years = [...new Set(effectifs.map((e) => e.annee))].sort();
  const yearLabel = years.length === 1
    ? `Données rentrée ${years[0]}`
    : `Données rentrées ${years[0]}-${years[years.length - 1]}`;

  return (
    <div
      className="effectifs-donut"
      role="img"
      aria-label={`Répartition des ${total} places de seconde entre ${effectifs.length} lycées de secteur 1`}
    >
      <div className="effectifs-donut-chart">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              dataKey="effectif"
              nameKey="nom"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              animationDuration={600}
            >
              {data.map((entry) => (
                <Cell key={entry.uai} fill={entry.color} />
              ))}
              <Label content={(props) => <CenterLabel viewBox={props.viewBox as CenterLabelProps['viewBox']} total={total} />} position="center" />
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="effectifs-legend">
        {data.map((entry) => (
          <span key={entry.uai} className="effectifs-legend-item">
            <span className="effectifs-legend-dot" style={{ backgroundColor: entry.color }} />
            {entry.nom}
            <span className="effectifs-legend-pct">{entry.effectif} ({entry.pct}%)</span>
          </span>
        ))}
      </div>
      <p className="effectifs-year">{yearLabel}</p>
      {requestedCount != null && requestedCount > effectifs.length && (
        <p className="effectifs-note">
          Données indisponibles pour {requestedCount - effectifs.length} lycée{requestedCount - effectifs.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

export function EffectifsLoading() {
  return (
    <div className="effectifs-loading">
      <span /><span /><span />
    </div>
  );
}
