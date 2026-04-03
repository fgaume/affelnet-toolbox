import { LineChart, Line, Tooltip, YAxis } from "recharts";
import { getSeuilYears } from "../services/seuilsApi";
import { isValidSeuil, hasValidSparklineData } from "./sparklineUtils";

interface AdmissionSparklineProps {
  readonly seuils: readonly number[];
}

function AdmissionSparkline({ seuils }: AdmissionSparklineProps) {
  if (!hasValidSparklineData(seuils)) {
    return null;
  }

  // On isole les points valides en gardant leur index X d'origine
  const validPoints = (seuils || [])
    .map((y, x) => ({ x, y }))
    .filter((p) => isValidSeuil(p.y));

  const n = validPoints.length;

  let slope = 0;
  let intercept = 0;

  // Calcul de la régression linéaire uniquement sur les points existants
  if (n >= 2) {
    const sumX = validPoints.reduce((acc, p) => acc + p.x, 0);
    const sumY = validPoints.reduce((acc, p) => acc + p.y, 0);
    const sumXY = validPoints.reduce((acc, p) => acc + p.x * p.y, 0);
    const sumXX = validPoints.reduce((acc, p) => acc + p.x * p.x, 0);

    const denominator = n * sumXX - sumX * sumX;
    if (denominator !== 0) {
      slope = (n * sumXY - sumX * sumY) / denominator;
    }
    intercept = (sumY - slope * sumX) / n;
  } else if (n === 1) {
    intercept = validPoints[0].y;
  }

  const trendColor = slope <= 0 ? "#16a34a" : "#dc2626";

  const seuilYears = getSeuilYears();
  const chartData = seuilYears.map((year, i) => {
    const rawSeuil = (seuils || [])[i];
    // Si la valeur est invalide, on force à null pour Recharts
    const seuilValue = isValidSeuil(rawSeuil) ? Number(rawSeuil) : null;

    // On calcule le point de la droite de tendance pour cet index
    let trendValue = null;
    if (n >= 2) {
      trendValue = slope * i + intercept;
    } else if (n === 1) {
      trendValue = intercept;
    }

    return {
      year,
      seuil: seuilValue,
      trend: trendValue,
    };
  });

  return (
    <LineChart width={160} height={60} data={chartData}>
      <YAxis domain={["dataMin - 50", "dataMax + 50"]} hide />
      <Tooltip
        content={({ active, payload }) => {
          if (!active || !payload?.length) return null;
          const entry = payload.find((p) => p.dataKey === "seuil");
          // On ne veut rien afficher dans le tooltip si la valeur est null
          if (!entry || entry.value == null) return null;

          const year = entry.payload?.year;
          return (
            <div
              style={{
                background: "var(--color-bg-card, #fff)",
                border: "1px solid var(--color-border, #ddd)",
                borderRadius: 6,
                padding: "4px 8px",
                fontSize: 12,
              }}
            >
              <div style={{ fontWeight: 600 }}>{year}</div>
              <div style={{ color: "#3b82f6" }}>
                {Number(entry.value).toLocaleString("fr-FR")}
              </div>
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
        connectNulls={true}
      />
      <Line
        type="monotone"
        dataKey="trend"
        stroke={trendColor}
        strokeWidth={1}
        strokeDasharray="4 2"
        dot={false}
        isAnimationActive={false}
        connectNulls={true}
      />
    </LineChart>
  );
}

export default AdmissionSparkline;
