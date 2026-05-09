import { useState, useRef, useEffect } from 'react';
import type { College } from '../types';
import { useCollegeSearch } from '../hooks/useCollegeSearch';
import './CollegeAutocomplete.css';

interface CollegeAutocompleteProps {
  onSelect: (college: College) => void;
  placeholder?: string;
  disabled?: boolean;
  includePrivate?: boolean;
}

export function CollegeAutocomplete({ onSelect, placeholder, disabled, includePrivate }: CollegeAutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const { suggestions, isLoading, error, search, clearSuggestions } = useCollegeSearch({ includePrivate });
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setHighlightedIndex(-1);
    search(value);
    setShowSuggestions(true);
  };

  const selectCollege = (college: College) => {
    setInputValue(college.nom);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    clearSuggestions();
    onSelect(college);
  };

  const handleClear = () => {
    setInputValue('');
    clearSuggestions();
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'Tab') {
      e.preventDefault();
      const next = e.shiftKey
        ? (highlightedIndex <= 0 ? suggestions.length - 1 : highlightedIndex - 1)
        : (highlightedIndex < suggestions.length - 1 ? highlightedIndex + 1 : 0);
      setHighlightedIndex(next);
      scrollToItem(next);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = highlightedIndex < suggestions.length - 1 ? highlightedIndex + 1 : 0;
      setHighlightedIndex(next);
      scrollToItem(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = highlightedIndex <= 0 ? suggestions.length - 1 : highlightedIndex - 1;
      setHighlightedIndex(next);
      scrollToItem(next);
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      selectCollege(suggestions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  const scrollToItem = (index: number) => {
    const item = listRef.current?.children[index] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
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
          placeholder={placeholder ?? 'Nom de votre collège…'}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={showSuggestions && suggestions.length > 0}
          aria-activedescendant={highlightedIndex >= 0 ? `college-option-${highlightedIndex}` : undefined}
          aria-controls="college-suggestions"
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
        <ul className="suggestions-list" ref={listRef} role="listbox" id="college-suggestions">
          {suggestions.map((college, index) => (
            <li key={college.uai} role="option" id={`college-option-${index}`} aria-selected={index === highlightedIndex}>
              <button
                className={`suggestion-item${index === highlightedIndex ? ' highlighted' : ''}`}
                onClick={() => selectCollege(college)}
                type="button"
                tabIndex={-1}
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
