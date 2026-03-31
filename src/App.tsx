import { useState, useCallback, useEffect } from 'react';
import type {
  Address,
  College,
  SearchHistory as SearchHistoryType,
  TopTab,
  SearchMode,
  UserScore,
  UserGrades,
  AcademicStats,
  DisciplinaryField
} from './types';
import { useSectorSearch } from './hooks/useSectorSearch';
import { useSearchHistory } from './hooks/useSearchHistory';
import { useTheme } from './hooks/useTheme';
import {
  AddressInput,
  CollegeAutocomplete,
  CollegeCard,
  SearchHistory,
  LoadingState,
  ErrorMessage,
  ThemeToggle,
  GradeInputForm,
  ScoreDisplay,
  DataSourcesPanel,
  AdmissionHistoryTable,
  DisclaimerModal,
} from './components';
import {
  fetchAllAcademicStats,
} from './services/scoreApi';
import { useAdmissionHistory } from './hooks/useAdmissionHistory';
import { fetchCollegeIps } from './services/collegeApi';
import { calculateAffelnetScore, DEFAULT_MULTIPLIER } from './services/scoreCalculation';
import './App.css';

function App() {
  const { result, searchedAddress, isLoading, error, searchSector, searchByCollege, showResult, reset } =
    useSectorSearch();
  const { history, refresh, clearHistory, removeEntry } = useSearchHistory();
  const { mode, setMode } = useTheme();
  const [topTab, setTopTab] = useState<TopTab>('search');
  const [searchMode, setSearchMode] = useState<SearchMode>('address');

  // Score calculation state
  const [score, setScore] = useState<UserScore | null>(null);
  const [allStatsByYear, setAllStatsByYear] = useState<Map<number, Record<DisciplinaryField, AcademicStats>> | null>(null);
  const [availableStatsYears, setAvailableStatsYears] = useState<number[]>([]);
  const [statsYear, setStatsYear] = useState<number | null>(null);
  const stats = statsYear && allStatsByYear ? allStatsByYear.get(statsYear) ?? null : null;
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [ipsBonus, setIpsBonus] = useState(0);
  const [multiplier, setMultiplier] = useState(DEFAULT_MULTIPLIER);
  const [lastGrades, setLastGrades] = useState<UserGrades | null>(null);
  const { data: admissionHistory, isLoading: isHistoryLoading, error: historyError } = useAdmissionHistory(topTab === 'history');

  // Fetch all academic stats when the score tab is activated
  useEffect(() => {
    if (topTab === 'score' && !allStatsByYear && !isStatsLoading) {
      setIsStatsLoading(true);
      fetchAllAcademicStats()
        .then(({ availableYears, statsByYear }) => {
          setAllStatsByYear(statsByYear);
          setAvailableStatsYears(availableYears);
          setStatsYear(Math.max(...availableYears));
        })
        .catch(err => setStatsError(err instanceof Error ? err.message : String(err)))
        .finally(() => setIsStatsLoading(false));
    }
  }, [topTab, allStatsByYear, isStatsLoading]);

  // Fetch IPS bonus when result changes
  useEffect(() => {
    if (result?.college.uai) {
      fetchCollegeIps(result.college.uai).then(info => {
        setIpsBonus(info?.bonus ?? 0);
      }).catch(() => {
        setIpsBonus(0);
      });
    } else {
      // If we are in college mode and have a selected college but no search result yet
      // This is a placeholder if we wanted to fetch IPS even before sector results
      setIpsBonus(0);
    }
  }, [result]);

  const handleAddressSelect = useCallback(
    (address: Address) => {
      searchSector(address);
    },
    [searchSector]
  );

  const handleCollegeSelect = useCallback(
    (college: College) => {
      searchByCollege(college);
    },
    [searchByCollege]
  );

  const handleHistorySelect = useCallback(
    (entry: SearchHistoryType) => {
      showResult(entry.address, entry.result);
      refresh();
      setTopTab('search');
      setSearchMode('address');
    },
    [showResult, refresh]
  );

  const handleNewSearch = useCallback(() => {
    reset();
    refresh();
  }, [reset, refresh]);

  const handleGradesChange = useCallback((grades: UserGrades) => {
    setLastGrades(grades);
    if (stats) {
      const newScore = calculateAffelnetScore(grades, stats, multiplier);
      setScore(newScore);
    }
  }, [stats, multiplier]);

  const handleMultiplierChange = useCallback((delta: number) => {
    setMultiplier(prev => {
      const next = Math.round((prev + delta) * 10) / 10;
      if (next < 0.1) return prev;
      if (lastGrades && stats) {
        const newScore = calculateAffelnetScore(lastGrades, stats, next);
        setScore(newScore);
      }
      return next;
    });
  }, [lastGrades, stats]);

  // Recalculate score when stats year changes
  useEffect(() => {
    if (lastGrades && stats) {
      const newScore = calculateAffelnetScore(lastGrades, stats, multiplier);
      setScore(newScore);
    }
  }, [statsYear]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatsYearChange = useCallback((year: number) => {
    setStatsYear(year);
  }, []);

  const handleTopTabChange = (tab: TopTab) => {
    setTopTab(tab);
  };

  return (
    <div className="app">
      <DisclaimerModal />
      <header className="app-header">
        <ThemeToggle mode={mode} onToggle={setMode} />
        <div className="logo">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
          </svg>
        </div>
        <h1>Affelnet Paris (2026)</h1>
        <p className="subtitle">
          Boite à outils pour la procédure d'affectation au lycée à Paris
        </p>
      </header>

      <main className="app-main">
        <div className="input-tabs">
          <button
            className={`input-tab${topTab === 'search' ? ' active' : ''}`}
            onClick={() => handleTopTabChange('search')}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            Lycées de secteur
          </button>
          <button
            className={`input-tab${topTab === 'score' ? ' active' : ''}`}
            onClick={() => handleTopTabChange('score')}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zm0 8H7v-2h10v2z" />
            </svg>
            Simuler son barème
          </button>
          <button
            className={`input-tab${topTab === 'history' ? ' active' : ''}`}
            onClick={() => handleTopTabChange('history')}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
            </svg>
            Historique des seuils admission
          </button>
        </div>

        <div className="tab-panel" style={{ display: topTab === 'search' ? undefined : 'none' }}>
          {!result && !isLoading && (
            <>
              <div className="search-mode-tabs">
                <button
                  className={`search-mode-tab${searchMode === 'address' ? ' active' : ''}`}
                  onClick={() => setSearchMode('address')}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  Par adresse de votre domicile
                </button>
                <button
                  className={`search-mode-tab${searchMode === 'college' ? ' active' : ''}`}
                  onClick={() => setSearchMode('college')}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                    <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
                  </svg>
                  Par collège de secteur
                </button>
              </div>
              {searchMode === 'address' && (
                <AddressInput onAddressSelect={handleAddressSelect} disabled={isLoading} />
              )}
              {searchMode === 'college' && (
                <CollegeAutocomplete
                  onSelect={handleCollegeSelect}
                  placeholder="Nom de votre collège de secteur..."
                  disabled={isLoading}
                />
              )}
            </>
          )}

          {isLoading && <LoadingState />}

          {error && !isLoading && !result && <ErrorMessage message={error} />}

          {result && (
            <>
              <CollegeCard
                result={result}
                address={searchedAddress ?? undefined}
                onClose={handleNewSearch}
              />
              <button className="new-search-button" onClick={handleNewSearch}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                Nouvelle recherche
              </button>
            </>
          )}

          {!result && !isLoading && history.length > 0 && (
            <SearchHistory
              history={history}
              onSelectEntry={handleHistorySelect}
              onRemoveEntry={removeEntry}
              onClearHistory={clearHistory}
            />
          )}
        </div>

        <div className="tab-panel" style={{ display: topTab === 'score' ? undefined : 'none' }}>
          <div className="score-calculation-container">
            {isStatsLoading && <LoadingState />}
            {statsError && <ErrorMessage message={`Erreur lors du chargement des statistiques : ${statsError}`} />}
            {stats && (
              <div className="score-grid">
                <GradeInputForm onGradesChange={handleGradesChange} />
                <ScoreDisplay
                  score={score}
                  ipsBonus={ipsBonus}
                  collegeName={result?.college.nom}
                  multiplier={multiplier}
                  onMultiplierChange={handleMultiplierChange}
                  statsYear={statsYear}
                  availableStatsYears={availableStatsYears}
                  onStatsYearChange={handleStatsYearChange}
                />
              </div>
            )}
          </div>
        </div>

        <div className="tab-panel" style={{ display: topTab === 'history' ? undefined : 'none' }}>
          <div className="admission-history-container">
            {isHistoryLoading && <LoadingState />}
            {historyError && <ErrorMessage message={`Erreur lors du chargement des seuils : ${historyError}`} />}
            {!isHistoryLoading && !historyError && admissionHistory.length > 0 && (
              <AdmissionHistoryTable data={admissionHistory} />
            )}
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <p>Données publiques issues du Ministère de l'Éducation, du Rectorat de Paris et de la Ville de Paris</p>
        <DataSourcesPanel />
      </footer>
    </div>
  );
}

export default App;
