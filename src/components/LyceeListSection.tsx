import { useState, useMemo } from 'react';
import type { LyceeSecteur, EffectifLycee } from '../types';
import type { AdmissionDifficulty } from '../services/seuilsApi';
import { EffectifsDonut, EffectifsLoading } from './EffectifsDonut';
import { LyceesIndicateurs } from './LyceeDetail';
import { CollegesConcurrence } from './CollegesConcurrence';

const FICHE_RECTORAT_URL =
  'https://data.education.gouv.fr/pages/fiche-etablissement/?code_etab=';

const TOUS_SECTEURS_LYCEES: LyceeSecteur[] = [
  { uai: '0750654D', nom: 'HENRI IV', secteur: 0, coordinates: [2.3473, 48.8464] },
  { uai: '0750655E', nom: 'LOUIS LE GRAND', secteur: 0, coordinates: [2.3443, 48.8475] },
  { uai: '0750685M', nom: 'P.G. DE GENNES', secteur: 0, coordinates: [2.3483, 48.8410] },
];

interface LyceeListSectionProps {
  lycees: LyceeSecteur[];
  effectifs: EffectifLycee[];
  effectifsLoading: boolean;
  requestedCount?: number;
  difficulties: Map<string, AdmissionDifficulty>;
  uaiCollegeUtilisateur: string;
  onSectorChange?: (sector: number) => void;
}

export function LyceeListSection({
  lycees,
  effectifs,
  effectifsLoading,
  requestedCount,
  difficulties,
  uaiCollegeUtilisateur,
  onSectorChange,
}: LyceeListSectionProps) {
  const [activeSector, setActiveSector] = useState(1);

  const handleSectorChange = (sector: number) => {
    setActiveSector(sector);
    onSectorChange?.(sector);
  };
  const [expandedLycee, setExpandedLycee] = useState<string | null>(null);

  const lyceesBySector = useMemo(() => {
    return [...lycees]
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
      .reduce<Record<number, LyceeSecteur[]>>((acc, lycee) => {
        (acc[lycee.secteur] ??= []).push(lycee);
        return acc;
      }, {});
  }, [lycees]);

  const availableSectors = [1, 0, 2, 3].filter((s) => s === 0 || lyceesBySector[s]?.length);
  const sectorLabel = (s: number) => (s === 0 ? 'Tous secteurs' : `Secteur ${s}`);
  const activeLycees = activeSector === 0 ? TOUS_SECTEURS_LYCEES : lyceesBySector[activeSector] ?? [];
  const newLyceeUais = new Set(lycees.filter((l) => l.isNew).map((l) => l.uai));

  const lyceesIndicateursData = useMemo(
    () =>
      effectifs.map((e) => ({
        uai: e.uai,
        nom: e.nom,
        color: difficulties.get(e.uai)?.color ?? '#9ca3af',
      })),
    [effectifs, difficulties]
  );

  return (
    <div className="lycees-section">
      <h3 className="lycees-title">Lycées de secteur</h3>
      <div className="sector-tabs">
        {availableSectors.map((secteur) => (
          <button
            key={secteur}
            className={`sector-tab${activeSector === secteur ? ' active' : ''}`}
            onClick={() => handleSectorChange(secteur)}
          >
            {sectorLabel(secteur)}
          </button>
        ))}
      </div>

      {activeSector === 1 && effectifsLoading && <EffectifsLoading />}
      {activeSector === 1 && effectifs.length > 0 && (
        <EffectifsDonut
          effectifs={effectifs}
          difficulties={difficulties}
          requestedCount={requestedCount}
          newLyceeUais={newLyceeUais}
        />
      )}

      {activeSector === 1 && difficulties.size > 0 && (
        <div className="difficulty-legend">
          <span className="legend-title">Difficulté d'admission sans bonus IPS :</span>
          <div className="legend-items">
            {([
              ['#1a1a1a', 'Inaccessible'],
              ['#dc2626', 'Difficile'],
              ['#f97316', 'Moyen'],
              ['#2563eb', 'Accessible'],
              ['#16a34a', 'Très accessible'],
            ] as const).map(([color, label]) => (
              <span key={color} className="legend-item">
                <span className="difficulty-badge" style={{ backgroundColor: color }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {activeSector === 1 && effectifs.length > 0 && (
        <LyceesIndicateurs lycees={lyceesIndicateursData} />
      )}

      {activeSector !== 1 && (
        <ul className="lycee-list">
          {activeLycees.map((lycee) => {
            const diff = activeSector === 0 ? difficulties.get(lycee.uai) : undefined;
            return (
              <li key={lycee.uai} className="lycee-item">
                {diff && (
                  <span
                    className="difficulty-badge"
                    style={{ backgroundColor: diff.color }}
                    title={diff.label}
                  />
                )}
                <a
                  href={`${FICHE_RECTORAT_URL}${lycee.uai}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="etablissement-link lycee-name"
                >
                  {lycee.nom}
                </a>
                {newLyceeUais.has(lycee.uai) && <span className="new-sector-badge">Nouveau</span>}
                {diff && <span className="difficulty-label">{diff.label}</span>}
              </li>
            );
          })}
        </ul>
      )}

      {activeSector === 0 && difficulties.size > 0 && (
        <div className="difficulty-legend">
          <span className="legend-title">Difficulté d'admission sans bonus IPS :</span>
          <div className="legend-items">
            {([
              ['#1a1a1a', 'Inaccessible'],
              ['#dc2626', 'Difficile'],
              ['#f97316', 'Moyen'],
              ['#2563eb', 'Accessible'],
              ['#16a34a', 'Très accessible'],
            ] as const).map(([color, label]) => (
              <span key={color} className="legend-item">
                <span className="difficulty-badge" style={{ backgroundColor: color }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {activeSector === 1 && effectifs.length > 0 && (
        <div className="concurrence-section">
          <h5 className="concurrence-section-title">Collèges en concurrence</h5>
          <ul className="concurrence-lycee-list">
            {effectifs.map((e) => {
              const diff = difficulties.get(e.uai);
              return (
                <li key={e.uai}>
                  <button
                    className={`concurrence-lycee-btn${expandedLycee === e.uai ? ' expanded' : ''}`}
                    onClick={() => setExpandedLycee(expandedLycee === e.uai ? null : e.uai)}
                  >
                    {diff && (
                      <span
                        className="difficulty-badge"
                        style={{ backgroundColor: diff.color }}
                        title={diff.label}
                      />
                    )}
                    <span className="concurrence-lycee-name">{e.nom}</span>
                    <svg className="concurrence-chevron" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
                    </svg>
                  </button>
                  {expandedLycee === e.uai && (
                    <CollegesConcurrence uaiLycee={e.uai} nomLycee={e.nom} uaiCollegeUtilisateur={uaiCollegeUtilisateur} />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
