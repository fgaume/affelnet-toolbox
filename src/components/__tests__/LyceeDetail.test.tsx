import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LyceesIndicateurs } from '../LyceeDetail';
import * as seuilsApi from '../../services/seuilsApi';
import * as niveauScolaireApi from '../../services/niveauScolaireApi';
import * as ipsApi from '../../services/ipsApi';

vi.mock('../../services/seuilsApi');
vi.mock('../../services/niveauScolaireApi');
vi.mock('../../services/ipsApi');

const mockLycees = [
  { uai: '0750680G', nom: 'ARAGO', color: '#ff0000' },
];

const mockUserScore = {
  totalScore: 40500,
  details: {} as any,
};

describe('LyceesIndicateurs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (niveauScolaireApi.fetchNiveauScolaire as any).mockResolvedValue({ history: [], decile: 5 });
    (niveauScolaireApi.fetchMedianTBByYear as any).mockResolvedValue(new Map());
    (ipsApi.fetchIps as any).mockResolvedValue({ history: [], decile: 5 });
    (ipsApi.fetchMedianIpsByYear as any).mockResolvedValue(new Map());
  });

  it('does not display admission status when userScore is null', async () => {
    render(<LyceesIndicateurs lycees={mockLycees} userScore={null} />);
    // Check it finishes loading (the chart container appears)
    await waitFor(() => expect(screen.queryByTestId('lycee-detail-loading')).not.toBeInTheDocument());
    expect(screen.queryByText(/Chances d'admission/)).not.toBeInTheDocument();
  });

  it('displays "Élevée" when score >= threshold', async () => {
    (seuilsApi.fetchSeuils as any).mockResolvedValue(new Map([['0750680G', 40000]]));
    render(<LyceesIndicateurs lycees={mockLycees} userScore={mockUserScore} />);
    await waitFor(() => expect(screen.getByText(/Chances d'admission/)).toBeInTheDocument());
    expect(screen.getByText(/Élevée/)).toBeInTheDocument();
  });

  it('displays "Faible" when score < threshold', async () => {
    (seuilsApi.fetchSeuils as any).mockResolvedValue(new Map([['0750680G', 41000]]));
    render(<LyceesIndicateurs lycees={mockLycees} userScore={mockUserScore} />);
    await waitFor(() => expect(screen.getByText(/Chances d'admission/)).toBeInTheDocument());
    expect(screen.getByText(/Faible/)).toBeInTheDocument();
  });

  it('displays "Seuil inconnu" when no threshold is available', async () => {
    (seuilsApi.fetchSeuils as any).mockResolvedValue(new Map());
    render(<LyceesIndicateurs lycees={mockLycees} userScore={mockUserScore} />);
    await waitFor(() => expect(screen.getByText(/Seuil inconnu/)).toBeInTheDocument());
  });
});
