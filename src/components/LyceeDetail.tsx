// src/components/LyceeDetail.tsx
import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ComposedChart, Area, CartesianGrid,
} from 'recharts';
import { fetchNiveauScolaire, type NiveauScolaireResult } from '../services/niveauScolaireApi';
import { fetchIps, type IpsResult } from '../services/ipsApi';
import { DecileGauge } from './DecileGauge';
import './LyceeDetail.css';

interface LyceeDetailProps {
  uai: string;
  nom: string;
  onClose: () => void;
}

export function LyceeDetail({ uai, nom, onClose }: LyceeDetailProps) {
  const [niveau, setNiveau] = useState<NiveauScolaireResult | null>(null);
  const [ips, setIps] = useState<IpsResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setNiveau(null);
    setIps(null);

    Promise.allSettled([
      fetchNiveauScolaire(uai).then((result) => { if (result) setNiveau(result); }),
      fetchIps(uai).then((result) => { if (result) setIps(result); }),
    ]).finally(() => setLoading(false));
  }, [uai]);

  if (loading) {
    return (
      <div className="lycee-detail">
        <div className="lycee-detail-loading"><span /><span /><span /></div>
      </div>
    );
  }

  if (!niveau && !ips) return null;

  return (
    <div className="lycee-detail">
      <div className="lycee-detail-header">
        <h4 className="lycee-detail-title">{nom}</h4>
        <button className="lycee-detail-close" onClick={onClose} aria-label="Fermer">
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>

      {niveau && (
        <div className="lycee-detail-chart">
          <h5>Taux de mentions TB au Bac (%)</h5>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={niveau.history}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="annee" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} unit="%" />
              <Tooltip formatter={(v: unknown) => [`${Number(v).toFixed(1)}%`, 'Taux TB']} />
              <Line
                type="monotone"
                dataKey="tauxTB"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <DecileGauge decile={niveau.decile} label="parmi les lycées parisiens" />
        </div>
      )}

      {ips && (
        <div className="lycee-detail-chart">
          <h5>Indice de Position Sociale (IPS)</h5>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={ips.history.map((p) => ({
              ...p,
              ipsRange: [p.ips - p.ecartType, p.ips + p.ecartType],
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="annee" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
              <Tooltip formatter={(v: unknown, name: unknown) => {
                if (name !== 'ips') return null;
                return [Number(v).toFixed(1), 'IPS moyen'];
              }} />
              <Area
                type="monotone"
                dataKey="ipsRange"
                stroke="none"
                fill="#2563eb"
                fillOpacity={0.15}
              />
              <Line
                type="monotone"
                dataKey="ips"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <DecileGauge decile={ips.decile} label="parmi les lycées parisiens" />
        </div>
      )}
    </div>
  );
}
