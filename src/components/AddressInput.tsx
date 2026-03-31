import { useState, useRef, useEffect } from 'react';
import type { Address, AddressSuggestion } from '../types';
import { useAddressSearch } from '../hooks/useAddressSearch';
import { suggestionToAddress } from '../services/addressApi';
import './AddressInput.css';

interface AddressInputProps {
  onAddressSelect: (address: Address) => void;
  disabled?: boolean;
}

export function AddressInput({ onAddressSelect, disabled }: AddressInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { suggestions, isLoading, search, clearSuggestions } = useAddressSearch();
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

  const handleSuggestionClick = (suggestion: AddressSuggestion) => {
    const address = suggestionToAddress(suggestion);
    setInputValue(address.label);
    setShowSuggestions(false);
    clearSuggestions();
    onAddressSelect(address);
  };

  const handleClear = () => {
    setInputValue('');
    clearSuggestions();
    setShowSuggestions(false);
  };

  return (
    <div className="address-input-container" ref={containerRef}>
      <div className="input-wrapper">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          className="address-input"
          placeholder="Saisissez l'adresse de votre domicile"
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
        {isLoading && <div className="loading-spinner" />}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul className="suggestions-list">
          {suggestions.map((suggestion) => (
            <li key={suggestion.properties.id}>
              <button
                className="suggestion-item"
                onClick={() => handleSuggestionClick(suggestion)}
                type="button"
              >
                <svg className="location-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                <span>{suggestion.properties.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
