import { useCallback } from 'react';
import type { Address, SearchHistory as SearchHistoryType } from './types';
import { useCollegeSearch } from './hooks/useCollegeSearch';
import { useSearchHistory } from './hooks/useSearchHistory';
import {
  AddressInput,
  CollegeCard,
  SearchHistory,
  LoadingState,
  ErrorMessage,
} from './components';
import './App.css';

function App() {
  const { college, searchedAddress, isLoading, error, searchCollege, reset } =
    useCollegeSearch();
  const { history, refresh, clearHistory, removeEntry } = useSearchHistory();

  const handleAddressSelect = useCallback(
    (address: Address) => {
      searchCollege(address);
    },
    [searchCollege]
  );

  const handleHistorySelect = useCallback(
    (entry: SearchHistoryType) => {
      if (entry.college) {
        // Afficher directement le resultat de l'historique
        searchCollege(entry.address);
      } else {
        // Relancer la recherche
        searchCollege(entry.address);
      }
      refresh();
    },
    [searchCollege, refresh]
  );

  const handleNewSearch = useCallback(() => {
    reset();
    refresh();
  }, [reset, refresh]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
          </svg>
        </div>
        <h1>Mon College de Secteur</h1>
        <p className="subtitle">
          Trouvez le college public de votre secteur en fonction de votre adresse
        </p>
      </header>

      <main className="app-main">
        {!college && !isLoading && (
          <AddressInput onAddressSelect={handleAddressSelect} disabled={isLoading} />
        )}

        {isLoading && <LoadingState />}

        {error && !isLoading && !college && <ErrorMessage message={error} />}

        {college && searchedAddress && (
          <>
            <CollegeCard college={college} addressLabel={searchedAddress.label} />
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

        {!college && !isLoading && history.length > 0 && (
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
            href="https://data.education.gouv.fr"
            target="_blank"
            rel="noopener noreferrer"
          >
            data.education.gouv.fr
          </a>{' '}
          et{' '}
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
