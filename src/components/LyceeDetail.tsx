import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { fetchNiveauScolaire, type NiveauScolaireResult } from '../services/niveauScolaireApi';
import { fetchIps, type IpsResult } from '../services/ipsApi';
import { DecileGauge, type DecileMarker } from './DecileGauge';
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

function shortName(nom: string): string {
  if (nom.length <= SHORT_NAME_LIMIT) return nom;
  const words = nom.split(' ');
  if (words.length < 2 || words[0].includes('.')) return nom;
  return `${words[0][0]}. ${words.slice(1).join(' ')}`;
}

export function LyceesIndicateurs({ lycees }: LyceesIndicateursProps) {
  const [data, setData] = useState<Map<string, LyceeData>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setData(new Map());

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
    ).then((results) => {
      const map = new Map<string, LyceeData>();
      for (const r of results) {
        if (r.status === 'fulfilled') {
          map.set(r.value.uai, { niveau: r.value.niveau, ips: r.value.ips });
        }
      }
      setData(map);
      setLoading(false);
    });
  }, [lycees]);

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
  const tbChartData = [...allYearsTB].sort().map((annee) => {
    const point: Record<string, unknown> = { annee };
    for (const l of lycees) {
      const d = data.get(l.uai);
      const p = d?.niveau?.history.find((h) => h.annee === annee);
      if (p) point[l.uai] = p.tauxTB;
    }
    return point;
  });

  // Build merged chart data for IPS
  const allYearsIPS = new Set<string>();
  for (const [, d] of data) {
    d.ips?.history.forEach((p) => allYearsIPS.add(p.annee));
  }
  const ipsChartData = [...allYearsIPS].sort().map((annee) => {
    const point: Record<string, unknown> = { annee };
    for (const l of lycees) {
      const d = data.get(l.uai);
      const p = d?.ips?.history.find((h) => h.annee === annee);
      if (p) point[l.uai] = p.ips;
    }
    return point;
  });

  // Decile markers
  const tbMarkers: DecileMarker[] = [];
  const ipsMarkers: DecileMarker[] = [];
  for (const l of lycees) {
    const d = data.get(l.uai);
    const sn = shortName(l.nom);
    if (d?.niveau) tbMarkers.push({ nom: sn, decile: d.niveau.decile, color: l.color });
    if (d?.ips) ipsMarkers.push({ nom: sn, decile: d.ips.decile, color: l.color });
  }

  const hasTB = tbChartData.length > 0 && tbMarkers.length > 0;
  const hasIPS = ipsChartData.length > 0 && ipsMarkers.length > 0;

  if (!hasTB && !hasIPS) return null;

  return (
    <div className="lycee-detail">
      {hasTB && (
        <div className="lycee-detail-chart">
          <h5>Taux de mentions TB au Bac (%)</h5>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={tbChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="annee" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip
                formatter={(v: unknown, name: unknown) => {
                  const uai = String(name ?? '');
                  const lycee = lycees.find((l) => l.uai === uai);
                  return [`${Number(v).toFixed(1)}%`, lycee ? shortName(lycee.nom) : uai];
                }}
              />
              <Legend
                formatter={(uai: string) => {
                  const lycee = lycees.find((l) => l.uai === uai);
                  return lycee ? shortName(lycee.nom) : uai;
                }}
                wrapperStyle={{ fontSize: 11 }}
              />
              {lycees.map((l) => (
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
            </LineChart>
          </ResponsiveContainer>
          <DecileGauge markers={tbMarkers} label="parmi les lycées publics parisiens" />
        </div>
      )}

      {hasIPS && (
        <div className="lycee-detail-chart">
          <h5>Indice de Position Sociale (IPS)</h5>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={ipsChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="annee" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip
                formatter={(v: unknown, name: unknown) => {
                  const uai = String(name ?? '');
                  const lycee = lycees.find((l) => l.uai === uai);
                  return [Number(v).toFixed(1), lycee ? shortName(lycee.nom) : uai];
                }}
              />
              <Legend
                formatter={(uai: string) => {
                  const lycee = lycees.find((l) => l.uai === uai);
                  return lycee ? shortName(lycee.nom) : uai;
                }}
                wrapperStyle={{ fontSize: 11 }}
              />
              {lycees.map((l) => (
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
            </LineChart>
          </ResponsiveContainer>
          <DecileGauge markers={ipsMarkers} label="parmi les lycées publics parisiens" />
        </div>
      )}
    </div>
  );
}
