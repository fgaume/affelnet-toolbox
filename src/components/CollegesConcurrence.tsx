import { useReducer, useEffect, type Dispatch } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { fetchCollegesConcurrents, type CollegeConcurrent } from '../services/collegesConcurrenceApi';
import './CollegesConcurrence.css';

interface CollegesConcurrenceProps {
  uaiLycee: string;
  uaiCollegeUtilisateur: string;
}

const BONUS_COLORS: Record<number, string> = {
  0: '#dc2626',     // red — no bonus = most advantaged socially
  400: '#f97316',   // orange
  800: '#3b82f6',   // blue
  1200: '#16a34a',  // green — highest bonus = most disadvantaged
};
const UNKNOWN_COLOR = '#9ca3af';
const USER_STROKE = '#fbbf24';
const USER_STROKE_WIDTH = 2;

const BONUS_LABELS: Record<number, string> = {
  1200: 'Bonus 1200',
  800: 'Bonus 800',
  400: 'Bonus 400',
  0: 'Bonus 0',
  [-1]: 'Inconnu',
};

interface BarDataPoint {
  bonusLabel: string;
  bonusIps: number;
  total: number;
  colleges: CollegeConcurrent[];
}

function buildChartData(colleges: CollegeConcurrent[]): BarDataPoint[] {
  const groups = new Map<number, CollegeConcurrent[]>();
  for (const c of colleges) {
    const key = c.bonusIps;
    const arr = groups.get(key) ?? [];
    arr.push(c);
    groups.set(key, arr);
  }

  return [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([bonus, cols]) => ({
      bonusLabel: BONUS_LABELS[bonus] ?? `Bonus ${bonus}`,
      bonusIps: bonus,
      total: cols.reduce((sum, c) => sum + c.nbAdmis, 0),
      colleges: cols.sort((a, b) => b.nbAdmis - a.nbAdmis),
    }));
}

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ name: string; dataKey: string; value: number; payload: BarDataPoint & Record<string, unknown> }>;
}) {
  if (!active || !payload?.[0]) return null;
  const data = payload[0].payload;
  const segments = payload.filter((p) => p.value > 0);
  return (
    <div className="concurrence-tooltip">
      <div className="concurrence-tooltip-title">{data.bonusLabel}</div>
      {segments.map((p) => {
        // dataKey is the UAI, find the college name from the group
        const college = data.colleges.find((c) => c.uai === p.dataKey);
        return (
          <div key={p.dataKey} className="concurrence-tooltip-row">
            <span>{college?.nom ?? p.name}</span>
            <span className="concurrence-tooltip-value">{p.value} admis</span>
          </div>
        );
      })}
      <div className="concurrence-tooltip-total">Total : {data.total} admis</div>
    </div>
  );
}

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; colleges: CollegeConcurrent[] };

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; colleges: CollegeConcurrent[] }
  | { type: 'FETCH_ERROR'; message: string };

function reducer(_state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START': return { status: 'loading' };
    case 'FETCH_SUCCESS': return { status: 'success', colleges: action.colleges };
    case 'FETCH_ERROR': return { status: 'error', message: action.message };
  }
}

function doFetch(uaiLycee: string, dispatch: Dispatch<Action>) {
  dispatch({ type: 'FETCH_START' });
  fetchCollegesConcurrents(uaiLycee)
    .then((result) => dispatch({ type: 'FETCH_SUCCESS', colleges: result }))
    .catch((err) => dispatch({ type: 'FETCH_ERROR', message: err instanceof Error ? err.message : 'Erreur de chargement' }));
}

export function CollegesConcurrence({ uaiLycee, uaiCollegeUtilisateur }: CollegesConcurrenceProps) {
  const [state, dispatch] = useReducer(reducer, { status: 'loading' });

  useEffect(() => {
    doFetch(uaiLycee, dispatch);
  }, [uaiLycee]);

  if (state.status === 'loading') {
    return (
      <div className="concurrence-panel">
        <div className="concurrence-loading"><span /><span /><span /></div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="concurrence-panel">
        <div className="concurrence-error">
          {state.message}
          <button onClick={() => doFetch(uaiLycee, dispatch)}>Réessayer</button>
        </div>
      </div>
    );
  }

  const colleges = state.colleges;

  if (colleges.length === 0) return null;

  const chartData = buildChartData(colleges);

  // Transform data for stacked bars: each dataKey is a college UAI
  const stackedData = chartData.map((group) => {
    const point: Record<string, unknown> = {
      bonusLabel: group.bonusLabel,
      bonusIps: group.bonusIps,
      colleges: group.colleges,
      total: group.total,
    };
    for (const c of group.colleges) {
      point[c.uai] = c.nbAdmis;
    }
    return point;
  });

  // Unique colleges across all groups
  const uniqueColleges: { uai: string; nom: string; bonusIps: number }[] = [];
  const seen = new Set<string>();
  for (const group of chartData) {
    for (const c of group.colleges) {
      if (!seen.has(c.uai)) {
        seen.add(c.uai);
        uniqueColleges.push({ uai: c.uai, nom: c.nom, bonusIps: c.bonusIps });
      }
    }
  }

  const isUserCollege = (uai: string) => uai === uaiCollegeUtilisateur;

  return (
    <div className="concurrence-panel">
      <ResponsiveContainer width="100%" height={Math.max(120, chartData.length * 32 + 50)}>
        <BarChart data={stackedData} layout="vertical" barSize={18} barCategoryGap={4} margin={{ left: 10, right: 20, top: 5, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} label={{ value: 'Admis DNB', position: 'insideBottom', offset: -5, fontSize: 11 }} />
          <YAxis type="category" dataKey="bonusLabel" tick={{ fontSize: 11 }} width={80} />
          <Tooltip content={<CustomTooltip />} />
          {uniqueColleges.map((c) => (
            <Bar key={c.uai} dataKey={c.uai} stackId="stack" name={c.nom}>
              {stackedData.map((_, index) => (
                <Cell
                  key={index}
                  fill={BONUS_COLORS[c.bonusIps] ?? UNKNOWN_COLOR}
                  stroke={isUserCollege(c.uai) ? USER_STROKE : 'none'}
                  strokeWidth={isUserCollege(c.uai) ? USER_STROKE_WIDTH : 0}
                />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="concurrence-legend">
        <div className="concurrence-legend-items">
          {Object.entries(BONUS_COLORS).map(([bonus, color]) => (
            <span key={bonus} className="concurrence-legend-item">
              <span className="concurrence-legend-dot" style={{ backgroundColor: color }} />
              {BONUS_LABELS[Number(bonus)]}
            </span>
          ))}
          <span className="concurrence-legend-item">
            <span className="concurrence-legend-dot concurrence-legend-user" />
            Votre collège
          </span>
        </div>
      </div>
    </div>
  );
}
