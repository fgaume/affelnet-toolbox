import { useReducer, useEffect } from 'react';
import { CollegeAutocomplete } from './CollegeAutocomplete';
import { IpsGauge } from './IpsGauge';
import { fetchCollegeIps } from '../services/collegeApi';
import type { College, IpsInfo, ScolarisationStatus } from '../types';

interface ScolarisationSectionProps {
  collegeUai: string;
  scolarisation: ScolarisationStatus;
  onScolarisationChange: (status: ScolarisationStatus) => void;
  collegeScolarisation: College | null;
  onCollegeScolarisationChange: (college: College | null) => void;
}

type IpsState = {
  ipsInfo: IpsInfo | null;
  ipsLoading: boolean;
  ipsError: string | null;
};

type IpsAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; info: IpsInfo | null }
  | { type: 'FETCH_ERROR'; error: string }
  | { type: 'RESET' };

function ipsReducer(state: IpsState, action: IpsAction): IpsState {
  switch (action.type) {
    case 'FETCH_START':
      return { ipsInfo: null, ipsLoading: true, ipsError: null };
    case 'FETCH_SUCCESS':
      return { ipsInfo: action.info, ipsLoading: false, ipsError: action.info ? null : 'Données IPS non disponibles pour ce collège' };
    case 'FETCH_ERROR':
      return { ipsInfo: null, ipsLoading: false, ipsError: action.error };
    case 'RESET':
      return { ipsInfo: null, ipsLoading: false, ipsError: null };
    default:
      return state;
  }
}

export function ScolarisationSection({
  collegeUai,
  scolarisation,
  onScolarisationChange,
  collegeScolarisation,
  onCollegeScolarisationChange,
}: ScolarisationSectionProps) {
  const [ipsState, dispatch] = useReducer(ipsReducer, {
    ipsInfo: null,
    ipsLoading: false,
    ipsError: null,
  });

  useEffect(() => {
    const targetUai =
      scolarisation === 'same' ? collegeUai
      : scolarisation === 'other' && collegeScolarisation ? collegeScolarisation.uai
      : null;

    if (!targetUai) {
      dispatch({ type: 'RESET' });
      return;
    }

    dispatch({ type: 'FETCH_START' });
    fetchCollegeIps(targetUai)
      .then((info) => dispatch({ type: 'FETCH_SUCCESS', info }))
      .catch(() => dispatch({ type: 'FETCH_ERROR', error: 'Erreur lors du chargement des données IPS' }));
  }, [scolarisation, collegeScolarisation, collegeUai]);

  const handleScolarisationSame = () => {
    onScolarisationChange('same');
    onCollegeScolarisationChange(null);
  };

  const handleScolarisationOther = () => {
    onScolarisationChange('other');
    dispatch({ type: 'RESET' });
  };

  return (
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
          <button className="scolarisation-change" onClick={() => onScolarisationChange('pending')}>
            Modifier
          </button>
        </div>
      )}

      {scolarisation === 'other' && (
        <div className="scolarisation-other">
          <p className="scolarisation-other-label">Collège de scolarisation</p>
          <CollegeAutocomplete
            onSelect={onCollegeScolarisationChange}
            placeholder="Nom de votre collège de scolarisation..."
            includePrivate
          />
          {collegeScolarisation && (
            <div className="scolarisation-result" style={{ marginTop: 8 }}>
              <span className="scolarisation-badge scolarisation-badge-other">{collegeScolarisation.nom}</span>
              <button className="scolarisation-change" onClick={() => onScolarisationChange('pending')}>
                Modifier
              </button>
            </div>
          )}
        </div>
      )}

      {ipsState.ipsLoading && <p className="ips-loading">Chargement des données IPS...</p>}
      {ipsState.ipsError && <p className="ips-error">{ipsState.ipsError}</p>}
      {ipsState.ipsInfo && (
        <div className="ips-block">
          <div className="ips-summary">
            <div className="ips-value-block">
              <span className="ips-label">IPS du collège</span>
              <span className="ips-number">{ipsState.ipsInfo.ips.toFixed(1).replace('.', ',')}</span>
            </div>
            <div className="ips-value-block">
              <span className="ips-label">Bonus IPS Affelnet</span>
              <span className="ips-number">{ipsState.ipsInfo.bonus} pts</span>
            </div>
          </div>
          <IpsGauge ips={ipsState.ipsInfo.ips} />
        </div>
      )}
    </div>
  );
}
