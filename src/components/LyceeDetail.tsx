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

export function LyceesIndicateurs({ lycees }: LyceesIndicateursProps) {
  const [state, dispatch] = useReducer(fetchReducer, INITIAL_STATE);
  const { resolvedTheme } = useTheme();

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

  const tbChartData = [...allYearsTB].sort().map((annee) => {
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

  const accesChartData = [...allYearsAcces].sort().map((annee) => {
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

  const ipsChartData = [...allYearsIPS].sort().filter((a) => a >= '2022').map((annee) => {
    const point: Record<string, unknown> = { annee };
    for (const l of lycees) {
      const d = data.get(l.uai);
      const p = d?.ips?.history.find((h) => h.annee === annee);
      if (p) point[l.uai] = p.ips;
    }
    const med = medianIPS.get(annee);
    if (med != null) point[MEDIAN_KEY] = med;
    return point;
  });

  // Build merged chart data for IHS
  const allYearsIHS = new Set<string>();
  for (const [, d] of data) {
    d.ihs?.history.forEach((p) => allYearsIHS.add(p.annee));
  }
  for (const annee of medianIHS.keys()) allYearsIHS.add(annee);

  const ihsChartData = [...allYearsIHS].sort().map((annee) => {
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
                formatter={(v: unknown, name: unknown) => [
                  `${Number(v).toFixed(1)}%`,
                  formatName(String(name ?? '')),
                ]}
                itemSorter={(item) => tbRank.get(String(item.dataKey ?? '')) ?? 9999}
              />
              <Legend
                {...chartThemeProps.legend}
                formatter={(key: string) => formatName(key)}
              />
              {[...themeLycees].sort((a, b) => (tbRank.get(a.uai) ?? 99) - (tbRank.get(b.uai) ?? 99)).map((l) => (
                <Line
                  key={l.uai}
                  type="monotone"
                  dataKey={l.uai}
                  stroke={l.color}
                  strokeWidth={2}
                  dot={{ r: 2.5 }}
                  connectNulls
                />
              ))}
              <Line
                key={MEDIAN_KEY}
                type="monotone"
                dataKey={MEDIAN_KEY}
                stroke={MEDIAN_COLOR}
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={false}
                connectNulls
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
                formatter={(v: unknown, name: unknown) => [
                  `${Number(v).toFixed(1)}%`,
                  formatName(String(name ?? '')),
                ]}
                itemSorter={(item) => accesRank.get(String(item.dataKey ?? '')) ?? 9999}
              />
              <Legend
                {...chartThemeProps.legend}
                formatter={(key: string) => formatName(key)}
              />
              {[...themeLycees].sort((a, b) => (accesRank.get(a.uai) ?? 99) - (accesRank.get(b.uai) ?? 99)).map((l) => (
                <Line
                  key={l.uai}
                  type="monotone"
                  dataKey={l.uai}
                  stroke={l.color}
                  strokeWidth={2}
                  dot={{ r: 2.5 }}
                  connectNulls
                />
              ))}
              <Line
                key={MEDIAN_KEY}
                type="monotone"
                dataKey={MEDIAN_KEY}
                stroke={MEDIAN_COLOR}
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={false}
                connectNulls
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
                formatter={(v: unknown, name: unknown) => [
                  Number(v).toFixed(1),
                  formatName(String(name ?? '')),
                ]}
                itemSorter={(item) => ipsRank.get(String(item.dataKey ?? '')) ?? 9999}
              />
              <Legend
                {...chartThemeProps.legend}
                formatter={(key: string) => formatName(key)}
              />
              {[...themeLycees].sort((a, b) => (ipsRank.get(a.uai) ?? 99) - (ipsRank.get(b.uai) ?? 99)).map((l) => (
                <Line
                  key={l.uai}
                  type="monotone"
                  dataKey={l.uai}
                  stroke={l.color}
                  strokeWidth={2}
                  dot={{ r: 2.5 }}
                  connectNulls
                />
              ))}
              <Line
                key={MEDIAN_KEY}
                type="monotone"
                dataKey={MEDIAN_KEY}
                stroke={MEDIAN_COLOR}
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasIHS && (
        <div className="lycee-detail-chart">
          <h5>Mixité sociale (IHS)</h5>
          <p className="lycee-detail-chart-subtitle">Indice d'Hétérogénéité Sociale Relative — de 0 (homogène) à 1 (mixité maximale)</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={ihsChartData}>
              <CartesianGrid {...chartThemeProps.cartesianGrid} />
              <XAxis dataKey="annee" {...chartThemeProps.xAxis} />
              <YAxis domain={['auto', 'auto']} {...chartThemeProps.yAxis} />
              <Tooltip
                {...chartThemeProps.tooltip}
                formatter={(v: unknown, name: unknown) => [
                  Number(v).toFixed(3),
                  formatName(String(name ?? '')),
                ]}
                itemSorter={(item) => ihsRank.get(String(item.dataKey ?? '')) ?? 9999}
              />
              <Legend
                {...chartThemeProps.legend}
                formatter={(key: string) => formatName(key)}
              />
              {[...themeLycees].sort((a, b) => (ihsRank.get(a.uai) ?? 99) - (ihsRank.get(b.uai) ?? 99)).map((l) => (
                <Line
                  key={l.uai}
                  type="monotone"
                  dataKey={l.uai}
                  stroke={l.color}
                  strokeWidth={2}
                  dot={{ r: 2.5 }}
                  connectNulls
                />
              ))}
              <Line
                key={MEDIAN_KEY}
                type="monotone"
                dataKey={MEDIAN_KEY}
                stroke={MEDIAN_COLOR}
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
