import type { ReverseLookupResult } from '../services/collegeReverseLookup';
import './ReverseSectorResult.css';

interface ReverseSectorResultProps {
  selectedCount: number;
  result: ReverseLookupResult;
}

export function ReverseSectorResult({ selectedCount, result }: ReverseSectorResultProps) {
  if (selectedCount === 0) {
    return (
      <div className="reverse-result reverse-result--hint">
        Ajoutez les lycées de secteur 1 figurant sur votre fiche-barème pour
        retrouver votre collège de secteur.
      </div>
    );
  }

  const { candidates, containment, ambiguous } = result;

  if (candidates.length === 0) {
    return (
      <div className="reverse-result reverse-result--empty">
        Aucun collège ne correspond à cette sélection.
      </div>
    );
  }

  const uniqueComplete =
    containment && candidates.length === 1 && candidates[0].missing.length === 0;

  let status: { text: string; tone: 'success' | 'info' | 'warn' };
  if (uniqueComplete) {
    status = { text: 'Collège de secteur identifié', tone: 'success' };
  } else if (ambiguous) {
    status = {
      text: `${candidates.length} collèges partagent exactement ce secteur`,
      tone: 'info',
    };
  } else if (!containment) {
    status = {
      text: "Aucun collège n'a tous ces lycées en secteur 1",
      tone: 'warn',
    };
  } else {
    status = {
      text: `${candidates.length} collège${candidates.length > 1 ? 's' : ''} compatible${candidates.length > 1 ? 's' : ''}`,
      tone: 'info',
    };
  }

  return (
    <div className="reverse-result">
      <div className={`reverse-status reverse-status--${status.tone}`}>{status.text}</div>

      {ambiguous && (
        <p className="reverse-note">
          Ces collèges ont le même secteur de lycées : les lycées seuls ne
          permettent pas de les distinguer.
        </p>
      )}
      {!containment && (
        <p className="reverse-note">
          Vérifiez votre liste : un lycée saisi n'appartient peut-être pas à
          votre secteur. Voici les collèges au meilleur recouvrement.
        </p>
      )}
      {containment && !uniqueComplete && !ambiguous && (
        <p className="reverse-note">
          Ajoutez d'autres lycées de secteur 1 pour affiner le résultat.
        </p>
      )}

      <ul className="reverse-college-list">
        {candidates.map((c) => (
          <li className="reverse-college" key={c.uai}>
            <div className="reverse-college-head">
              <span className="reverse-college-name">{c.nom}</span>
              <span className="reverse-college-score">
                {c.matched}/{c.total} lycées
              </span>
            </div>
            {c.missing.length > 0 && (
              <div className="reverse-college-missing">
                Autres lycées de ce secteur : {c.missing.map((m) => m.nom).join(', ')}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
