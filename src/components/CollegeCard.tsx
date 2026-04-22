import { useState, useEffect, useMemo } from 'react';
import type { SectorResult, LyceeSecteur, Address, College } from '../types';
import { fetchSeuils, getAdmissionDifficulty, type AdmissionDifficulty } from '../services/seuilsApi';
import { useEffectifs } from '../hooks/useEffectifs';
import { useCollegeEffectifs } from '../hooks/useCollegeEffectifs';
import { SectorMap } from './SectorMap';
import type { ScolarisationStatus } from '../types';
import { ScolarisationSection } from './ScolarisationSection';
import { LyceeListSection } from './LyceeListSection';
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
  level: 'hard',
};

interface CollegeCardProps {
  result: SectorResult;
  address?: Address;
  onClose?: () => void;
  scolarisation: ScolarisationStatus;
  onScolarisationChange: (status: ScolarisationStatus) => void;
  collegeScolarisation: College | null;
  onCollegeScolarisationChange: (college: College | null) => void;
}

export function CollegeCard({ result, address, onClose, scolarisation, onScolarisationChange, collegeScolarisation, onCollegeScolarisationChange }: CollegeCardProps) {
  const { college, lycees, lyceeError } = result;
  const [difficulties, setDifficulties] = useState<Map<string, AdmissionDifficulty>>(new Map());
  const { effectifs, isLoading: effectifsLoading, requestedCount } = useEffectifs(lycees ?? undefined);
  const { effectif: collegeEffectif } = useCollegeEffectifs(college.uai);
  const [activeSector, setActiveSector] = useState(1);

  // Filter lycees for the map based on active sector
  const lyceesForMap = useMemo(
    () => activeSector === 0
      ? TOUS_SECTEURS_LYCEES
      : lycees?.filter(l => l.secteur === activeSector) ?? [],
    [lycees, activeSector]
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
          {collegeEffectif && (
            <span className="college-effectif">{collegeEffectif.effectif} élèves en 3ème</span>
          )}
        </div>
        {onClose && (
          <button className="college-close-btn" onClick={onClose} aria-label="Fermer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {address && (
        <div className="address-searched">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          <span>{address.label}</span>
        </div>
      )}

      <ScolarisationSection
        collegeUai={college.uai}
        scolarisation={scolarisation}
        onScolarisationChange={onScolarisationChange}
        collegeScolarisation={collegeScolarisation}
        onCollegeScolarisationChange={onCollegeScolarisationChange}
      />

      {lycees && (
        <LyceeListSection
          lycees={lycees}
          effectifs={effectifs}
          effectifsLoading={effectifsLoading}
          requestedCount={requestedCount}
          difficulties={difficulties}
          uaiCollegeUtilisateur={college.uai}
          onSectorChange={setActiveSector}
        />
      )}

      <SectorMap
        homeCoords={address?.coordinates}
        college={college}
        lyceesActifs={lyceesForMap}
        lyceesTousSecteurs={activeSector === 0 || activeSector === 1 ? TOUS_SECTEURS_LYCEES : []}
        activeSector={activeSector}
      />

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
