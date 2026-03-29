import { useState, useCallback } from 'react';
import type { Address, College, SearchHistory as SearchHistoryType } from './types';
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
} from './components';
import './App.css';

type InputMode = 'address' | 'college';

function App() {
  const { result, searchedAddress, isLoading, error, searchSector, searchByCollege, showResult, reset } =
    useSectorSearch();
  const { history, refresh, clearHistory, removeEntry } = useSearchHistory();
  const { mode, setMode } = useTheme();
  const [inputMode, setInputMode] = useState<InputMode>('address');

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
    },
    [showResult, refresh]
  );

  const handleNewSearch = useCallback(() => {
    reset();
    refresh();
  }, [reset, refresh]);

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
        {!result && !isLoading && (
          <>
            <div className="input-tabs">
              <button
                className={`input-tab${inputMode === 'address' ? ' active' : ''}`}
                onClick={() => setInputMode('address')}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                Par adresse
              </button>
              <button
                className={`input-tab${inputMode === 'college' ? ' active' : ''}`}
                onClick={() => setInputMode('college')}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
                </svg>
                Par collège
              </button>
            </div>

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
            <CollegeCard result={result} address={searchedAddress ?? undefined} />
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
