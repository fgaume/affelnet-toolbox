import { useState, useCallback, useEffect } from 'react';
import type { 
  Address, 
  College, 
  SearchHistory as SearchHistoryType,
  InputMode,
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
} from './components';
import { fetchAcademicStats } from './services/scoreApi';
import { calculateAffelnetScore } from './services/scoreCalculation';
import './App.css';

function App() {
  const { result, searchedAddress, isLoading, error, searchSector, searchByCollege, showResult, reset } =
    useSectorSearch();
  const { history, refresh, clearHistory, removeEntry } = useSearchHistory();
  const { mode, setMode } = useTheme();
  const [inputMode, setInputMode] = useState<InputMode>('address');

  // Score calculation state
  const [score, setScore] = useState<UserScore | null>(null);
  const [stats, setStats] = useState<Record<DisciplinaryField, AcademicStats> | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Fetch academic stats when the score tab is activated
  useEffect(() => {
    if (inputMode === 'score' && !stats && !isStatsLoading) {
      setIsStatsLoading(true);
      fetchAcademicStats()
        .then(setStats)
        .catch(err => setStatsError(err instanceof Error ? err.message : String(err)))
        .finally(() => setIsStatsLoading(false));
    }
  }, [inputMode, stats, isStatsLoading]);

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
      setInputMode('address');
    },
    [showResult, refresh]
  );

  const handleNewSearch = useCallback(() => {
    reset();
    refresh();
  }, [reset, refresh]);

  const handleGradesChange = useCallback((grades: UserGrades) => {
    if (stats) {
      const newScore = calculateAffelnetScore(grades, stats);
      setScore(newScore);
    }
  }, [stats]);

  const handleTabChange = (mode: InputMode) => {
    setInputMode(mode);
    if (mode !== 'score' && result) {
      // Keep result visible if switching between address and college
    } else if (mode === 'score') {
      // Don't reset result, but it won't be shown anyway because of the tab logic
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <ThemeToggle mode={mode} onToggle={setMode} />
        <div className="logo">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
          </svg>
        </div>
        <h1>Mon Collège de Secteur</h1>
        <p className="subtitle">
          Trouvez le collège public de votre secteur en fonction de votre adresse
        </p>
      </header>

      <main className="app-main">
        <div className="input-tabs">
          <button
            className={`input-tab${inputMode === 'address' ? ' active' : ''}`}
            onClick={() => handleTabChange('address')}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            Par adresse
          </button>
          <button
            className={`input-tab${inputMode === 'college' ? ' active' : ''}`}
            onClick={() => handleTabChange('college')}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
            </svg>
            Par collège
          </button>
          <button
            className={`input-tab${inputMode === 'score' ? ' active' : ''}`}
            onClick={() => handleTabChange('score')}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zm0 8H7v-2h10v2z" />
            </svg>
            Calculer son score
          </button>
        </div>

        {inputMode !== 'score' && (
          <>
            {!result && !isLoading && (
              <>
                {inputMode === 'address' && (
                  <AddressInput onAddressSelect={handleAddressSelect} disabled={isLoading} />
                )}
                {inputMode === 'college' && (
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
                  userScore={score}
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
          </>
        )}

        {inputMode === 'score' && (
          <div className="score-calculation-container">
            {isStatsLoading && <LoadingState />}
            {statsError && <ErrorMessage message={`Erreur lors du chargement des statistiques : ${statsError}`} />}
            {stats && (
              <div className="score-grid">
                <GradeInputForm onGradesChange={handleGradesChange} />
                <ScoreDisplay score={score} />
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>
          Donnees fournies par{' '}
          <a
            href="https://capgeo2.paris.fr"
            target="_blank"
            rel="noopener noreferrer"
          >
            CapGeo Paris
          </a>
          {' '}et{' '}
          <a
            href="https://services9.arcgis.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Rectorat de Paris
          </a>
          {' '}via{' '}
          <a
            href="https://api-adresse.data.gouv.fr"
            target="_blank"
            rel="noopener noreferrer"
          >
            api-adresse.data.gouv.fr
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
