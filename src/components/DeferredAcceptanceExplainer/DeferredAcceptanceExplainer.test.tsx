import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { DeferredAcceptanceExplainer } from './DeferredAcceptanceExplainer';
import { actions } from './scenario';

// JSDOM ne fournit pas de géométrie utile pour `getBoundingClientRect`. Le
// composant détecte ce cas et avance l'état immédiatement (sans animation),
// ce qui permet de tester la machine pas-à-pas avec `fireEvent.click`.

const clickActiveVoeu = (): void => {
  const buttons = screen.getAllByRole('button', { name: /^Proposer / });
  expect(buttons).toHaveLength(1);
  fireEvent.click(buttons[0]);
};

describe('DeferredAcceptanceExplainer', () => {
  it("démarre avec un seul bouton actif : Chopin pour Bob (1er vœu de Bob)", () => {
    render(<DeferredAcceptanceExplainer />);
    const buttons = screen.getAllByRole('button', { name: /^Proposer / });
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAccessibleName('Proposer Chopin pour Bob');
  });

  it("affiche les 3 lycées initialement vacants", () => {
    render(<DeferredAcceptanceExplainer />);
    const vacant = screen.getAllByText('— vacant —');
    expect(vacant).toHaveLength(3);
  });

  it("après le clic sur Bob→Chopin, Bob est en place dans Chopin", () => {
    render(<DeferredAcceptanceExplainer />);
    clickActiveVoeu();
    // Le bouton actif passe à Léa→Bach
    const next = screen.getAllByRole('button', { name: /^Proposer / });
    expect(next).toHaveLength(1);
    expect(next[0]).toHaveAccessibleName('Proposer Bach pour Léa');
  });

  it("rejoue toute la séquence et affiche les 3 affectations finales", () => {
    render(<DeferredAcceptanceExplainer />);
    for (let i = 0; i < actions.length; i += 1) clickActiveVoeu();

    // Plus aucun bouton de proposition (l'algorithme est terminé)
    expect(screen.queryAllByRole('button', { name: /^Proposer / })).toHaveLength(
      0
    );
    // Le bouton "Rejouer" est apparu
    expect(
      screen.getByRole('button', { name: /Rejouer l'animation/ })
    ).toBeInTheDocument();
    // Affectations finales attendues : Bach=Léa, Chopin=Théo, Liszt=Bob
    const finals = screen.getAllByText(/✓ affecté/);
    expect(finals).toHaveLength(3);
  });

  it("le vœu refusé est marqué rejected (struck-through)", () => {
    render(<DeferredAcceptanceExplainer />);
    // Bob→Chopin (accept), Léa→Bach (accept), Théo→Bach (REJECT)
    clickActiveVoeu();
    clickActiveVoeu();
    clickActiveVoeu();

    // Théo a maintenant Bach en rejected dans sa liste de vœux
    const theoVoeux = screen.getByText('Vœux de Théo').parentElement as HTMLElement;
    const bachItem = within(theoVoeux)
      .getByText('Bach')
      .closest('.da-voeu') as HTMLElement;
    expect(bachItem.className).toContain('da-voeu--rejected');
  });

  it("l'évincement marque le vœu de l'évincé comme rejected", () => {
    render(<DeferredAcceptanceExplainer />);
    // Avancer jusqu'à action 3 incluse : Théo évince Bob de Chopin
    clickActiveVoeu();
    clickActiveVoeu();
    clickActiveVoeu();
    clickActiveVoeu();

    const bobVoeux = screen.getByText('Vœux de Bob').parentElement as HTMLElement;
    const chopinItem = within(bobVoeux)
      .getByText('Chopin')
      .closest('.da-voeu') as HTMLElement;
    expect(chopinItem.className).toContain('da-voeu--rejected');
  });

  it("le bouton Rejouer remet l'état initial", () => {
    render(<DeferredAcceptanceExplainer />);
    for (let i = 0; i < actions.length; i += 1) clickActiveVoeu();
    fireEvent.click(screen.getByRole('button', { name: /Rejouer l'animation/ }));

    // On revient à l'état initial : un seul bouton actif (Bob→Chopin)
    const buttons = screen.getAllByRole('button', { name: /^Proposer / });
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAccessibleName('Proposer Chopin pour Bob');
    // Et 3 lycées vacants
    expect(screen.getAllByText('— vacant —')).toHaveLength(3);
  });
});
