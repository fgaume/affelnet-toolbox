import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// ScoreGauge tire useTheme (window.matchMedia) et recharts : hors sujet ici.
vi.mock('../ScoreGauge', () => ({ ScoreGauge: () => null }));

import ScoreDisplay from '../ScoreDisplay';
import type { UserScore } from '../../types';

const score = {
  totalScore: 8000,
  weightedSum: 3200,
  details: {},
} as unknown as UserScore;

const baseProps = {
  score,
  ipsBonus: 800,
  onStatsKeyChange: () => {},
};

afterEach(() => {
  vi.useRealTimers();
});

describe('ScoreDisplay — indicateur de millésime des stats', () => {
  it('affiche toujours le millésime actif', () => {
    render(
      <ScoreDisplay
        {...baseProps}
        statsKey="2025"
        availableStatsKeys={['2025']}
      />,
    );
    expect(screen.getByText('stats 2025')).toBeTruthy();
  });

  it('signale un repli quand le millésime courant n’est pas disponible', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01'));
    render(
      <ScoreDisplay
        {...baseProps}
        statsKey="2025"
        availableStatsKeys={['2025']}
      />,
    );
    expect(screen.getByText('stats 2025')).toBeTruthy();
    expect(
      screen.getByText(/statistiques 2026 ne sont pas encore disponibles/i),
    ).toBeTruthy();
  });

  it('quand 2026 est disponible, montre 2026 actif sans repli et laisse comparer', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01'));
    render(
      <ScoreDisplay
        {...baseProps}
        statsKey="2026"
        availableStatsKeys={['2025', '2026']}
      />,
    );
    expect(screen.getByText('stats 2026')).toBeTruthy();
    expect(screen.queryByText(/ne sont pas encore disponibles/i)).toBeNull();
    // Les deux millésimes restent sélectionnables pour voir la différence.
    expect(screen.getByRole('button', { name: '2025' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '2026' })).toBeTruthy();
  });
});
