import { useState, useEffect, useMemo } from 'react';
import type { SectorResult, LyceeSecteur, Address, College, IpsInfo } from '../types';
import { fetchCollegeIps } from '../services/collegeApi';
import { CollegeAutocomplete } from './CollegeAutocomplete';
import { IpsGauge } from './IpsGauge';
import { fetchSeuils, getAdmissionDifficulty, type AdmissionDifficulty } from '../services/seuilsApi';
import { useEffectifs } from '../hooks/useEffectifs';
import { EffectifsDonut, EffectifsLoading } from './EffectifsDonut';
import { LyceesIndicateurs } from './LyceeDetail';
import { CollegesConcurrence } from './CollegesConcurrence';
import { SectorMap } from './SectorMap';
import './CollegeCard.css';

const FICHE_RECTORAT_URL =
  'https://data.education.gouv.fr/pages/fiche-etablissement/?code_etab=';

const TOUS_SECTEURS_LYCEES: LyceeSecteur[] = [
  { uai: '0750654D', nom: 'HENRI IV', secteur: 0, coordinates: [2.3473, 48.8464] },
  { uai: '0750655E', nom: 'LOUIS LE GRAND', secteur: 0, coordinates: [2.3443, 48.8475] },
  { uai: '0750685M', nom: 'P.G. DE GENNES', secteur: 0, coordinates: [2.3483, 48.8410] },
];

const DIFFICULTY_HARD: AdmissionDifficulty = {
  color: '#dc2626',
  label: 'Difficilement accessible',
  seuil: 0,
};

interface CollegeCardProps {
  result: SectorResult;
  address?: Address;
}

