import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
import type { ScolarisationStatus } from './types';
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
  ContributePanel,
} from './components';
import OverflowMenu from './components/OverflowMenu';
import { updateHistoryScolarisation } from './services/storage';
import {
  fetchAllAcademicStats,
  DEFAULT_STATS_MODEL,
} from './services/scoreApi';
import { useAdmissionHistory } from './hooks/useAdmissionHistory';
import { fetchCollegeIps } from './services/collegeApi';
import { fetchSeuils, getAdmissionDifficulty } from './services/seuilsApi';
import { calculateAffelnetScore, DEFAULT_MULTIPLIER } from './services/scoreCalculation';
import {
  getCustomModels,
  addCustomModel,
  updateCustomModel as updateCustomModelStorage,
  deleteCustomModel as deleteCustomModelStorage,
  type CustomStatsModel,
} from './services/customModelsStorage';
import './App.css';

function App() {
  const { result, searchedAddress, isLoading, error, searchSector, searchByCollege, showResult, reset } =
    useSectorSearch();
  const { history, refresh, clearHistory, removeEntry } = useSearchHistory();
  const { mode, setMode } = useTheme();
  const [topTab, setTopTab] = useState<TopTab>('search');
  const [searchMode, setSearchMode] = useState<SearchMode>('address');

  // Focus the correct input when search mode changes
  useEffect(() => {
    const selector = searchMode === 'address' ? '.address-input' : '.college-input';
    requestAnimationFrame(() => {
      const input = document.querySelector<HTMLInputElement>(selector);
      input?.focus();
    });
  }, [searchMode]);

  // Score calculation state
  const [score, setScore] = useState<UserScore | null>(null);
  const [allStatsByKey, setAllStatsByKey] = useState<Map<string, Record<DisciplinaryField, AcademicStats>> | null>(null);
  const [availableStatsKeys, setAvailableStatsKeys] = useState<string[]>([]);
  const [statsKey, setStatsKey] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [ipsBonus, setIpsBonus] = useState(0);
  const [multiplier, setMultiplier] = useState(DEFAULT_MULTIPLIER);
  const [lastGrades, setLastGrades] = useState<UserGrades | null>(null);
  const { data: admissionHistory, boursiers: admissionHistoryBoursiers, isLoading: isHistoryLoading, error: historyError } = useAdmissionHistory(topTab === 'history');
  const [seuils, setSeuils] = useState<Map<string, number> | null>(null);
  const [scolarisation, setScolarisation] = useState<ScolarisationStatus>('pending');
  const [collegeScolarisation, setCollegeScolarisation] = useState<College | null>(null);
  const [customModels, setCustomModels] = useState<CustomStatsModel[]>(() => getCustomModels());

  // Merge fetched stats with custom models so score calculation can resolve any active key
  const mergedStats = useMemo(() => {
    if (!allStatsByKey) return null;
    const merged = new Map(allStatsByKey);
    for (const m of customModels) {
      merged.set(`custom:${m.id}`, m.stats as Record<DisciplinaryField, AcademicStats>);
    }
    return merged;
  }, [allStatsByKey, customModels]);
  const stats = statsKey && mergedStats ? mergedStats.get(statsKey) ?? null : null;

  // Fetch seuils when score tab is activated
  useEffect(() => {
    if (topTab === 'score' && !seuils) {
      fetchSeuils().then(setSeuils).catch(() => {});
    }
  }, [topTab, seuils]);

  // Compute sector 1 lycees with seuils for the score gauge
  const sector1LyceesWithSeuils = useMemo(() => {
    if (!result?.lycees || !seuils) return undefined;
    return result.lycees
      .filter(l => l.secteur === 1)
      .map(l => {
        const seuil = seuils.get(l.uai);
        if (seuil == null) return null;
        return { uai: l.uai, nom: l.nom, seuil, difficulty: getAdmissionDifficulty(seuil) };
      })
      .filter((l): l is NonNullable<typeof l> => l != null);
  }, [result, seuils]);

  const allSeuilsRange = useMemo(() => {
    if (!seuils) return undefined;
    const allValues = [...seuils.values()].filter(s => s > 0);
    if (allValues.length === 0) return undefined;
    const easyAndAbove = allValues.filter(s => s > 38000);
    return {
      min: easyAndAbove.length > 0 ? Math.min(...easyAndAbove) : Math.min(...allValues),
      max: Math.max(...allValues),
    };
  }, [seuils]);

  // Fetch all academic stats when the score tab is activated
  const statsFetchingRef = useRef(false);
  useEffect(() => {
    if (topTab === 'score' && !allStatsByKey && !statsFetchingRef.current) {
      statsFetchingRef.current = true;
      fetchAllAcademicStats()
        .then(({ availableKeys, statsByKey }) => {
          setAllStatsByKey(statsByKey);
          setAvailableStatsKeys(availableKeys);
          setStatsKey(availableKeys.includes(DEFAULT_STATS_MODEL) ? DEFAULT_STATS_MODEL : availableKeys[availableKeys.length - 1]);
        })
        .catch(err => setStatsError(err instanceof Error ? err.message : String(err)))
        .finally(() => {
          statsFetchingRef.current = false;
        });
    }
  }, [topTab, allStatsByKey]);

  // Persist scolarisation choice to history when it changes
  useEffect(() => {
    if (scolarisation !== 'pending' && searchedAddress) {
      updateHistoryScolarisation(searchedAddress.label, scolarisation, collegeScolarisation);
    }
  }, [scolarisation, collegeScolarisation, searchedAddress]);

  // Derive the UAI to use for IPS bonus (scolarisation college, not sector)
  const ipsTargetUai = useMemo(() => {
    if (scolarisation === 'same') return result?.college.uai ?? null;
    if (scolarisation === 'other' && collegeScolarisation) return collegeScolarisation.uai;
    return null;
  }, [scolarisation, result, collegeScolarisation]);

  // Fetch IPS bonus when target college changes
  useEffect(() => {
    if (!ipsTargetUai) return;
    fetchCollegeIps(ipsTargetUai).then(info => {
      setIpsBonus(info?.bonus ?? 0);
    }).catch(() => {
      setIpsBonus(0);
    });
  }, [ipsTargetUai]);

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
      setScolarisation(entry.scolarisation ?? 'pending');
      setCollegeScolarisation(entry.collegeScolarisation ?? null);
      refresh();
      setTopTab('search');
      setSearchMode('address');
    },
    [showResult, refresh]
  );

  const handleNewSearch = useCallback(() => {
    reset();
    refresh();
    setScolarisation('pending');
    setCollegeScolarisation(null);
    setIpsBonus(0);
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

  const handleStatsKeyChange = useCallback((key: string) => {
    setStatsKey(key);
    if (lastGrades && mergedStats) {
      const keyStats = mergedStats.get(key);
      if (keyStats) {
        setScore(calculateAffelnetScore(lastGrades, keyStats, multiplier));
      }
    }
  }, [lastGrades, mergedStats, multiplier]);

  const handleCreateCustomModel = useCallback((baseKey: string) => {
    if (!allStatsByKey) return;
    const baseStats = allStatsByKey.get(baseKey);
    if (!baseStats) return;
    const id = crypto.randomUUID();
    const name = `Perso ${customModels.length + 1}`;
    const roundedStats = {} as Record<DisciplinaryField, AcademicStats>;
    for (const [field, val] of Object.entries(baseStats) as [DisciplinaryField, AcademicStats][]) {
      roundedStats[field] = {
        moyenne: Math.round(val.moyenne * 10) / 10,
        ecartType: Math.round(val.ecartType * 10) / 10,
      };
    }
    const model: CustomStatsModel = {
      id,
      name,
      stats: roundedStats,
    };
    const updated = addCustomModel(model);
    setCustomModels(updated);
    setStatsKey(`custom:${id}`);
    if (lastGrades) {
      setScore(calculateAffelnetScore(lastGrades, baseStats, multiplier));
    }
  }, [allStatsByKey, customModels.length, lastGrades, multiplier]);

  const handleUpdateCustomModel = useCallback((id: string, stats: Record<DisciplinaryField, AcademicStats>) => {
    const updated = updateCustomModelStorage(id, stats);
    setCustomModels(updated);
    if (statsKey === `custom:${id}` && lastGrades) {
      setScore(calculateAffelnetScore(lastGrades, stats, multiplier));
    }
  }, [statsKey, lastGrades, multiplier]);

  const handleDeleteCustomModel = useCallback((id: string) => {
    const updated = deleteCustomModelStorage(id);
    setCustomModels(updated);
    if (statsKey === `custom:${id}`) {
      setStatsKey(availableStatsKeys.includes(DEFAULT_STATS_MODEL) ? DEFAULT_STATS_MODEL : availableStatsKeys[0]);
    }
  }, [statsKey, availableStatsKeys]);

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
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            Lycées de secteur
          </button>
          <button
            className={`input-tab${topTab === 'score' ? ' active' : ''}`}
            onClick={() => handleTopTabChange('score')}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.611 3.611 0 0112 15.6z" />
            </svg>
            Simuler
          </button>
          <button
            className={`input-tab${topTab === 'contribute' ? ' active' : ''}`}
            onClick={() => handleTopTabChange('contribute')}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
            </svg>
            Contribuer
          </button>
          {/* Visible inline on desktop, hidden on mobile */}
          <button
            className={`input-tab tab-overflow-item${topTab === 'history' ? ' active' : ''}`}
            onClick={() => handleTopTabChange('history')}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
            </svg>
            Seuils d'admission
          </button>
          {/* Mobile overflow menu trigger */}
          <OverflowMenu
            active={topTab === 'history'}
            onSelect={() => handleTopTabChange('history')}
            label="Seuils d'admission"
          />
        </div>

        <div className="tab-panel" style={{ display: topTab === 'search' ? undefined : 'none' }}>
          {!result && !isLoading && (
            <>
              <div className="search-mode-tabs">
                <button
                  className={`search-mode-tab${searchMode === 'address' ? ' active' : ''}`}
                  onClick={() => setSearchMode('address')}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  Par adresse du domicile
                </button>
                <button
                  className={`search-mode-tab${searchMode === 'college' ? ' active' : ''}`}
                  onClick={() => setSearchMode('college')}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
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
                scolarisation={scolarisation}
                onScolarisationChange={setScolarisation}
                collegeScolarisation={collegeScolarisation}
                onCollegeScolarisationChange={setCollegeScolarisation}
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
            {topTab === 'score' && !allStatsByKey && !statsError && <LoadingState />}
            {statsError && <ErrorMessage message={`Erreur lors du chargement des statistiques : ${statsError}`} />}
            {stats && (
              <div className="score-grid">
                <GradeInputForm onGradesChange={handleGradesChange} />
                <ScoreDisplay
                  score={score}
                  ipsBonus={ipsBonus}
                  collegeName={scolarisation === 'other' && collegeScolarisation ? collegeScolarisation.nom : result?.college.nom}
                  multiplier={multiplier}
                  onMultiplierChange={handleMultiplierChange}
                  statsKey={statsKey}
                  availableStatsKeys={availableStatsKeys}
                  onStatsKeyChange={handleStatsKeyChange}
                  sector1Lycees={sector1LyceesWithSeuils}
                  allSeuilsRange={allSeuilsRange}
                  customModels={customModels}
                  onCreateCustomModel={handleCreateCustomModel}
                  onUpdateCustomModel={handleUpdateCustomModel}
                  onDeleteCustomModel={handleDeleteCustomModel}
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
              <AdmissionHistoryTable data={admissionHistory} boursiers={admissionHistoryBoursiers} />
            )}
          </div>
        </div>

        <div className="tab-panel" style={{ display: topTab === 'contribute' ? undefined : 'none' }}>
          <ContributePanel />
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
