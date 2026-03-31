import React, { useEffect, useState, useMemo } from 'react';
import { findLyceesDeSecteur } from '../services/sectorApi';
import { fetchSeuils } from '../services/seuilsApi';
import type { LyceeSecteur } from '../types';
import './AdmissionGauge.css';

interface AdmissionGaugeProps {
  userScore: number;
  collegeUai?: string;
}

const SCORE_MIN = 30000;
const SCORE_MAX = 41000;
const SCORE_RANGE = SCORE_MAX - SCORE_MIN;

function scoreToPercent(score: number): number {
  return Math.max(0, Math.min(100, ((score - SCORE_MIN) / SCORE_RANGE) * 100));
}

const AdmissionGauge: React.FC<AdmissionGaugeProps> = ({ userScore, collegeUai }) => {
  const [lycees, setLycees] = useState<LyceeSecteur[]>([]);
  const [seuils, setSeuils] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!collegeUai) return;

    setIsLoading(true);
    Promise.all([
      findLyceesDeSecteur(collegeUai),
      fetchSeuils()
    ]).then(([sectorLycees, allSeuils]) => {
      // Keep only sector 1 lycees for this gauge
      setLycees(sectorLycees.filter(l => l.secteur === 1));
      setSeuils(allSeuils);
    }).catch(err => {
      console.error('Error loading gauge data:', err);
    }).finally(() => {
      setIsLoading(false);
    });
  }, [collegeUai]);

  const userPercent = scoreToPercent(userScore);

  const lyceeMarkers = useMemo(() => {
    // Sort lycees by seuil to correctly alternate positions
    const sortedWithSeuils = lycees
      .map(lycee => ({ lycee, seuil: seuils.get(lycee.uai) }))
      .filter((item): item is { lycee: LyceeSecteur; seuil: number } => item.seuil !== undefined)
      .sort((a, b) => a.seuil - b.seuil);

    return sortedWithSeuils.map((item, index) => ({
      uai: item.lycee.uai,
      nom: item.lycee.nom,
      seuil: item.seuil,
      percent: scoreToPercent(item.seuil),
      admitted: userScore >= item.seuil,
      position: index % 2 === 0 ? 'below' : 'above'
    }));
  }, [lycees, seuils, userScore]);

  if (!collegeUai) {
    return (
      <div className="admission-gauge-placeholder">
        Recherchez votre collège pour voir vos chances d'admission
      </div>
    );
  }

  if (isLoading) {
    return <div className="admission-gauge-loading">Chargement des seuils d'admission...</div>;
  }

  return (
    <div className="admission-gauge">
      <h3 className="admission-gauge-title">Chances d'admission (Secteur 1)</h3>
      <p className="admission-gauge-subtitle">Basé sur les seuils d'admission 2025</p>
      
      <div className="gauge-container">
        <div className="gauge-axis">
          {/* Main axis line */}
          <div className="axis-line" />
          
          {/* Lycee markers */}
          {lyceeMarkers.map(marker => (
            <div 
              key={marker.uai} 
              className={`lycee-marker ${marker.admitted ? 'admitted' : 'not-admitted'} position-${marker.position}`}
              style={{ left: `${marker.percent}%` }}
            >
              <div className="marker-tick" />
              <div className="marker-label">
                <span className="marker-name">{marker.nom}</span>
                <span className="marker-value">{marker.seuil}</span>
              </div>
            </div>
          ))}
          
          {/* User score pointer */}
          <div 
            className="user-pointer" 
            style={{ left: `${userPercent}%` }}
          >
            <div className="pointer-arrow" />
          </div>
        </div>
      </div>

      <div className="admission-summary">
        {lyceeMarkers.length > 0 ? (
          <p>
            Vous seriez admis dans <strong>{lyceeMarkers.filter(m => m.admitted).length}</strong> lycée(s) sur {lyceeMarkers.length} en secteur 1.
          </p>
        ) : (
          <p>Aucun seuil d'admission disponible pour vos lycées de secteur 1.</p>
        )}
      </div>
    </div>
  );
};

export default AdmissionGauge;
