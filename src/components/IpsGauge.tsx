import { IPS_THRESHOLDS, IPS_DEFAULT_BONUS } from '../services/ipsConstants';
import './IpsGauge.css';

interface IpsGaugeProps {
  ips: number;
}

const IPS_MIN = 60;
const IPS_MAX = 160;
const IPS_RANGE = IPS_MAX - IPS_MIN;

const SEGMENTS = [
  { from: IPS_MIN, to: IPS_THRESHOLDS[0].maxIps, bonus: IPS_THRESHOLDS[0].bonus, color: '#166534' },
  { from: IPS_THRESHOLDS[0].maxIps, to: IPS_THRESHOLDS[1].maxIps, bonus: IPS_THRESHOLDS[1].bonus, color: '#22c55e' },
  { from: IPS_THRESHOLDS[1].maxIps, to: IPS_THRESHOLDS[2].maxIps, bonus: IPS_THRESHOLDS[2].bonus, color: '#eab308' },
  { from: IPS_THRESHOLDS[2].maxIps, to: IPS_MAX, bonus: IPS_DEFAULT_BONUS, color: '#ef4444' },
];

function ipsToPercent(ips: number): number {
  return Math.max(0, Math.min(100, ((ips - IPS_MIN) / IPS_RANGE) * 100));
}

export function IpsGauge({ ips }: IpsGaugeProps) {
  const markerPercent = ipsToPercent(ips);
  const thresholdPercents = IPS_THRESHOLDS.map((t) => ipsToPercent(t.maxIps));

  const valueTop = 12;

  return (
    <div className="ips-gauge">
      <p className="ips-gauge-title">Position IPS par rapport aux seuils de bonus</p>

      <div className="ips-gauge-bar-container">
        {/* Gauge bar */}
        <div style={{ height: 34, display: 'flex', borderRadius: 8, overflow: 'hidden', fontSize: 12, fontWeight: 700, color: 'white' }}>
          {SEGMENTS.map((seg) => (
            <div
              key={seg.bonus}
              style={{
                flex: seg.to - seg.from,
                background: seg.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: seg.color === '#eab308' ? '#422006' : 'white',
              }}
            >
              {seg.bonus}
            </div>
          ))}
        </div>

        {/* Vertical marker */}
        <div className="ips-gauge-marker" style={{ left: `${markerPercent}%` }} />
      </div>

      {/* Labels below the gauge */}
      <div className="ips-gauge-labels">
        {/* College IPS marker: triangle only */}
        <div className="ips-gauge-college-label" style={{ left: `${markerPercent}%` }}>
          <div className="ips-gauge-triangle" />
        </div>

        {/* Threshold values */}
        {IPS_THRESHOLDS.map((t, i) => (
          <span
            key={t.maxIps}
            className="ips-gauge-threshold"
            style={{ left: `${thresholdPercents[i]}%`, top: valueTop }}
          >
            {t.maxIps.toFixed(1).replace('.', ',')}
          </span>
        ))}
      </div>
    </div>
  );
}
