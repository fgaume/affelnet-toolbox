import { useState, useRef, useEffect, useMemo } from 'react';
import type { LyceeRef } from '../services/collegeReverseLookup';
import './LyceeSecteurPicker.css';

interface LyceeSecteurPickerProps {
  catalog: LyceeRef[];
  selected: LyceeRef[];
  isLoading: boolean;
  onAdd: (lycee: LyceeRef) => void;
  onRemove: (uai: string) => void;
  onClear: () => void;
}

const MAX_SUGGESTIONS = 8;

/** Normalise pour une recherche insensible à la casse et aux accents. */
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function LyceeSecteurPicker({
  catalog,
  selected,
  isLoading,
  onAdd,
  onRemove,
  onClear,
}: LyceeSecteurPickerProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedUais = useMemo(() => new Set(selected.map((l) => l.uai)), [selected]);

  const suggestions = useMemo(() => {
    const q = normalize(inputValue.trim());
    if (!q) return [];
    return catalog
      .filter((l) => !selectedUais.has(l.uai) && normalize(l.nom).includes(q))
      .slice(0, MAX_SUGGESTIONS);
  }, [inputValue, catalog, selectedUais]);

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

  const addAndReset = (lycee: LyceeRef) => {
    onAdd(lycee);
    setInputValue('');
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && inputValue === '' && selected.length > 0) {
      onRemove(selected[selected.length - 1].uai);
      return;
    }
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = highlightedIndex >= 0 ? suggestions[highlightedIndex] : suggestions[0];
      if (pick) addAndReset(pick);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div className="lycee-picker" ref={containerRef}>
      <div className="lycee-picker-field">
        {selected.map((lycee) => (
          <span className="lycee-chip" key={lycee.uai}>
            {lycee.nom}
            <button
              type="button"
              className="lycee-chip-remove"
              aria-label={`Retirer ${lycee.nom}`}
              onClick={() => onRemove(lycee.uai)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        <input
          type="text"
          className="lycee-picker-input"
          placeholder={
            isLoading
              ? 'Chargement des lycées…'
              : selected.length === 0
                ? 'Ajoutez un lycée de secteur 1…'
                : 'Ajouter un autre lycée…'
          }
          value={inputValue}
          disabled={isLoading}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
            setHighlightedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          autoComplete="off"
          role="combobox"
          aria-expanded={showSuggestions && suggestions.length > 0}
          aria-controls="lycee-suggestions"
        />
        {selected.length > 0 && (
          <button
            type="button"
            className="lycee-picker-clear"
            onClick={onClear}
            aria-label="Tout effacer"
          >
            Effacer
          </button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul className="lycee-suggestions" id="lycee-suggestions" role="listbox">
          {suggestions.map((lycee, index) => (
            <li key={lycee.uai} role="option" aria-selected={index === highlightedIndex}>
              <button
                type="button"
                className={`lycee-suggestion${index === highlightedIndex ? ' highlighted' : ''}`}
                onClick={() => addAndReset(lycee)}
                tabIndex={-1}
              >
                {lycee.nom}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
