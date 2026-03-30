import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useState, useEffect } from 'react';
import type { CollegeSecteur, LyceeSecteur } from '../types';
import 'leaflet/dist/leaflet.css';
import './SectorMap.css';

// Fix Leaflet marker icon issue in React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface SectorMapProps {
  homeCoords?: [number, number];
  college: CollegeSecteur;
  lyceesSecteur1: LyceeSecteur[];
  lyceesTousSecteurs: LyceeSecteur[];
}

// Custom icons with white stroke for visibility
const homeIcon = L.divIcon({
  html: `<svg viewBox="0 0 24 24" fill="#1e40af" width="30" height="30" stroke="white" stroke-width="1.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,
  className: 'custom-marker-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

const collegeIcon = L.divIcon({
  html: `<svg viewBox="0 0 24 24" width="30" height="30"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#16a34a" stroke="white" stroke-width="1.5"/><circle cx="12" cy="9" r="3.5" fill="white"/></svg>`,
  className: 'custom-marker-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

const lyceeIcon = L.divIcon({
  html: `<svg viewBox="0 0 24 24" fill="#9333ea" width="24" height="24" stroke="white" stroke-width="1"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>`,
  className: 'custom-marker-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24],
});

const tousSecteursIcon = L.divIcon({
  html: `<svg viewBox="0 0 24 24" fill="#ea580c" width="24" height="24" stroke="white" stroke-width="1"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>`,
  className: 'custom-marker-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24],
});

function MapInvalidator({ expanded }: { expanded: boolean }) {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 200);
  }, [expanded, map]);
  return null;
}

function MapResizer({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  
  useEffect(() => {
    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords.map(c => [c[1], c[0]]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [coords, map]);

  return null;
}

function getItineraryUrl(from: [number, number], to: [number, number]) {
  return `https://www.google.com/maps/dir/?api=1&origin=${from[1]},${from[0]}&destination=${to[1]},${to[0]}&travelmode=transit`;
}

export function SectorMap({ homeCoords, college, lyceesSecteur1, lyceesTousSecteurs }: SectorMapProps) {
  const [expanded, setExpanded] = useState(false);

  // Itinerary origin: home if available, otherwise college
  const itineraryOrigin: [number, number] | undefined = homeCoords ?? college.coordinates;
  const itineraryLabel = homeCoords ? 'depuis le domicile' : `depuis le collège ${college.nom}`;
  const allCoords: [number, number][] = [
    ...(homeCoords ? [homeCoords] : []),
    ...(college.coordinates ? [college.coordinates] : []),
    ...lyceesSecteur1.map(l => l.coordinates).filter((c): c is [number, number] => !!c),
    ...lyceesTousSecteurs.map(l => l.coordinates).filter((c): c is [number, number] => !!c)
  ];

  // Close on Escape
  useEffect(() => {
    if (!expanded) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [expanded]);

  // Center on home if available, otherwise on college, otherwise Paris default
  const centerCoords: [number, number] = homeCoords ?? college.coordinates ?? [2.3488, 48.8534];

  return (
    <div className={`sector-map-container${expanded ? ' expanded' : ''}`}>
      <button
        className="map-expand-btn"
        onClick={() => setExpanded(!expanded)}
        aria-label={expanded ? 'Réduire la carte' : 'Agrandir la carte'}
        title={expanded ? 'Réduire' : 'Agrandir'}
      >
        {expanded ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        )}
      </button>
      <MapContainer
        center={[centerCoords[1], centerCoords[0]]}
        zoom={14}
        scrollWheelZoom={false}
        className="sector-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {homeCoords && (
          <Marker position={[homeCoords[1], homeCoords[0]]} icon={homeIcon}>
            <Popup>Votre domicile</Popup>
          </Marker>
        )}

        {college.coordinates && (
          <Marker position={[college.coordinates[1], college.coordinates[0]]} icon={collegeIcon}>
            <Popup>
              <strong>Collège de secteur</strong><br />
              {college.nom}
              {homeCoords && (
                <div className="popup-itinerary">
                  <a href={getItineraryUrl(homeCoords, college.coordinates)} target="_blank" rel="noopener noreferrer">
                    Itinéraire {itineraryLabel}
                  </a>
                </div>
              )}
            </Popup>
          </Marker>
        )}

        {lyceesSecteur1.map(lycee => lycee.coordinates && (
          <Marker
            key={lycee.uai}
            position={[lycee.coordinates[1], lycee.coordinates[0]]}
            icon={lyceeIcon}
          >
            <Popup>
              <strong>Lycée de secteur 1</strong><br />
              {lycee.nom}
              <div className="popup-itinerary">
                <a href={`https://data.education.gouv.fr/pages/fiche-etablissement/?code_etab=${lycee.uai}`} target="_blank" rel="noopener noreferrer">
                  Voir la fiche officielle
                </a>
              </div>
              {itineraryOrigin && (
                <div className="popup-itinerary">
                  <a href={getItineraryUrl(itineraryOrigin, lycee.coordinates)} target="_blank" rel="noopener noreferrer">
                    Itinéraire {itineraryLabel}
                  </a>
                </div>
              )}
            </Popup>
          </Marker>
        ))}

        {lyceesTousSecteurs.map(lycee => lycee.coordinates && (
          <Marker
            key={lycee.uai}
            position={[lycee.coordinates[1], lycee.coordinates[0]]}
            icon={tousSecteursIcon}
          >
            <Popup>
              <strong>Lycée tous secteurs</strong><br />
              {lycee.nom}
              <div className="popup-itinerary">
                <a href={`https://data.education.gouv.fr/pages/fiche-etablissement/?code_etab=${lycee.uai}`} target="_blank" rel="noopener noreferrer">
                  Voir la fiche officielle
                </a>
              </div>
              {itineraryOrigin && (
                <div className="popup-itinerary">
                  <a href={getItineraryUrl(itineraryOrigin, lycee.coordinates)} target="_blank" rel="noopener noreferrer">
                    Itinéraire {itineraryLabel}
                  </a>
                </div>
              )}
            </Popup>
          </Marker>
        ))}

        <MapResizer coords={allCoords} />
        <MapInvalidator expanded={expanded} />
      </MapContainer>
      
      <div className="map-legend">
        {homeCoords && <div className="legend-item"><span className="legend-dot home"></span> Domicile</div>}
        <div className="legend-item"><span className="legend-dot college"></span> Collège</div>
        <div className="legend-item"><span className="legend-dot lycee"></span> Lycée Secteur 1</div>
        <div className="legend-item"><span className="legend-dot tous"></span> Tous secteurs</div>
      </div>
    </div>
  );
}
