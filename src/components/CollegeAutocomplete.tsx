import { useState, useRef, useEffect } from 'react';
import type { College } from '../types';
import { useCollegeSearch } from '../hooks/useCollegeSearch';
import './CollegeAutocomplete.css';

interface CollegeAutocompleteProps {
  onSelect: (college: College) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CollegeAutocomplete({ onSelect, placeholder, disabled }: CollegeAutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { suggestions, isLoading, error, search, clearSuggestions } = useCollegeSearch();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    search(value);
    setShowSuggestions(true);
  };

  const handleCollegeClick = (college: College) => {
    setInputValue(college.nom);
    setShowSuggestions(false);
    clearSuggestions();
    onSelect(college);
  };

  const handleClear = () => {
    setInputValue('');
    clearSuggestions();
    setShowSuggestions(false);
  };

  return (
    <div className="college-autocomplete-container" ref={containerRef}>
      <div className="input-wrapper">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
          <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
        </svg>
        <input
          type="text"
          className="college-input"
          placeholder={placeholder ?? 'Nom de votre collège...'}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          disabled={disabled}
          autoComplete="off"
        />
        {inputValue && (
          <button className="clear-button" onClick={handleClear} type="button" aria-label="Effacer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isLoading && (
        <div className="suggestions-list">
          <div className="loading-text">Chargement des collèges...</div>
        </div>
      )}

      {error && (
        <div className="suggestions-list">
          <div className="loading-text">{error}</div>
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <ul className="suggestions-list">
          {suggestions.map((college) => (
            <li key={college.uai}>
              <button
                className="suggestion-item"
                onClick={() => handleCollegeClick(college)}
                type="button"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" width="20" height="20" style={{ flexShrink: 0 }}>
                  <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
                  <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
                </svg>
                <span>{college.nom}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
