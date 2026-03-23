import { useState, useCallback } from 'react';
import type { Address, College } from '../types';
import { findCollegeByAddress } from '../services/collegeApi';
import { addToHistory } from '../services/storage';

export function useCollegeSearch() {
  const [college, setCollege] = useState<College | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchedAddress, setSearchedAddress] = useState<Address | null>(null);

  const searchCollege = useCallback(async (address: Address) => {
    setIsLoading(true);
    setError(null);
    setSearchedAddress(address);

    try {
      const result = await findCollegeByAddress(address);
      setCollege(result);

      // Sauvegarder dans l'historique
      addToHistory({ address, college: result });

      if (!result) {
        setError('Aucun collège de secteur trouvé pour cette adresse.');
      }
    } catch {
      setError('Erreur lors de la recherche du collège.');
      setCollege(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setCollege(null);
    setError(null);
    setSearchedAddress(null);
  }, []);

  return {
    college,
    searchedAddress,
    isLoading,
    error,
    searchCollege,
    reset,
  };
}
