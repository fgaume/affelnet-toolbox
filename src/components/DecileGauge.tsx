import './DecileGauge.css';

interface DecileGaugeProps {
  decile: number; // 1-10
  label: string;  // e.g. "parmi les lycées parisiens"
}

const COLORS = [
  '#dc2626', '#ef4444', '#f97316', '#fb923c', '#facc15',
  '#a3e635', '#4ade80', '#22c55e', '#16a34a', '#15803d',
];

export function DecileGauge({ decile, label }: DecileGaugeProps) {
  return (
    <div className="decile-gauge">
      <div className="decile-bar">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className={`decile-segment${i + 1 === decile ? ' active' : ''}`}
            style={{
              backgroundColor: i + 1 === decile ? COLORS[i] : undefined,
            }}
          />
        ))}
      </div>
      <span className="decile-label">
        {decile}<sup>e</sup> décile {label}
      </span>
    </div>
  );
}
