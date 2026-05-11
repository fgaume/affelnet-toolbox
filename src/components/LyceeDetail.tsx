import { useReducer, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { fetchNiveauScolaire, fetchMedianTBByYear, fetchMedianAccesByYear, type NiveauScolaireResult } from '../services/niveauScolaireApi';
import { fetchIps, fetchMedianIpsByYear, type IpsResult } from '../services/ipsApi';
import { fetchIhs, fetchMedianIhsByYear } from '../services/heterogeneiteApi';
import type { HeterogeneiteResult } from '../types';
import { useTheme } from '../hooks/useTheme';
import './LyceeDetail.css';

interface LyceeInfo {
  uai: string;
  nom: string;
  color: string;
}

interface LyceesIndicateursProps {
  lycees: LyceeInfo[];
}

interface LyceeData {
  niveau: NiveauScolaireResult | null;
  ips: IpsResult | null;
  ihs: HeterogeneiteResult | null;
}

const SHORT_NAME_LIMIT = 14;
const MEDIAN_KEY = '__median__';
const MEDIAN_COLOR = '#9ca3af';
const DARK_MODE_PURPLE = '#d8b4fe';
const INACCESSIBLE_BLACK = '#1a1a1a';

function shortName(nom: string): string {
  if (nom.length <= SHORT_NAME_LIMIT) return nom;
  const words = nom.split(' ');
  if (words.length < 2 || words[0].includes('.')) return nom;
  return `${words[0][0]}. ${words.slice(1).join(' ')}`;
}

interface FetchState {
  loading: boolean;
  data: Map<string, LyceeData>;
  medianTB: Map<string, number>;
  medianAcces: Map<string, number>;
  medianIPS: Map<string, number>;
  medianIHS: Map<string, number>;
}

type FetchAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; data: Map<string, LyceeData>; medianTB: Map<string, number>; medianAcces: Map<string, number>; medianIPS: Map<string, number>; medianIHS: Map<string, number> };

function fetchReducer(state: FetchState, action: FetchAction): FetchState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true };
    case 'FETCH_SUCCESS':
      return {
        loading: false,
        data: action.data,
        medianTB: action.medianTB,
        medianAcces: action.medianAcces,
        medianIPS: action.medianIPS,
        medianIHS: action.medianIHS,
      };
  }
}

const INITIAL_STATE: FetchState = {
  loading: true,
  data: new Map(),
  medianTB: new Map(),
  medianAcces: new Map(),
  medianIPS: new Map(),
  medianIHS: new Map(),
};

const LINE_STYLES = [
  { dash: undefined, dot: 'circle' },
  { dash: '5 5', dot: 'square' },
  { dash: '3 3', dot: 'triangle' },
  { dash: '10 5', dot: 'diamond' },
  { dash: '8 4 2 4', dot: 'star' },
] as const;

function CustomDot(props: any) {
  const { cx, cy, stroke, fill, r, dotType } = props;
  if (cx === null || cy === null) return null;

  switch (dotType) {
    case 'square':
      return <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill={fill} stroke={stroke} strokeWidth={1} />;
    case 'triangle':
      return <path d={`M${cx},${cy - r} L${cx + r},${cy + r} L${cx - r},${cy + r} Z`} fill={fill} stroke={stroke} strokeWidth={1} />;
    case 'diamond':
      return <path d={`M${cx},${cy - r} L${cx + r},${cy} L${cx},${cy + r} L${cx - r},${cy} Z`} fill={fill} stroke={stroke} strokeWidth={1} />;
    case 'star':
      return <path d={`M${cx},${cy - r * 1.2} L${cx + r * 0.4},${cy - r * 0.3} L${cx + r * 1.2},${cy - r * 0.2} L${cx + r * 0.6},${cy + r * 0.5} L${cx + r * 0.8},${cy + r * 1.2} L${cx},${cy + r * 0.8} L${cx - r * 0.8},${cy + r * 1.2} L${cx - r * 0.6},${cy + r * 0.5} L${cx - r * 1.2},${cy - r * 0.2} L${cx - r * 0.4},${cy - r * 0.3} Z`} fill={fill} stroke={stroke} strokeWidth={1} />;
    default:
      return <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={1} />;
  }
}

