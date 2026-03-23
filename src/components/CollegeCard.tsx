import type { College } from '../types';
import './CollegeCard.css';

interface CollegeCardProps {
  college: College;
  addressLabel?: string;
}

export function CollegeCard({ college, addressLabel }: CollegeCardProps) {
  const mapsUrl = college.latitude && college.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${college.latitude},${college.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${college.adresse}, ${college.codePostal} ${college.commune}`
      )}`;

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
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <div>
            <span className="detail-label">Adresse</span>
            <span className="detail-value">
              {college.adresse}
              <br />
              {college.codePostal} {college.commune}
            </span>
          </div>
        </div>

        {college.telephone && (
          <div className="detail-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <div>
              <span className="detail-label">Telephone</span>
              <a href={`tel:${college.telephone}`} className="detail-value link">
                {college.telephone}
              </a>
            </div>
          </div>
        )}

        {college.email && (
          <div className="detail-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <div>
              <span className="detail-label">Email</span>
              <a href={`mailto:${college.email}`} className="detail-value link">
                {college.email}
              </a>
            </div>
          </div>
        )}

        {college.siteWeb && (
          <div className="detail-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <div>
              <span className="detail-label">Site web</span>
              <a
                href={college.siteWeb.startsWith('http') ? college.siteWeb : `https://${college.siteWeb}`}
                target="_blank"
                rel="noopener noreferrer"
                className="detail-value link"
              >
                Visiter le site
              </a>
            </div>
          </div>
        )}

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

      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="maps-button">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>
        Voir sur Google Maps
      </a>
    </div>
  );
}