export function CollegeCard({ result, address }: CollegeCardProps) {
  const { college, lycees, lyceeError } = result;
  const [activeSector, setActiveSector] = useState(1);
  const [difficulties, setDifficulties] = useState<Map<string, AdmissionDifficulty>>(new Map());
  const { effectifs, isLoading: effectifsLoading, requestedCount } = useEffectifs(lycees ?? undefined);
  const [expandedLycee, setExpandedLycee] = useState<string | null>(null);
  const [scolarisation, setScolarisation] = useState<'pending' | 'same' | 'other'>('pending');
  const [collegeScolarisation, setCollegeScolarisation] = useState<College | null>(null);
  const [ipsInfo, setIpsInfo] = useState<IpsInfo | null>(null);
  const [ipsLoading, setIpsLoading] = useState(false);
  const [ipsError, setIpsError] = useState<string | null>(null);

  // Memoize lycees prop for LyceesIndicateurs to avoid re-fetching on unrelated re-renders
  const lyceesIndicateursData = useMemo(
    () => effectifs.map((e) => ({
      uai: e.uai,
      nom: e.nom,
      color: difficulties.get(e.uai)?.color ?? '#9ca3af',
    })),
    [effectifs, difficulties],
  );

  // Filter lycees of sector 1 for the map
  const lyceesSecteur1 = useMemo(
    () => lycees?.filter(l => l.secteur === 1) ?? [],
    [lycees]
  );

  // Fetch seuils once and compute difficulties for displayed lycées + tous secteurs
  useEffect(() => {
    if (!lycees) return;
    fetchSeuils()
      .then((seuils) => {
        const map = new Map<string, AdmissionDifficulty>();
        for (const lycee of [...lycees, ...TOUS_SECTEURS_LYCEES]) {
          const seuil = seuils.get(lycee.uai);
          if (seuil != null && seuil > 0) {
            map.set(lycee.uai, getAdmissionDifficulty(seuil));
          }
        }
        // Henri IV & Louis Le Grand have no scores → force hard difficulty
        for (const lycee of TOUS_SECTEURS_LYCEES) {
          if (!map.has(lycee.uai)) {
            map.set(lycee.uai, DIFFICULTY_HARD);
          }
        }
        setDifficulties(map);
      })
      .catch(() => {
        // Silently ignore — badges just won't show
      });
  }, [lycees]);

  // Fetch IPS when scolarisation college is determined
  useEffect(() => {
    const targetUai =
      scolarisation === 'same' ? college.uai
      : scolarisation === 'other' && collegeScolarisation ? collegeScolarisation.uai
      : null;

    if (!targetUai) {
      setIpsInfo(null);
      return;
    }

    setIpsLoading(true);
    setIpsError(null);
    fetchCollegeIps(targetUai)
      .then((info) => {
        setIpsInfo(info);
        if (!info) setIpsError('Données IPS non disponibles pour ce collège');
      })
      .catch(() => setIpsError('Erreur lors du chargement des données IPS'))
      .finally(() => setIpsLoading(false));
  }, [scolarisation, collegeScolarisation, college.uai]);

  const handleScolarisationSame = () => {
    setScolarisation('same');
    setCollegeScolarisation(null);
  };

  const handleScolarisationOther = () => {
    setScolarisation('other');
    setIpsInfo(null);
  };

  const handleCollegeScolarisationSelect = (c: College) => {
    setCollegeScolarisation(c);
  };

  // Group lycees by sector, sorted alphabetically
  const lyceesBySector = lycees
    ? [...lycees]
        .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
        .reduce<Record<number, typeof lycees>>((acc, lycee) => {
          (acc[lycee.secteur] ??= []).push(lycee);
          return acc;
        }, {})
    : null;

  const availableSectors = lyceesBySector
    ? [1, 0, 2, 3].filter((s) => s === 0 || lyceesBySector[s]?.length)
    : [];

  const sectorLabel = (s: number) => s === 0 ? 'Tous secteurs' : `Secteur ${s}`;

  const activeLycees = activeSector === 0
    ? TOUS_SECTEURS_LYCEES
    : lyceesBySector?.[activeSector] ?? [];

  const newLyceeUais = new Set(
    lycees?.filter((l) => l.isNew).map((l) => l.uai) ?? []
  );

  return (
    <div className="college-card">
      <div className="college-header">
        <div className="college-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
          </svg>
        </div>
        <div className="college-title">
          <span className="label">Votre collège de secteur</span>
          <h2>
            <a
              href={`${FICHE_RECTORAT_URL}${college.uai}`}
              target="_blank"
              rel="noopener noreferrer"
              className="etablissement-link"
            >
              {college.nom}
            </a>
          </h2>
          <span className="uai-badge">{college.uai}</span>
        </div>
      </div>

      {address && (
        <div className="address-searched">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          <span>{address.label}</span>
        </div>
      )}

      {/* Scolarisation question */}
      <div className="scolarisation-section">
        {scolarisation === 'pending' && (
          <div className="scolarisation-question">
            <p className="scolarisation-label">Êtes-vous scolarisé(e) dans ce collège ?</p>
            <div className="scolarisation-buttons">
              <button className="scolarisation-btn scolarisation-btn-yes" onClick={handleScolarisationSame}>
                Oui
              </button>
              <button className="scolarisation-btn scolarisation-btn-no" onClick={handleScolarisationOther}>
                Non
              </button>
            </div>
          </div>
        )}

        {scolarisation === 'same' && (
          <div className="scolarisation-result">
            <span className="scolarisation-badge">Secteur · Scolarisation</span>
            <button className="scolarisation-change" onClick={() => setScolarisation('pending')}>
              Modifier
            </button>
          </div>
        )}

        {scolarisation === 'other' && (
          <div className="scolarisation-other">
            <p className="scolarisation-other-label">Collège de scolarisation</p>
            <CollegeAutocomplete
              onSelect={handleCollegeScolarisationSelect}
              placeholder="Nom de votre collège de scolarisation..."
            />
            {collegeScolarisation && (
              <div className="scolarisation-result" style={{ marginTop: 8 }}>
                <span className="scolarisation-badge scolarisation-badge-other">{collegeScolarisation.nom}</span>
                <button className="scolarisation-change" onClick={() => setScolarisation('pending')}>
                  Modifier
                </button>
              </div>
            )}
          </div>
        )}

        {/* IPS display */}
        {ipsLoading && <p className="ips-loading">Chargement des données IPS...</p>}
        {ipsError && <p className="ips-error">{ipsError}</p>}
        {ipsInfo && (
          <div className="ips-block">
            <div className="ips-summary">
              <div className="ips-value-block">
                <span className="ips-label">IPS du collège</span>
                <span className="ips-number">{ipsInfo.ips.toFixed(1).replace('.', ',')}</span>
              </div>
              <div className="ips-value-block">
                <span className="ips-label">Bonus IPS Affelnet</span>
                <span className="ips-number">{ipsInfo.bonus} pts</span>
              </div>
            </div>
            <IpsGauge ips={ipsInfo.ips} />
          </div>
        )}
      </div>

      {lyceesBySector && availableSectors.length > 0 && (
        <div className="lycees-section">
          <h3 className="lycees-title">Lycées de secteur</h3>
          <div className="sector-tabs">
            {availableSectors.map((secteur) => (
              <button
                key={secteur}
                className={`sector-tab${activeSector === secteur ? ' active' : ''}`}
                onClick={() => setActiveSector(secteur)}
              >
                {sectorLabel(secteur)}
              </button>
            ))}
          </div>
          {activeSector === 1 && effectifsLoading && <EffectifsLoading />}
          {activeSector === 1 && effectifs.length > 0 && (
            <EffectifsDonut effectifs={effectifs} difficulties={difficulties} requestedCount={requestedCount} newLyceeUais={newLyceeUais} />
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
            <LyceesIndicateurs
              lycees={lyceesIndicateursData}
            />
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
                    {newLyceeUais.has(lycee.uai) && (
                      <span className="new-sector-badge">Nouveau</span>
                    )}
                    {diff && (
                      <span className="difficulty-label">{diff.label}</span>
                    )}
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
        </div>
      )}

      {address && (
        <SectorMap 
          homeCoords={address.coordinates}
          college={college}
          lyceesSecteur1={lyceesSecteur1}
          lyceesTousSecteurs={TOUS_SECTEURS_LYCEES}
        />
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
                  <svg
                    className="concurrence-chevron"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
                  </svg>
                </button>
                {expandedLycee === e.uai && (
                  <CollegesConcurrence
                    uaiLycee={e.uai}
                    uaiCollegeUtilisateur={college.uai}
                  />
                )}
              </li>
              );
            })}
          </ul>
        </div>
      )}

      {lyceeError && (
        <div className="lycee-error">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          <span>{lyceeError}</span>
        </div>
      )}
    </div>
  );
}