function TooltipIcon({ color, dotType, dash }: { color: string; dotType: string; dash?: string }) {
  return (
    <svg width="24" height="12" style={{ marginRight: 8, verticalAlign: 'middle' }}>
      <line x1="0" y1="6" x2="24" y2="6" stroke={color} strokeWidth={2} strokeDasharray={dash} />
      <CustomDot cx={12} cy={6} r={3} fill={color} stroke={color} dotType={dotType} />
    </svg>
  );
}

export function LyceesIndicateurs({ lycees }: LyceesIndicateursProps) {
  const [state, dispatch] = useReducer(fetchReducer, INITIAL_STATE);
  const [hoveredUai, setHoveredUai] = useReducer((_: string | null, action: string | null) => action, null);
  const { resolvedTheme } = useTheme();

  lycees.sort((a, b) => a.uai.localeCompare(b.uai));

  const themeLycees = useMemo(() => {
    if (resolvedTheme !== 'dark') return lycees;
    return lycees.map(l => ({
      ...l,
      color: l.color === INACCESSIBLE_BLACK ? DARK_MODE_PURPLE : l.color
    }));
  }, [lycees, resolvedTheme]);

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'FETCH_START' });

    Promise.all([
      // Fetch per-lycée data
      Promise.allSettled(
        lycees.map(async (l) => {
          const [niveau, ips, ihs] = await Promise.allSettled([
            fetchNiveauScolaire(l.uai),
            fetchIps(l.uai),
            fetchIhs(l.uai),
          ]);
          return {
            uai: l.uai,
            niveau: niveau.status === 'fulfilled' ? niveau.value : null,
            ips: ips.status === 'fulfilled' ? ips.value : null,
            ihs: ihs.status === 'fulfilled' ? ihs.value : null,
          };
        }),
      ),
      // Fetch medians
      fetchMedianTBByYear(),
      fetchMedianAccesByYear(),
      fetchMedianIpsByYear(),
      fetchMedianIhsByYear(),
    ]).then(([results, tbMedians, accesMedians, ipsMedians, ihsMedians]) => {
      if (cancelled) return;
      const map = new Map<string, LyceeData>();
      for (const r of results) {
        if (r.status === 'fulfilled') {
          map.set(r.value.uai, { niveau: r.value.niveau, ips: r.value.ips, ihs: r.value.ihs });
        }
      }
      dispatch({
        type: 'FETCH_SUCCESS',
        data: map,
        medianTB: tbMedians,
        medianAcces: accesMedians,
        medianIPS: ipsMedians,
        medianIHS: ihsMedians,
      });
    });

    return () => { cancelled = true; };
  }, [lycees]);

  const { loading, data, medianTB, medianAcces, medianIPS, medianIHS } = state;

  if (loading) {
    return (
      <div className="lycee-detail">
        <div className="lycee-detail-loading"><span /><span /><span /></div>
      </div>
    );
  }

  // Build merged chart data for TB
  const allYearsTB = new Set<string>();
  for (const [, d] of data) {
    d.niveau?.history.forEach((p) => allYearsTB.add(p.annee));
  }
  for (const annee of medianTB.keys()) allYearsTB.add(annee);

  const tbChartData = Array.from(allYearsTB).toSorted().map((annee) => {
    const point: Record<string, unknown> = { annee };
    for (const l of lycees) {
      const d = data.get(l.uai);
      const p = d?.niveau?.history.find((h) => h.annee === annee);
      if (p) point[l.uai] = p.tauxTB;
    }
    const med = medianTB.get(annee);
    if (med != null) point[MEDIAN_KEY] = med;
    return point;
  });

  // Build merged chart data for Access rate
  const allYearsAcces = new Set<string>();
  for (const [, d] of data) {
    d.niveau?.history.forEach((p) => p.tauxAcces !== null && allYearsAcces.add(p.annee));
  }
  for (const annee of medianAcces.keys()) allYearsAcces.add(annee);

  const accesChartData = Array.from(allYearsAcces).toSorted().map((annee) => {
    const point: Record<string, unknown> = { annee };
    for (const l of lycees) {
      const d = data.get(l.uai);
      const p = d?.niveau?.history.find((h) => h.annee === annee);
      if (p?.tauxAcces != null) point[l.uai] = p.tauxAcces;
    }
    const med = medianAcces.get(annee);
    if (med != null) point[MEDIAN_KEY] = med;
    return point;
  });

  // Build merged chart data for IPS
  const allYearsIPS = new Set<string>();
  for (const [, d] of data) {
    d.ips?.history.forEach((p) => allYearsIPS.add(p.annee));
  }
  for (const annee of medianIPS.keys()) allYearsIPS.add(annee);

  const ipsChartData = Array.from(allYearsIPS).toSorted().reduce<Record<string, unknown>[]>((acc, annee) => {
    if (annee >= '2022') {
      const point: Record<string, unknown> = { annee };
      for (const l of lycees) {
        const d = data.get(l.uai);
        const p = d?.ips?.history.find((h) => h.annee === annee);
        if (p) point[l.uai] = p.ips;
      }
      const med = medianIPS.get(annee);
      if (med != null) point[MEDIAN_KEY] = med;
      acc.push(point);
    }
    return acc;
  }, []);

  // Build merged chart data for IHS
  const allYearsIHS = new Set<string>();
  for (const [, d] of data) {
    d.ihs?.history.forEach((p) => allYearsIHS.add(p.annee));
  }
  for (const annee of medianIHS.keys()) allYearsIHS.add(annee);

  const ihsChartData = Array.from(allYearsIHS).toSorted().map((annee) => {
    const point: Record<string, unknown> = { annee };
    for (const l of lycees) {
      const d = data.get(l.uai);
      const p = d?.ihs?.history.find((h) => h.annee === annee);
      if (p) point[l.uai] = p.ihs;
    }
    const med = medianIHS.get(annee);
    if (med != null) point[MEDIAN_KEY] = med;
    return point;
  });

  // Compute sort rank based on last year value (descending), median always last
  function lastYearRank(chartData: Record<string, unknown>[]): Map<string, number> {
    const lastPoint = chartData[chartData.length - 1];
    if (!lastPoint) return new Map();
    const entries: [string, number][] = [];
    for (const [key, val] of Object.entries(lastPoint)) {
      if (key === 'annee') continue;
      entries.push([key, typeof val === 'number' ? val : -Infinity]);
    }
    entries.sort((a, b) => b[1] - a[1]);
    const rank = new Map<string, number>();
    entries.forEach(([key], i) => rank.set(key, key === MEDIAN_KEY ? 9999 : i));
    return rank;
  }

  const tbRank = lastYearRank(tbChartData);
  const accesRank = lastYearRank(accesChartData);
  const ipsRank = lastYearRank(ipsChartData);
  const ihsRank = lastYearRank(ihsChartData);

  const hasTB = tbChartData.length > 0 && lycees.some((l) => data.get(l.uai)?.niveau);
  const hasAcces = accesChartData.length > 0 && lycees.some((l) => data.get(l.uai)?.niveau?.history.some(h => h.tauxAcces != null));
  const hasIPS = ipsChartData.length > 0 && lycees.some((l) => data.get(l.uai)?.ips);
  const hasIHS = ihsChartData.length > 0 && lycees.some((l) => data.get(l.uai)?.ihs);

  if (!hasTB && !hasIPS && !hasAcces && !hasIHS) return null;

  const formatName = (key: string) => {
    if (key === MEDIAN_KEY) return 'Médiane Paris';
    const lycee = lycees.find((l) => l.uai === key);
    return lycee ? shortName(lycee.nom) : key;
  };

  const ChartTooltip = ({ active, payload, label, unit = "", precision = 1 }: any) => {
    if (!active || !payload) return null;

    return (
      <div className="lycee-chart-tooltip" style={chartThemeProps.tooltip.contentStyle}>
        <div style={{ marginBottom: 6, fontWeight: 'bold', borderBottom: '1px solid var(--color-border)', paddingBottom: 4 }}>
          Année {label}
        </div>
        {payload.map((item: any) => {
          const lIndex = themeLycees.findIndex(l => l.uai === item.dataKey);
          const style = lIndex !== -1 ? LINE_STYLES[lIndex % LINE_STYLES.length] : null;
          const name = formatName(item.name);
          const isHovered = hoveredUai === item.dataKey;
          const hasFocus = hoveredUai !== null;
          
          return (
            <div key={item.dataKey} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              margin: '3px 0', 
              opacity: !hasFocus || isHovered ? 1 : 0.4,
              transform: isHovered ? 'scale(1.02)' : 'none',
              transition: 'all 0.1s ease',
              fontWeight: isHovered ? 'bold' : 'normal'
            }}>
              {item.dataKey === MEDIAN_KEY ? (
                <svg width="24" height="12" style={{ marginRight: 8, verticalAlign: 'middle' }}>
                   <line x1="0" y1="6" x2="24" y2="6" stroke={MEDIAN_COLOR} strokeWidth={1.5} strokeDasharray="6 3" />
                </svg>
              ) : style ? (
                <TooltipIcon color={item.color} dotType={style.dot} dash={style.dash} />
              ) : null}
              <span style={{ flex: 1, marginRight: 12 }}>{name}</span>
              <span style={{ fontFamily: 'monospace' }}>
                {Number(item.value).toFixed(precision)}{unit}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const chartThemeProps = {
    cartesianGrid: { strokeDasharray: '3 3', stroke: 'var(--color-border)' },
    xAxis: { tick: { fontSize: 11, fill: 'var(--color-text-muted)' }, stroke: 'var(--color-border)' },
    yAxis: { tick: { fontSize: 11, fill: 'var(--color-text-muted)' }, stroke: 'var(--color-border)' },
    tooltip: {
      contentStyle: {
        background: 'var(--color-bg-card, #fff)',
        border: '1px solid var(--color-border, #ddd)',
        borderRadius: 6,
        fontSize: 11,
        padding: '4px 8px',
        color: 'var(--color-text-primary)'
      },
      itemStyle: { padding: '2px 0' },
      wrapperStyle: { zIndex: 10 }
    },
    legend: {
      wrapperStyle: { fontSize: 11, color: 'var(--color-text-secondary)' }
    }
  };

  return (
    <div className="lycee-detail">
      {hasTB && (
        <div className="lycee-detail-chart">
          <h5>Taux de mentions TB au Bac (%)</h5>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={tbChartData}>
              <CartesianGrid {...chartThemeProps.cartesianGrid} />
              <XAxis dataKey="annee" {...chartThemeProps.xAxis} />
              <YAxis unit="%" {...chartThemeProps.yAxis} />
              <Tooltip
                {...chartThemeProps.tooltip}
                content={<ChartTooltip unit="%" precision={1} />}
                itemSorter={(item) => tbRank.get(String(item.dataKey ?? '')) ?? 9999}
              />
              <Legend
                {...chartThemeProps.legend}
                formatter={(key: string) => formatName(key)}
                onMouseEnter={(data) => setHoveredUai(String(data.dataKey))}
                onMouseLeave={() => setHoveredUai(null)}
              />
              {themeLycees.map((l, i) => {
                const style = LINE_STYLES[i % LINE_STYLES.length];
                const isHovered = hoveredUai === l.uai;
                const hasFocus = hoveredUai !== null;
                return (
                  <Line
                    key={l.uai}
                    type="monotone"
                    dataKey={l.uai}
                    stroke={l.color}
                    strokeWidth={isHovered ? 3 : 2}
                    strokeOpacity={!hasFocus || isHovered ? 1 : 0.3}
                    strokeDasharray={style.dash}
                    legendType={style.dot}
                    dot={<CustomDot dotType={style.dot} r={isHovered ? 4 : 2.5} fill={l.color} stroke={l.color} />}
                    activeDot={{ r: 6 }}
                    connectNulls
                    onMouseEnter={() => setHoveredUai(l.uai)}
                    onMouseLeave={() => setHoveredUai(null)}
                  />
                );
              })}
              <Line
                key={MEDIAN_KEY}
                type="monotone"
                dataKey={MEDIAN_KEY}
                stroke={MEDIAN_COLOR}
                strokeWidth={1.5}
                strokeOpacity={hoveredUai === null || hoveredUai === MEDIAN_KEY ? 1 : 0.3}
                strokeDasharray="6 3"
                dot={false}
                connectNulls
                onMouseEnter={() => setHoveredUai(MEDIAN_KEY)}
                onMouseLeave={() => setHoveredUai(null)}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasAcces && (
        <div className="lycee-detail-chart">
          <h5>Taux d'accès 2nde → Terminale (%)</h5>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={accesChartData}>
              <CartesianGrid {...chartThemeProps.cartesianGrid} />
              <XAxis dataKey="annee" {...chartThemeProps.xAxis} />
              <YAxis unit="%" domain={['auto', 100]} {...chartThemeProps.yAxis} />
              <Tooltip
                {...chartThemeProps.tooltip}
                content={<ChartTooltip unit="%" precision={1} />}
                itemSorter={(item) => accesRank.get(String(item.dataKey ?? '')) ?? 9999}
              />
              <Legend
                {...chartThemeProps.legend}
                formatter={(key: string) => formatName(key)}
                onMouseEnter={(data) => setHoveredUai(String(data.dataKey))}
                onMouseLeave={() => setHoveredUai(null)}
              />
              {themeLycees.map((l, i) => {
                const style = LINE_STYLES[i % LINE_STYLES.length];
                const isHovered = hoveredUai === l.uai;
                const hasFocus = hoveredUai !== null;
                return (
                  <Line
                    key={l.uai}
                    type="monotone"
                    dataKey={l.uai}
                    stroke={l.color}
                    strokeWidth={isHovered ? 3 : 2}
                    strokeOpacity={!hasFocus || isHovered ? 1 : 0.3}
                    strokeDasharray={style.dash}
                    legendType={style.dot}
                    dot={<CustomDot dotType={style.dot} r={isHovered ? 4 : 2.5} fill={l.color} stroke={l.color} />}
                    activeDot={{ r: 6 }}
                    connectNulls
                    onMouseEnter={() => setHoveredUai(l.uai)}
                    onMouseLeave={() => setHoveredUai(null)}
                  />
                );
              })}
              <Line
                key={MEDIAN_KEY}
                type="monotone"
                dataKey={MEDIAN_KEY}
                stroke={MEDIAN_COLOR}
                strokeWidth={1.5}
                strokeOpacity={hoveredUai === null || hoveredUai === MEDIAN_KEY ? 1 : 0.3}
                strokeDasharray="6 3"
                dot={false}
                connectNulls
                onMouseEnter={() => setHoveredUai(MEDIAN_KEY)}
                onMouseLeave={() => setHoveredUai(null)}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasIPS && (
        <div className="lycee-detail-chart">
          <h5>Indice de Position Sociale (IPS)</h5>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={ipsChartData}>
              <CartesianGrid {...chartThemeProps.cartesianGrid} />
              <XAxis dataKey="annee" {...chartThemeProps.xAxis} />
              <YAxis domain={['auto', 'auto']} {...chartThemeProps.yAxis} />
              <Tooltip
                {...chartThemeProps.tooltip}
                content={<ChartTooltip precision={1} />}
                itemSorter={(item) => ipsRank.get(String(item.dataKey ?? '')) ?? 9999}
              />
              <Legend
                {...chartThemeProps.legend}
                formatter={(key: string) => formatName(key)}
                onMouseEnter={(data) => setHoveredUai(String(data.dataKey))}
                onMouseLeave={() => setHoveredUai(null)}
              />
              {themeLycees.map((l, i) => {
                const style = LINE_STYLES[i % LINE_STYLES.length];
                const isHovered = hoveredUai === l.uai;
                const hasFocus = hoveredUai !== null;
                return (
                  <Line
                    key={l.uai}
                    type="monotone"
                    dataKey={l.uai}
                    stroke={l.color}
                    strokeWidth={isHovered ? 3 : 2}
                    strokeOpacity={!hasFocus || isHovered ? 1 : 0.3}
                    strokeDasharray={style.dash}
                    legendType={style.dot}
                    dot={<CustomDot dotType={style.dot} r={isHovered ? 4 : 2.5} fill={l.color} stroke={l.color} />}
                    activeDot={{ r: 6 }}
                    connectNulls
                    onMouseEnter={() => setHoveredUai(l.uai)}
                    onMouseLeave={() => setHoveredUai(null)}
                  />
                );
              })}
              <Line
                key={MEDIAN_KEY}
                type="monotone"
                dataKey={MEDIAN_KEY}
                stroke={MEDIAN_COLOR}
                strokeWidth={1.5}
                strokeOpacity={hoveredUai === null || hoveredUai === MEDIAN_KEY ? 1 : 0.3}
                strokeDasharray="6 3"
                dot={false}
                connectNulls
                onMouseEnter={() => setHoveredUai(MEDIAN_KEY)}
                onMouseLeave={() => setHoveredUai(null)}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasIHS && (
        <div className="lycee-detail-chart">
          <h5>Mixité sociale (IHS)</h5>
          <p className="lycee-detail-chart-subtitle">Indice d'Hétérogénéité Sociale Relative, de 0 (homogène) à 1 (mixité maximale)</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={ihsChartData}>
              <CartesianGrid {...chartThemeProps.cartesianGrid} />
              <XAxis dataKey="annee" {...chartThemeProps.xAxis} />
              <YAxis domain={['auto', 'auto']} {...chartThemeProps.yAxis} />
              <Tooltip
                {...chartThemeProps.tooltip}
                content={<ChartTooltip precision={3} />}
                itemSorter={(item) => ihsRank.get(String(item.dataKey ?? '')) ?? 9999}
              />
              <Legend
                {...chartThemeProps.legend}
                formatter={(key: string) => formatName(key)}
                onMouseEnter={(data) => setHoveredUai(String(data.dataKey))}
                onMouseLeave={() => setHoveredUai(null)}
              />
              {themeLycees.map((l, i) => {
                const style = LINE_STYLES[i % LINE_STYLES.length];
                const isHovered = hoveredUai === l.uai;
                const hasFocus = hoveredUai !== null;
                return (
                  <Line
                    key={l.uai}
                    type="monotone"
                    dataKey={l.uai}
                    stroke={l.color}
                    strokeWidth={isHovered ? 3 : 2}
                    strokeOpacity={!hasFocus || isHovered ? 1 : 0.3}
                    strokeDasharray={style.dash}
                    legendType={style.dot}
                    dot={<CustomDot dotType={style.dot} r={isHovered ? 4 : 2.5} fill={l.color} stroke={l.color} />}
                    activeDot={{ r: 6 }}
                    connectNulls
                    onMouseEnter={() => setHoveredUai(l.uai)}
                    onMouseLeave={() => setHoveredUai(null)}
                  />
                );
              })}
              <Line
                key={MEDIAN_KEY}
                type="monotone"
                dataKey={MEDIAN_KEY}
                stroke={MEDIAN_COLOR}
                strokeWidth={1.5}
                strokeOpacity={hoveredUai === null || hoveredUai === MEDIAN_KEY ? 1 : 0.3}
                strokeDasharray="6 3"
                dot={false}
                connectNulls
                onMouseEnter={() => setHoveredUai(MEDIAN_KEY)}
                onMouseLeave={() => setHoveredUai(null)}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
