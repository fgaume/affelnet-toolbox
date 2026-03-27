import { useCallback } from 'react';
import type { Address, SearchHistory as SearchHistoryType } from './types';
import { useSectorSearch } from './hooks/useSectorSearch';
import { useSearchHistory } from './hooks/useSearchHistory';
import { useTheme } from './hooks/useTheme';
import {
  AddressInput,
  CollegeCard,
  SearchHistory,
  LoadingState,
  ErrorMessage,
  ThemeToggle,
} from './components';
import './App.css';

function App() {
  const { result, searchedAddress, isLoading, error, searchSector, showResult, reset } =
    useSectorSearch();
  const { history, refresh, clearHistory, removeEntry } = useSearchHistory();
  const { mode, setMode } = useTheme();

  const handleAddressSelect = useCallback(
    (address: Address) => {
      searchSector(address);
    },
    [searchSector]
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
          <AddressInput onAddressSelect={handleAddressSelect} disabled={isLoading} />
        )}

        {isLoading && <LoadingState />}

        {error && !isLoading && !result && <ErrorMessage message={error} />}

        {result && searchedAddress && (
          <>
            <CollegeCard result={result} address={searchedAddress} />
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
