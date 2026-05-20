import { useReducer, useEffect, useMemo, useState } from 'react';
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
const DARK_MODE_PURPLE = '#a855f7';
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

interface ChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: any;
  unit?: string;
  precision?: number;
  hoveredUai: string | null;
  getLyceeStyle: (uai: string) => typeof LINE_STYLES[number];
  formatName: (key: string) => string;
}

function ChartTooltip({
  active,
  payload,
  label,
  unit = "",
  precision = 1,
  hoveredUai,
  getLyceeStyle,
  formatName,
}: ChartTooltipProps) {
  if (!active || !payload) return null;

  return (
    <div className="lycee-chart-tooltip" style={chartThemeProps.tooltip.contentStyle}>
      <div style={{ marginBottom: 6, fontWeight: 'bold', borderBottom: '1px solid var(--color-border)', paddingBottom: 4 }}>
        Année {label}
      </div>
      {payload.map((item: any) => {
        const style = item.dataKey !== MEDIAN_KEY ? getLyceeStyle(item.dataKey) : null;
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
}

interface IndicateurChartProps {
  title: string;
  subtitle?: string;
  data: any[];
  yAxisUnit?: string;
  yAxisDomain?: any;
  precision?: number;
  rank: Map<string, number>;
  themeLycees: LyceeInfo[];
  hoveredUai: string | null;
  setHoveredUai: (uai: string | null) => void;
  formatName: (key: string) => string;
  onToggleFullscreen: () => void;
  isFullscreen?: boolean;
  getLyceeStyle: (uai: string) => typeof LINE_STYLES[number];
}

function IndicateurChart({
  title,
  subtitle,
  data,
  yAxisUnit,
  yAxisDomain,
  precision = 1,
  rank,
  themeLycees,
  hoveredUai,
  setHoveredUai,
  formatName,
  onToggleFullscreen,
  isFullscreen = false,
  getLyceeStyle,
}: IndicateurChartProps) {
  return (
    <div className={`lycee-detail-chart ${isFullscreen ? 'is-fullscreen' : ''}`}>
      <div className="lycee-detail-chart-header">
        <div>
          <h5>{title}</h5>
          {subtitle && <p className="lycee-detail-chart-subtitle">{subtitle}</p>}
        </div>
        <button
          className="lycee-chart-fullscreen-btn"
          onClick={onToggleFullscreen}
          title={isFullscreen ? "Fermer le plein écran" : "Afficher en grand"}
          aria-label={isFullscreen ? "Fermer le plein écran" : "Afficher en grand"}
        >
          {isFullscreen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
            </svg>
          )}
        </button>
      </div>

      <div className="lycee-chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid {...chartThemeProps.cartesianGrid} />
            <XAxis dataKey="annee" {...chartThemeProps.xAxis} />
            <YAxis unit={yAxisUnit} domain={yAxisDomain} {...chartThemeProps.yAxis} />
            <Tooltip
              {...chartThemeProps.tooltip}
              content={
                <ChartTooltip
                  unit={yAxisUnit}
                  precision={precision}
                  hoveredUai={hoveredUai}
                  getLyceeStyle={getLyceeStyle}
                  formatName={formatName}
                />
              }
              itemSorter={(item) => rank.get(String(item.dataKey ?? '')) ?? 9999}
            />
            <Legend
              {...chartThemeProps.legend}
              formatter={(key: string) => formatName(key)}
              onMouseEnter={(data) => setHoveredUai(String(data.dataKey))}
              onMouseLeave={() => setHoveredUai(null)}
            />
            {themeLycees.toSorted((a, b) => (rank.get(a.uai) ?? 99) - (rank.get(b.uai) ?? 99)).map((l) => {
              const style = getLyceeStyle(l.uai);
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
    </div>
  );
}

export function LyceesIndicateurs({ lycees }: LyceesIndicateursProps) {
  const [state, dispatch] = useReducer(fetchReducer, INITIAL_STATE);
  const [hoveredUai, setHoveredUai] = useReducer((_: string | null, action: string | null) => action, null);
  const [fullscreenChart, setFullscreenChart] = useState<'tb' | 'acces' | 'ips' | 'ihs' | null>(null);
  const { resolvedTheme } = useTheme();

  const themeLycees = useMemo(() => {
    if (resolvedTheme !== 'dark') {
      return lycees.map(l => ({
        ...l,
        color: (l.color.toLowerCase() === DARK_MODE_PURPLE.toLowerCase() || l.color.toLowerCase() === INACCESSIBLE_BLACK.toLowerCase())
          ? INACCESSIBLE_BLACK
          : l.color
      }));
    }
    return lycees.map(l => ({
      ...l,
      color: l.color.toLowerCase() === INACCESSIBLE_BLACK.toLowerCase() ? DARK_MODE_PURPLE : l.color
    }));
  }, [lycees, resolvedTheme]);

  const getLyceeStyle = useMemo(() => {
    // Sort all lycées alphabetically by UAI to guarantee a perfectly stable shape/line style
    const sorted = lycees.toSorted((a, b) => a.uai.localeCompare(b.uai));
    return (uai: string) => {
      const idx = sorted.findIndex(l => l.uai === uai);
      return LINE_STYLES[idx !== -1 ? idx % LINE_STYLES.length : 0];
    };
  }, [lycees]);

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

  // Support ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFullscreenChart(null);
      }
    };
    if (fullscreenChart !== null) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [fullscreenChart]);

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

  return (
    <div className="lycee-detail">
      {hasTB && (
        <IndicateurChart
          title="Taux de mentions TB au Bac (%)"
          data={tbChartData}
          yAxisUnit="%"
          rank={tbRank}
          themeLycees={themeLycees}
          hoveredUai={hoveredUai}
          setHoveredUai={setHoveredUai}
          formatName={formatName}
          onToggleFullscreen={() => setFullscreenChart('tb')}
          getLyceeStyle={getLyceeStyle}
        />
      )}

      {hasAcces && (
        <IndicateurChart
          title="Taux d'accès 2nde → Terminale (%)"
          data={accesChartData}
          yAxisUnit="%"
          yAxisDomain={['auto', 100]}
          rank={accesRank}
          themeLycees={themeLycees}
          hoveredUai={hoveredUai}
          setHoveredUai={setHoveredUai}
          formatName={formatName}
          onToggleFullscreen={() => setFullscreenChart('acces')}
          getLyceeStyle={getLyceeStyle}
        />
      )}

      {hasIPS && (
        <IndicateurChart
          title="Indice de Position Sociale (IPS)"
          data={ipsChartData}
          yAxisDomain={['auto', 'auto']}
          rank={ipsRank}
          themeLycees={themeLycees}
          hoveredUai={hoveredUai}
          setHoveredUai={setHoveredUai}
          formatName={formatName}
          onToggleFullscreen={() => setFullscreenChart('ips')}
          getLyceeStyle={getLyceeStyle}
        />
      )}

      {hasIHS && (
        <IndicateurChart
          title="Mixité sociale (IHS)"
          subtitle="Indice d'Hétérogénéité Sociale Relative, de 0 (homogène) à 1 (mixité maximale)"
          data={ihsChartData}
          yAxisDomain={['auto', 'auto']}
          precision={3}
          rank={ihsRank}
          themeLycees={themeLycees}
          hoveredUai={hoveredUai}
          setHoveredUai={setHoveredUai}
          formatName={formatName}
          onToggleFullscreen={() => setFullscreenChart('ihs')}
          getLyceeStyle={getLyceeStyle}
        />
      )}

      {/* Modale Overlay pour l'affichage en Grand Écran */}
      {fullscreenChart && (
        <div 
          className="lycee-chart-modal-overlay" 
          onClick={() => setFullscreenChart(null)}
          role="button"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setFullscreenChart(null);
            }
          }}
        >
          <div className="lycee-chart-modal-content" onClick={(e) => e.stopPropagation()} role="presentation">
            <button 
              className="lycee-chart-modal-close" 
              onClick={() => setFullscreenChart(null)} 
              aria-label="Fermer le plein écran"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            {fullscreenChart === 'tb' && (
              <IndicateurChart
                title="Taux de mentions TB au Bac (%)"
                data={tbChartData}
                yAxisUnit="%"
                rank={tbRank}
                themeLycees={themeLycees}
                hoveredUai={hoveredUai}
                setHoveredUai={setHoveredUai}
                formatName={formatName}
                onToggleFullscreen={() => setFullscreenChart(null)}
                isFullscreen={true}
                getLyceeStyle={getLyceeStyle}
              />
            )}

            {fullscreenChart === 'acces' && (
              <IndicateurChart
                title="Taux d'accès 2nde → Terminale (%)"
                data={accesChartData}
                yAxisUnit="%"
                yAxisDomain={['auto', 100]}
                rank={accesRank}
                themeLycees={themeLycees}
                hoveredUai={hoveredUai}
                setHoveredUai={setHoveredUai}
                formatName={formatName}
                onToggleFullscreen={() => setFullscreenChart(null)}
                isFullscreen={true}
                getLyceeStyle={getLyceeStyle}
              />
            )}

            {fullscreenChart === 'ips' && (
              <IndicateurChart
                title="Indice de Position Sociale (IPS)"
                data={ipsChartData}
                yAxisDomain={['auto', 'auto']}
                rank={ipsRank}
                themeLycees={themeLycees}
                hoveredUai={hoveredUai}
                setHoveredUai={setHoveredUai}
                formatName={formatName}
                onToggleFullscreen={() => setFullscreenChart(null)}
                isFullscreen={true}
                getLyceeStyle={getLyceeStyle}
              />
            )}

            {fullscreenChart === 'ihs' && (
              <IndicateurChart
                title="Mixité sociale (IHS)"
                subtitle="Indice d'Hétérogénéité Sociale Relative, de 0 (homogène) à 1 (mixité maximale)"
                data={ihsChartData}
                yAxisDomain={['auto', 'auto']}
                precision={3}
                rank={ihsRank}
                themeLycees={themeLycees}
                hoveredUai={hoveredUai}
                setHoveredUai={setHoveredUai}
                formatName={formatName}
                onToggleFullscreen={() => setFullscreenChart(null)}
                isFullscreen={true}
                getLyceeStyle={getLyceeStyle}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
