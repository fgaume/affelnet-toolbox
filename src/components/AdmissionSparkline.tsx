import { LineChart, Line, Tooltip, YAxis } from 'recharts';
import { linearRegression } from '../services/trendCalculation';
import { SEUIL_YEARS } from '../services/seuilsApi';

interface AdmissionSparklineProps {
  readonly seuils: readonly number[];
}

function AdmissionSparkline({ seuils }: AdmissionSparklineProps) {
  const { trendLine, slope } = linearRegression(seuils);
  const trendColor = slope <= 0 ? '#16a34a' : '#dc2626';

  const chartData = SEUIL_YEARS.map((year, i) => ({
    year,
    seuil: seuils[i] ?? null,
    trend: trendLine[i] ?? null,
  }));

  return (
    <LineChart width={160} height={60} data={chartData}>
      <YAxis domain={['dataMin - 50', 'dataMax + 50']} hide />
      <Tooltip
        content={({ active, payload }) => {
          if (!active || !payload?.length) return null;
          const entry = payload.find(p => p.dataKey === 'seuil');
          if (!entry) return null;
          const year = entry.payload?.year;
          return (
            <div style={{ background: 'var(--color-bg-card, #fff)', border: '1px solid var(--color-border, #ddd)', borderRadius: 6, padding: '4px 8px', fontSize: 12 }}>
              <div style={{ fontWeight: 600 }}>{year}</div>
              <div style={{ color: '#3b82f6' }}>{Number(entry.value).toLocaleString('fr-FR')}</div>
            </div>
          );
        }}
      />
      <Line
        type="monotone"
        dataKey="seuil"
        stroke="#3b82f6"
        strokeWidth={2}
        dot={{ r: 2 }}
        isAnimationActive={false}
      />
      <Line
        type="monotone"
        dataKey="trend"
        stroke={trendColor}
        strokeWidth={1}
        strokeDasharray="4 2"
        dot={false}
        isAnimationActive={false}
      />
    </LineChart>
  );
}

export default AdmissionSparkline;
