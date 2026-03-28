import { useState, useCallback } from 'react';
import type { Address, College, SectorResult } from '../types';
import { findCollegeDeSecteur, findCollegeUAI, findLyceesDeSecteur } from '../services/sectorApi';
import { addToHistory } from '../services/storage';

export function useSectorSearch() {
  const [result, setResult] = useState<SectorResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchedAddress, setSearchedAddress] = useState<Address | null>(null);

  const searchSector = useCallback(async (address: Address) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setSearchedAddress(address);

    try {
      // Address.coordinates is [longitude, latitude] — reverse for API
      const [lon, lat] = address.coordinates;

      // Step 1: Find college name from carte scolaire
      const collegeName = await findCollegeDeSecteur(lat, lon);

      // Step 2: Find college UAI from ArcGIS
      const { uai: collegeUAI, coordinates: collegeCoordinates } = await findCollegeUAI(collegeName);

      // Step 3: Find lycees (graceful degradation if this fails)
      let lycees = null;
      let lyceeError: string | undefined;
      try {
        lycees = await findLyceesDeSecteur(collegeUAI);
      } catch (e) {
        lyceeError = e instanceof Error ? e.message : 'Lycées de secteur non disponibles';
      }

      const sectorResult: SectorResult = {
        college: { 
          nom: collegeName, 
          uai: collegeUAI,
          coordinates: collegeCoordinates
        },
        lycees,
        lyceeError,
      };

      setResult(sectorResult);
      addToHistory(address, sectorResult);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erreur lors de la recherche.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchByCollege = useCallback(async (college: College) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setSearchedAddress(null);

    try {
      let lycees = null;
      let lyceeError: string | undefined;
      try {
        lycees = await findLyceesDeSecteur(college.uai);
      } catch (e) {
        lyceeError = e instanceof Error ? e.message : 'Lycées de secteur non disponibles';
      }

      const sectorResult: SectorResult = {
        college: {
          nom: college.nom,
          uai: college.uai,
        },
        lycees,
        lyceeError,
      };

      setResult(sectorResult);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erreur lors de la recherche.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const showResult = useCallback((address: Address, sectorResult: SectorResult) => {
    setResult(sectorResult);
    setSearchedAddress(address);
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setSearchedAddress(null);
  }, []);

  return {
    result,
    searchedAddress,
    isLoading,
    error,
    searchSector,
    searchByCollege,
    showResult,
    reset,
  };
}
