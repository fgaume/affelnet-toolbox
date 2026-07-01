import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ReverseSectorResult } from '../ReverseSectorResult';
import type { ReverseLookupResult } from '../../services/collegeReverseLookup';

const college = (uai: string, nom: string, matched: number, missing: string[] = []) => ({
  uai,
  nom,
  matched,
  total: 5,
  missing: missing.map((n) => ({ uai: n, nom: n })),
});

describe('ReverseSectorResult', () => {
  it('invite à saisir des lycées quand la sélection est vide', () => {
    const result: ReverseLookupResult = { candidates: [], containment: true, ambiguous: false };
    render(<ReverseSectorResult selectedCount={0} result={result} />);
    expect(screen.getByText(/Ajoutez les lycées de secteur 1/i)).toBeTruthy();
  });

  it('identifie un collège unique', () => {
    const result: ReverseLookupResult = {
      candidates: [college('CA', 'COLLEGE A', 5)],
      containment: true,
      ambiguous: false,
    };
    render(<ReverseSectorResult selectedCount={5} result={result} />);
    expect(screen.getByText(/Collège de secteur identifié/i)).toBeTruthy();
    expect(screen.getByText('COLLEGE A')).toBeTruthy();
  });

  it('signale un groupe ambigu', () => {
    const result: ReverseLookupResult = {
      candidates: [college('CB', 'COLLEGE B', 5), college('CC', 'COLLEGE C', 5)],
      containment: true,
      ambiguous: true,
    };
    render(<ReverseSectorResult selectedCount={5} result={result} />);
    expect(screen.getByText(/partagent exactement ce secteur/i)).toBeTruthy();
    expect(screen.getByText(/ne permettent pas de les distinguer/i)).toBeTruthy();
  });

  it('propose d’affiner sur sélection partielle et liste les lycées manquants', () => {
    const result: ReverseLookupResult = {
      candidates: [college('CA', 'COLLEGE A', 3, ['LYC D', 'LYC E'])],
      containment: true,
      ambiguous: false,
    };
    render(<ReverseSectorResult selectedCount={3} result={result} />);
    expect(screen.getByText(/1 collège compatible/i)).toBeTruthy();
    expect(screen.getByText(/autres lycées de secteur 1 pour affiner/i)).toBeTruthy();
    expect(screen.getByText(/LYC D, LYC E/)).toBeTruthy();
  });

  it('avertit en cas de repli hors-secteur', () => {
    const result: ReverseLookupResult = {
      candidates: [college('CA', 'COLLEGE A', 1, ['x', 'y', 'z', 'w'])],
      containment: false,
      ambiguous: false,
    };
    render(<ReverseSectorResult selectedCount={2} result={result} />);
    expect(screen.getByText(/Aucun collège n'a tous ces lycées/i)).toBeTruthy();
  });
});
