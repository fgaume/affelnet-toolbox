import type { SearchHistory as SearchHistoryType } from '../types';
import './SearchHistory.css';

interface SearchHistoryProps {
  history: SearchHistoryType[];
  onSelectEntry: (entry: SearchHistoryType) => void;
  onRemoveEntry: (id: string) => void;
  onClearHistory: () => void;
}

export function SearchHistory({
  history,
  onSelectEntry,
  onRemoveEntry,
  onClearHistory,
}: SearchHistoryProps) {
  if (history.length === 0) {
    return null;
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="search-history">
      <div className="history-header">
        <h3>Recherches récentes</h3>
        <button className="clear-history-btn" onClick={onClearHistory}>
          Effacer tout
        </button>
      </div>

      <ul className="history-list">
        {history.map((entry) => (
          <li key={entry.id} className="history-item">
            <button
              className="history-content"
              onClick={() => onSelectEntry(entry)}
              type="button"
            >
              <div className="history-address">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                <span>{entry.address.label}</span>
              </div>
              {entry.result && (
                <div className="history-college">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3z" />
                  </svg>
                  <span>{entry.result.college.nom}</span>
                </div>
              )}
              <span className="history-date">{formatDate(entry.timestamp)}</span>
            </button>
            <button
              className="remove-entry-btn"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveEntry(entry.id);
              }}
              type="button"
              aria-label="Supprimer"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
