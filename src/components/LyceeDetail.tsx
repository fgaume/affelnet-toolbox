import { useReducer, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { fetchNiveauScolaire, fetchMedianTBByYear, type NiveauScolaireResult } from '../services/niveauScolaireApi';
import { fetchIps, fetchMedianIpsByYear, type IpsResult } from '../services/ipsApi';
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
}

const SHORT_NAME_LIMIT = 14;
const MEDIAN_KEY = '__median__';
const MEDIAN_COLOR = '#9ca3af';

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
  medianIPS: Map<string, number>;
}

type FetchAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; data: Map<string, LyceeData>; medianTB: Map<string, number>; medianIPS: Map<string, number> };

function fetchReducer(state: FetchState, action: FetchAction): FetchState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true };
    case 'FETCH_SUCCESS':
      return {
        loading: false,
        data: action.data,
        medianTB: action.medianTB,
        medianIPS: action.medianIPS,
      };
  }
}

const INITIAL_STATE: FetchState = {
  loading: true,
  data: new Map(),
  medianTB: new Map(),
  medianIPS: new Map(),
};

export function LyceesIndicateurs({ lycees }: LyceesIndicateursProps) {
  const [state, dispatch] = useReducer(fetchReducer, INITIAL_STATE);

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'FETCH_START' });

    Promise.all([
      // Fetch per-lycée data
      Promise.allSettled(
        lycees.map(async (l) => {
          const [niveau, ips] = await Promise.allSettled([
            fetchNiveauScolaire(l.uai),
            fetchIps(l.uai),
          ]);
          return {
            uai: l.uai,
            niveau: niveau.status === 'fulfilled' ? niveau.value : null,
            ips: ips.status === 'fulfilled' ? ips.value : null,
          };
        }),
      ),
      // Fetch medians
      fetchMedianTBByYear(),
      fetchMedianIpsByYear(),
    ]).then(([results, tbMedians, ipsMedians]) => {
      if (cancelled) return;
      const map = new Map<string, LyceeData>();
      for (const r of results) {
        if (r.status === 'fulfilled') {
          map.set(r.value.uai, { niveau: r.value.niveau, ips: r.value.ips });
        }
      }
      dispatch({
        type: 'FETCH_SUCCESS',
        data: map,
        medianTB: tbMedians,
        medianIPS: ipsMedians,
      });
    });

    return () => { cancelled = true; };
  }, [lycees]);

  const { loading, data, medianTB, medianIPS } = state;

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

  // Build merged chart data for IPS
  const allYearsIPS = new Set<string>();
  for (const [, d] of data) {
    d.ips?.history.forEach((p) => allYearsIPS.add(p.annee));
  }
  for (const annee of medianIPS.keys()) allYearsIPS.add(annee);

  const ipsChartData = [...allYearsIPS].sort().map((annee) => {
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
  const ipsRank = lastYearRank(ipsChartData);

  const hasTB = tbChartData.length > 0 && lycees.some((l) => data.get(l.uai)?.niveau);
  const hasIPS = ipsChartData.length > 0 && lycees.some((l) => data.get(l.uai)?.ips);

  if (!hasTB && !hasIPS) return null;

  const formatName = (key: string) => {
    if (key === MEDIAN_KEY) return 'Médiane Paris';
    const lycee = lycees.find((l) => l.uai === key);
    return lycee ? shortName(lycee.nom) : key;
  };

  return (
    <div className="lycee-detail">
      {hasIPS && (
        <div className="lycee-detail-chart">
          <h5>Indice de Position Sociale (IPS)</h5>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={ipsChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="annee" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip
                formatter={(v: unknown, name: unknown) => [
                  Number(v).toFixed(1),
                  formatName(String(name ?? '')),
                ]}
                itemSorter={(item) => ipsRank.get(String(item.dataKey ?? '')) ?? 9999}
                contentStyle={{ background: 'var(--color-bg-card, #fff)', border: '1px solid var(--color-border, #ddd)', borderRadius: 6, fontSize: 11, padding: '4px 8px' }}
                wrapperStyle={{ zIndex: 10 }}
              />
              <Legend
                formatter={(key: string) => formatName(key)}
                wrapperStyle={{ fontSize: 11 }}
              />
              {[...lycees].sort((a, b) => (ipsRank.get(a.uai) ?? 99) - (ipsRank.get(b.uai) ?? 99)).map((l) => (
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

      {hasTB && (
        <div className="lycee-detail-chart">
          <h5>Taux de mentions TB au Bac (%)</h5>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={tbChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="annee" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip
                formatter={(v: unknown, name: unknown) => [
                  `${Number(v).toFixed(1)}%`,
                  formatName(String(name ?? '')),
                ]}
                itemSorter={(item) => tbRank.get(String(item.dataKey ?? '')) ?? 9999}
                contentStyle={{ background: 'var(--color-bg-card, #fff)', border: '1px solid var(--color-border, #ddd)', borderRadius: 6, fontSize: 11, padding: '4px 8px' }}
                wrapperStyle={{ zIndex: 10 }}
              />
              <Legend
                formatter={(key: string) => formatName(key)}
                wrapperStyle={{ fontSize: 11 }}
              />
              {[...lycees].sort((a, b) => (tbRank.get(a.uai) ?? 99) - (tbRank.get(b.uai) ?? 99)).map((l) => (
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
