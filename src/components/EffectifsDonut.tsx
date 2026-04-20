import { PieChart, Pie, Cell, ResponsiveContainer, Label, type PieLabelRenderProps } from 'recharts';
import type { EffectifLycee } from '../types';
import type { AdmissionDifficulty } from '../services/seuilsApi';
import './EffectifsDonut.css';

const PARTICLES = new Set(['DE', 'DU', 'LE', 'LA', 'DES', 'LES']);

function shortenName(nom: string): string {
  const words = nom.split(' ');
  if (words.length < 2) return nom;
  // Abbreviate first name if followed by a last name (skip particles)
  const firstWord = words[0];
  if (PARTICLES.has(firstWord)) return nom;
  if (nom.length <= 10) return nom;
  // Already abbreviated (e.g. "P.G.")
  if (firstWord.includes('.')) return nom;
  return `${firstWord[0]}. ${words.slice(1).join(' ')}`;
}

const DEFAULT_COLOR = '#9ca3af';
const RADIAN = Math.PI / 180;
const LABEL_OFFSET = 25;
const FICHE_RECTORAT_URL =
  'https://data.education.gouv.fr/pages/fiche-etablissement/?code_etab=';

interface EffectifsDonutProps {
  effectifs: EffectifLycee[];
  difficulties: Map<string, AdmissionDifficulty>;
  requestedCount?: number;
  newLyceeUais?: Set<string>;
}

interface CenterLabelProps {
  viewBox?: {
    cx?: number;
    cy?: number;
    [key: string]: unknown;
  };
  total: number;
}

function CenterLabel({ viewBox, total }: CenterLabelProps) {
  const cx = viewBox?.cx;
  const cy = viewBox?.cy;
  if (cx == null || cy == null) return null;
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

const LABEL_WIDTH = 160;
const LABEL_HEIGHT = 36;

function SliceLabel(props: PieLabelRenderProps) {
  const p = props as unknown as Record<string, unknown>;
  const cx = Number(p.cx ?? 0);
  const cy = Number(p.cy ?? 0);
  const midAngle = Number(p.midAngle ?? 0);
  const outerRadius = Number(p.outerRadius ?? 0);
  const nom = String(p.nom ?? '');
  const pct = Number(p.pct ?? 0);
  const effectif = Number(p.effectif ?? 0);
  const color = String(p.color ?? DEFAULT_COLOR);
  const uai = String(p.uai ?? '');
  const sin = Math.sin(-midAngle * RADIAN);
  const cos = Math.cos(-midAngle * RADIAN);

  // Point on the outer edge of the slice
  const ex = cx + (outerRadius + 8) * cos;
  const ey = cy + (outerRadius + 8) * sin;

  // End of the leader line
  const tx = cx + (outerRadius + LABEL_OFFSET) * cos;
  const ty = cy + (outerRadius + LABEL_OFFSET) * sin;

  // Horizontal extension
  const isRight = cos >= 0;
  const hx = tx + (isRight ? 14 : -14);

  const foX = isRight ? hx + 4 : hx - 4 - LABEL_WIDTH;
  const foY = ty - LABEL_HEIGHT / 2;

  return (
    <g>
      <path
        d={`M${ex},${ey}L${tx},${ty}L${hx},${ty}`}
        stroke={color}
        strokeWidth={1}
        fill="none"
      />
      <foreignObject x={foX} y={foY} width={LABEL_WIDTH} height={LABEL_HEIGHT}>
        <div className={`donut-label-box ${isRight ? 'donut-label-left' : 'donut-label-right'}`}>
          <a
            href={`${FICHE_RECTORAT_URL}${uai}`}
            target="_blank"
            rel="noopener noreferrer"
            className="donut-label-link"
          >
            {shortenName(nom)}
          </a>
          <span className="donut-label-detail">{effectif} ({pct}%)</span>
        </div>
      </foreignObject>
    </g>
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

export function EffectifsDonut({ effectifs, difficulties, requestedCount, newLyceeUais }: EffectifsDonutProps) {
  const total = effectifs.reduce((sum, e) => sum + e.effectif, 0);
  if (total === 0) return null;

  const annee = effectifs[0]?.annee?.slice(0, 4) ?? '';

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

  const newLyceeNames = newLyceeUais
    ? effectifs.filter((e) => newLyceeUais.has(e.uai)).map((e) => e.nom)
    : [];

  return (
    <div
      className="effectifs-donut"
      role="img"
      aria-label={`Répartition des ${total} places de seconde entre ${effectifs.length} lycées de secteur 1`}
    >
      <p className="effectifs-donut-caption">
        Effectifs de classe de seconde {annee ? `(${annee}) ` : ''}des {effectifs.length} lycées de secteur 1
      </p>
      <div className="effectifs-donut-chart">
        <ResponsiveContainer width="100%" height={290}>
          <PieChart>
            <Pie
              data={data}
              dataKey="effectif"
              nameKey="nom"
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={95}
              paddingAngle={2}
              animationDuration={600}
              label={(p: PieLabelRenderProps) => SliceLabel(p)}
              labelLine={false}
            >
              {data.map((entry) => (
                <Cell key={entry.uai} fill={entry.color} />
              ))}
              <Label content={(props) => <CenterLabel viewBox={props.viewBox as CenterLabelProps['viewBox']} total={total} />} position="center" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      {newLyceeNames.length > 0 && (
        <p className="effectifs-new-lycees">
          <span className="new-sector-badge">Nouveau</span>
          {' '}{newLyceeNames.join(', ')} — remplace Rabelais (fermé)
        </p>
      )}
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
