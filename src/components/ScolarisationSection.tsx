import { useState, useEffect } from 'react';
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

export function ScolarisationSection({
  collegeUai,
  scolarisation,
  onScolarisationChange,
  collegeScolarisation,
  onCollegeScolarisationChange,
}: ScolarisationSectionProps) {
  const [ipsInfo, setIpsInfo] = useState<IpsInfo | null>(null);
  const [ipsLoading, setIpsLoading] = useState(false);
  const [ipsError, setIpsError] = useState<string | null>(null);

  useEffect(() => {
    const targetUai =
      scolarisation === 'same' ? collegeUai
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
  }, [scolarisation, collegeScolarisation, collegeUai]);

  const handleScolarisationSame = () => {
    onScolarisationChange('same');
    onCollegeScolarisationChange(null);
  };

  const handleScolarisationOther = () => {
    onScolarisationChange('other');
    setIpsInfo(null);
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
  );
}
