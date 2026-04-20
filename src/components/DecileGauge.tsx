import './DecileGauge.css';

export interface DecileMarker {
  nom: string;
  decile: number;
  color: string;
}

interface DecileGaugeProps {
  markers: DecileMarker[];
  label: string;
}

const SEGMENT_COLORS = [
  '#dc2626', '#ef4444', '#d97706', '#fb923c', '#facc15',
  '#a3e635', '#4ade80', '#22c55e', '#16a34a', '#15803d',
];

export function DecileGauge({ markers, label }: DecileGaugeProps) {
  // Group markers by decile for positioning
  const byDecile = new Map<number, DecileMarker[]>();
  for (const m of markers) {
    const list = byDecile.get(m.decile) ?? [];
    list.push(m);
    byDecile.set(m.decile, list);
  }

  return (
    <div className="decile-gauge">
      <div className="decile-bar">
        {Array.from({ length: 10 }, (_, i) => {
          const segmentMarkers = byDecile.get(i + 1);
          const hasMarker = !!segmentMarkers;
          return (
            <div
              key={i}
              className={`decile-segment${hasMarker ? ' active' : ''}`}
              style={{
                backgroundColor: hasMarker ? SEGMENT_COLORS[i] : undefined,
              }}
            >
              {segmentMarkers && (
                <div className="decile-markers">
                  {segmentMarkers.map((m) => (
                    <span
                      key={m.nom}
                      className="decile-marker"
                      style={{ borderColor: m.color }}
                      title={`${m.nom} — ${m.decile}e décile`}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="decile-legend">
        {markers.map((m) => (
          <span key={m.nom} className="decile-legend-item">
            <span className="decile-legend-dot" style={{ backgroundColor: m.color }} />
            {m.nom}: {m.decile}<sup>e</sup>
          </span>
        ))}
        <span className="decile-legend-label">{label}</span>
      </div>
    </div>
  );
}
