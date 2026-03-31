import type { CollegeConcurrent } from "../services/collegesConcurrenceApi";

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  uaiToName: Map<string, string>;
}

export interface BarDataPoint {
  bonusLabel: string;
  bonusIps: number;
  total: number;
  colleges: CollegeConcurrent[];
}

export function CustomTooltip({
  active,
  payload,
  uaiToName,
}: CustomTooltipProps) {
  if (!active || !payload?.[0]) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (payload[0] as any).payload as BarDataPoint;
  const segments = payload.filter((p) => p.value > 0);
  const total = segments.reduce((sum, p) => sum + p.value, 0);

  return (
    <div className="concurrence-tooltip">
      <div className="concurrence-tooltip-title">{data.bonusLabel}</div>
      {segments.map((p) => (
        <div key={p.name} className="concurrence-tooltip-row">
          <span>{uaiToName.get(p.name) ?? p.name}</span>
          <span className="concurrence-tooltip-value">~ {p.value} élèves</span>
        </div>
      ))}
      <div className="concurrence-tooltip-total">Total : ~ {total} élèves</div>
    </div>
  );
}
