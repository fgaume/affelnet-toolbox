import { useState, useEffect, useMemo } from "react";
import type { LyceeAdmissionHistory } from "../types";
import { getSeuilYears, getAdmissionDifficulty } from "../services/seuilsApi";
import AdmissionSparkline from "./AdmissionSparkline";
import { hasValidSparklineData } from "./sparklineUtils";
import "./AdmissionHistoryTable.css";

interface AdmissionHistoryTableProps {
  readonly data: readonly LyceeAdmissionHistory[];
  readonly boursiers: readonly LyceeAdmissionHistory[];
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

type SortKey = 'name' | number; // number = index in seuilYears
type SortDir = 'asc' | 'desc';

function SortIcon({ active, direction }: { readonly active: boolean; readonly direction: SortDir }) {
  return (
    <svg className={`sort-icon${active ? ' active' : ''}`} viewBox="0 0 10 14" width="10" height="14" fill="currentColor">
      <path className={active && direction === 'asc' ? 'sort-arrow-active' : 'sort-arrow'} d="M5 0L9.5 5.5H0.5Z" />
      <path className={active && direction === 'desc' ? 'sort-arrow-active' : 'sort-arrow'} d="M5 14L0.5 8.5H9.5Z" />
    </svg>
  );
}

interface SeuilsSectionProps {
  readonly title: string;
  readonly subtitle: string;
  readonly data: readonly LyceeAdmissionHistory[];
  readonly filter: string;
  readonly showSparklines?: boolean;
  readonly startYear?: number;
}

function SeuilsSection({ title, subtitle, data, filter, showSparklines = true, startYear }: SeuilsSectionProps) {
  const [expandedRows, setExpandedRows] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const isMobile = useIsMobile();

  const seuilYears = getSeuilYears();

  const sectionYears = useMemo(
    () => startYear ? seuilYears.filter(y => y >= startYear) : [...seuilYears],
    [seuilYears, startYear],
  );

  const visibleYears = useMemo(
    () => (isMobile ? sectionYears.slice(-2) : sectionYears),
    [isMobile, sectionYears],
  );

  const visibleYearIndices = useMemo(
    () => visibleYears.map((y) => seuilYears.indexOf(y)),
    [visibleYears, seuilYears],
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const filteredData = useMemo(() => {
    const filtered = filter.trim()
      ? data.filter((l) => l.nom.toLowerCase().includes(filter.toLowerCase()))
      : [...data];

    const sorted = filtered.slice().sort((a, b) => {
      if (sortKey === 'name') {
        return a.nom.localeCompare(b.nom, 'fr');
      }
      const seuilA = a.seuils[sortKey] ?? 0;
      const seuilB = b.seuils[sortKey] ?? 0;
      return seuilA - seuilB;
    });

    return sortDir === 'desc' ? sorted.reverse() : sorted;
  }, [data, filter, sortKey, sortDir]);

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
    <div className="admission-history-section">
      <h3>{title}</h3>
      <p className="admission-history-subtitle">{subtitle}</p>

      <div className="admission-history-table-wrapper">
        <table className="admission-history-table">
          <thead>
            <tr>
              <th className="col-name sortable" onClick={() => handleSort('name')}>
                <span className="th-content">Lycée <SortIcon active={sortKey === 'name'} direction={sortDir} /></span>
              </th>
              {visibleYears.map((year) => {
                const idx = seuilYears.indexOf(year);
                return (
                  <th key={year} className="col-year sortable" onClick={() => handleSort(idx)}>
                    <span className="th-content">{year} <SortIcon active={sortKey === idx} direction={sortDir} /></span>
                  </th>
                );
              })}
              {showSparklines && <th className="col-graph">Évolution</th>}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((lycee) => {
              const isExpanded = expandedRows.has(lycee.code);
              const hasGraphData = showSparklines && hasValidSparklineData(lycee.seuils);

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
                  {showSparklines && (
                    <td className="col-graph">
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
                  )}
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

function AdmissionHistoryTable({ data, boursiers }: AdmissionHistoryTableProps) {
  const [filter, setFilter] = useState("");
  const seuilYears = getSeuilYears();

  return (
    <div className="admission-history">
      <h2>Historique des seuils d'admission</h2>

      <input
        type="text"
        className="admission-history-filter"
        placeholder="Filtrer par nom de lycée…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      <SeuilsSection
        title="Non-boursiers"
        subtitle={`Seuils d'admission (non-boursiers) par lycée sur les ${seuilYears.length} dernières années`}
        data={data}
        filter={filter}
      />

      {boursiers.length > 0 && (
        <SeuilsSection
          title="Boursiers"
          subtitle="Seuils d'admission pour les élèves boursiers (session séparée)"
          data={boursiers}
          filter={filter}
          showSparklines={false}
          startYear={2025}
        />
      )}

      <div className="admission-history-legend">
        <span className="legend-label">Légende :</span>
        <span className="legend-item difficulty-very-easy">Très facilement accessible</span>
        <span className="legend-item difficulty-easy">Facilement accessible</span>
        <span className="legend-item difficulty-medium">Moyennement accessible</span>
        <span className="legend-item difficulty-hard">Difficilement accessible</span>
        <span className="legend-item difficulty-extreme">Inaccessible sans bonus</span>
      </div>
    </div>
  );
}

export default AdmissionHistoryTable;
