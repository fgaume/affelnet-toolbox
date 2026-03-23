import type { SectorResult } from '../types';
import './CollegeCard.css';

interface CollegeCardProps {
  result: SectorResult;
  addressLabel?: string;
}

export function CollegeCard({ result, addressLabel }: CollegeCardProps) {
  const { college, lycees, lyceeError } = result;

  // Group lycees by sector
  const lyceesBySector = lycees
    ? lycees.reduce<Record<number, typeof lycees>>((acc, lycee) => {
        (acc[lycee.secteur] ??= []).push(lycee);
        return acc;
      }, {})
    : null;

  return (
    <div className="college-card">
      <div className="college-header">
        <div className="college-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
          </svg>
        </div>
        <div className="college-title">
          <span className="label">Votre college de secteur</span>
          <h2>{college.nom}</h2>
        </div>
      </div>

      {addressLabel && (
        <div className="address-searched">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          <span>{addressLabel}</span>
        </div>
      )}

      <div className="college-details">
        <div className="detail-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <div>
            <span className="detail-label">Code UAI</span>
            <span className="detail-value">{college.uai}</span>
          </div>
        </div>
      </div>

      {lyceesBySector && (
        <div className="lycees-section">
          <h3 className="lycees-title">Lycees de secteur</h3>
          {[1, 2, 3].map((secteur) => {
            const lyceesInSector = lyceesBySector[secteur];
            if (!lyceesInSector?.length) return null;
            return (
              <div key={secteur} className="sector-group">
                <h4 className="sector-label">Secteur {secteur}</h4>
                <ul className="lycee-list">
                  {lyceesInSector.map((lycee) => (
                    <li key={lycee.uai} className="lycee-item">
                      <span className="lycee-name">{lycee.nom}</span>
                      <span className="lycee-uai">{lycee.uai}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
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
