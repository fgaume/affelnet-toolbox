import { useState, useEffect, useCallback } from "react";
import "./DisclaimerModal.css";

const DISCLAIMER_KEY = "disclaimer_seen";

export function DisclaimerModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(DISCLAIMER_KEY);
    if (!seen) {
      setVisible(true);
    }
  }, []);

  const handleClose = useCallback(() => {
    localStorage.setItem(DISCLAIMER_KEY, "true");
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className="disclaimer-overlay" role="button" tabIndex={0} onClick={handleClose} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClose(); } }}>
      <div className="disclaimer-modal" role="button" tabIndex={-1} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <h2 className="disclaimer-title">IMPORTANT !</h2>
        <ul className="disclaimer-list">
          <li>
            Cette application est encore expérimentale et incomplète, elle ne
            peut pas prétendre à estimer votre futur score / barème Affelnet
            2026.
          </li>
          <li>
            Les statistiques académiques ne sont évidemment pas connues, mais
            pour se faire une idée j'en ai modélisé 2, en plus de celles de l'an
            dernier (qui n'ont que peu de sens car elles s'appliquaient à des
            notes « tranchées » qui ne le sont plus). Les 3 sont sélectionnables
            pour comparer.
          </li>
          <li>
            Le coefficient de pondération scolaire ne sera que très tardivement
            connu (c'est-à-dire courant juin) donc l'application propose de le
            faire varier à loisirs pour se rendre compte de l'impact.
          </li>
          <li>
            N'hésitez pas à formuler vos remarques/critiques tant sur le fond
            que sur la forme via le chat{" "}
            <a
              href="https://substack.com/chat/7785356"
              target="_blank"
              rel="noopener noreferrer"
            >
              substack.com/chat
            </a>{" "}
            (cela nécessite de s'abonner gratuitement sur{" "}
            <a
              href="https://fgaume.substack.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              fgaume.substack.com
            </a>
            ).
          </li>
        </ul>
        <button className="disclaimer-close" onClick={handleClose}>
          J'ai compris
        </button>
      </div>
    </div>
  );
}
