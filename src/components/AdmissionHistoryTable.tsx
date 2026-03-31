import { useState, useEffect, useMemo } from "react";
import type { LyceeAdmissionHistory } from "../types";
import { SEUIL_YEARS, getAdmissionDifficulty } from "../services/seuilsApi";
import AdmissionSparkline from "./AdmissionSparkline";
import { hasValidSparklineData } from "./sparklineUtils";
import "./AdmissionHistoryTable.css";

interface AdmissionHistoryTableProps {
  readonly data: readonly LyceeAdmissionHistory[];
}

const MOBILE_BREAKPOINT = 768;

// These lycées never have admission scores (selection on dossier only)
const NO_SCORE_LYCEES = new Set(["0750654D", "0750655E"]); // HENRI IV, LOUIS LE GRAND

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

function AdmissionHistoryTable({ data }: AdmissionHistoryTableProps) {
  const [expandedRows, setExpandedRows] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [filter, setFilter] = useState("");
  const isMobile = useIsMobile();

  const visibleYears = useMemo(
    () => (isMobile ? SEUIL_YEARS.slice(-2) : SEUIL_YEARS),
    [isMobile],
  );

  const visibleYearIndices = useMemo(
    () => visibleYears.map((y) => SEUIL_YEARS.indexOf(y)),
    [visibleYears],
  );

  const filteredData = useMemo(() => {
    if (!filter.trim()) return data;
    const lower = filter.toLowerCase();
    return data.filter((l) => l.nom.toLowerCase().includes(lower));
  }, [data, filter]);

  const toggleRow = (code: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  return (
    <div className="admission-history">
      <h2>Historique des seuils d'admission</h2>
      <p className="admission-history-subtitle">
        Seuils d'admission par lycée sur les {SEUIL_YEARS.length} dernières
        années
      </p>

      <input
        type="text"
        className="admission-history-filter"
        placeholder="Filtrer par nom de lycée…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      <div className="admission-history-table-wrapper">
        <table className="admission-history-table">
          <thead>
            <tr>
              <th className="col-name">Lycée</th>
              {visibleYears.map((year) => (
                <th key={year} className="col-year">
                  {year}
                </th>
              ))}
              <th className="col-graph">Évolution</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((lycee) => {
              const isExpanded = expandedRows.has(lycee.code);
              // On vérifie si la ligne contient de vraies données pour tracer un graphique
              const hasGraphData = hasValidSparklineData(lycee.seuils);

              return (
                <tr key={lycee.code} className={isExpanded ? "expanded" : ""}>
                  <td className="col-name">{lycee.nom}</td>
                  {visibleYearIndices.map((idx) => {
                    const seuil = lycee.seuils[idx];
                    const isNoScore = NO_SCORE_LYCEES.has(lycee.code);
                    const hasValue = seuil != null && seuil > 0;
                    const difficulty = hasValue
                      ? getAdmissionDifficulty(seuil)
                      : null;
                    const displayValue = hasValue
                      ? seuil.toLocaleString("fr-FR")
                      : isNoScore
                        ? "N/A"
                        : "–";
                    return (
                      <td
                        key={idx}
                        className={`col-year${!hasValue ? " col-year-empty" : ""}${difficulty ? ` difficulty-${difficulty.level}` : ""}`}
                        title={difficulty?.label}
                      >
                        {displayValue}
                      </td>
                    );
                  })}
                  <td className="col-graph">
                    {/* On n'affiche le bouton et le conteneur que s'il y a des données valides */}
                    {hasGraphData && (
                      <>
                        <button
                          className={`sparkline-toggle${isExpanded ? " active" : ""}`}
                          onClick={() => toggleRow(lycee.code)}
                          title={
                            isExpanded
                              ? "Masquer le graphique"
                              : "Afficher le graphique"
                          }
                          aria-label={
                            isExpanded
                              ? "Masquer le graphique"
                              : "Afficher le graphique"
                          }
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            width="20"
                            height="20"
                          >
                            <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
                          </svg>
                        </button>
                        {isExpanded && (
                          <div className="sparkline-container">
                            <AdmissionSparkline seuils={lycee.seuils} />
                          </div>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredData.length === 0 && (
        <p className="admission-history-empty">Aucun lycée trouvé</p>
      )}
    </div>
  );
}

export default AdmissionHistoryTable;
