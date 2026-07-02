import { useState, useEffect, useCallback } from "react";
import {
  fetchMissingSeuilLycees,
  type MissingSeuilLycee,
} from "../services/seuilsApi";
import { submitSeuil } from "../services/uploadApi";
import "./SeuilContributionForm.css";

const SEUIL_MIN = 400;
const SEUIL_MAX = 42000;

type Status = "idle" | "submitting" | "success" | "error";

export function SeuilContributionForm() {
  const [isBoursier, setIsBoursier] = useState(false);
  const [lycees, setLycees] = useState<MissingSeuilLycee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState("");
  const [seuil, setSeuil] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  // (Re)charge la liste des lycées manquants quand la catégorie change.
  // Le reset (loading + sélection) est fait dans le handler de catégorie ;
  // l'effet se limite au fetch pour éviter un setState synchrone en tête.
  useEffect(() => {
    let cancelled = false;
    fetchMissingSeuilLycees(isBoursier)
      .then((list) => {
        if (!cancelled) {
          setLycees(list);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLycees([]);
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isBoursier]);

  const changeCategory = useCallback(
    (boursier: boolean) => {
      if (boursier === isBoursier) return;
      setIsLoading(true);
      setSelectedCode("");
      setStatus("idle");
      setIsBoursier(boursier);
    },
    [isBoursier],
  );

  const seuilValue = Number(seuil);
  const seuilValid =
    seuil.trim() !== "" &&
    Number.isFinite(seuilValue) &&
    seuilValue >= SEUIL_MIN &&
    seuilValue <= SEUIL_MAX;
  const canSubmit = selectedCode !== "" && seuilValid && status !== "submitting";

  const handleSubmit = useCallback(async () => {
    const lycee = lycees.find((l) => l.code === selectedCode);
    if (!lycee) return;
    setStatus("submitting");
    setError(null);
    try {
      await submitSeuil({
        code: lycee.code,
        nom: lycee.nom,
        seuil: seuilValue,
        is_boursier: isBoursier,
      });
      setStatus("success");
      setSeuil("");
      setSelectedCode("");
      // Retire le lycée envoyé de la liste pour éviter un doublon immédiat.
      setLycees((prev) => prev.filter((l) => l.code !== lycee.code));
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    }
  }, [lycees, selectedCode, seuilValue, isBoursier]);

  return (
    <section className="seuil-contribution">
      <h3>
        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-2v-4H8v-2h4V8h2v4h4v2z" />
        </svg>
        Ajouter un seuil d'admission manquant
      </h3>
      <p className="seuil-contribution-hint">
        Vous connaissez le barème du dernier entrant 2026 d'un lycée non encore
        renseigné ? Ajoutez-le. Il sera vérifié avant publication.
      </p>

      <div className="seuil-contribution-category" role="radiogroup" aria-label="Catégorie">
        <button
          type="button"
          role="radio"
          aria-checked={!isBoursier}
          className={`seuil-category-btn${!isBoursier ? " active" : ""}`}
          onClick={() => changeCategory(false)}
        >
          Non-boursier
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={isBoursier}
          className={`seuil-category-btn${isBoursier ? " active" : ""}`}
          onClick={() => changeCategory(true)}
        >
          Boursier
        </button>
      </div>

      {isLoading ? (
        <p className="seuil-contribution-empty">Chargement des lycées…</p>
      ) : lycees.length === 0 ? (
        <p className="seuil-contribution-empty">
          Tous les seuils {isBoursier ? "boursiers" : "non-boursiers"} 2026 connus
          sont déjà renseignés. Merci !
        </p>
      ) : (
        <div className="seuil-contribution-fields">
          <label className="seuil-field">
            <span>Lycée</span>
            <select
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value)}
            >
              <option value="">Choisir un lycée…</option>
              {lycees.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nom}
                </option>
              ))}
            </select>
          </label>

          <label className="seuil-field">
            <span>Seuil 2026 (barème du dernier entrant)</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.001"
              min={SEUIL_MIN}
              max={SEUIL_MAX}
              placeholder="ex. 40736.201"
              value={seuil}
              onChange={(e) => setSeuil(e.target.value)}
            />
          </label>

          {seuil.trim() !== "" && !seuilValid && (
            <p className="seuil-contribution-invalid">
              Le seuil doit être un nombre entre {SEUIL_MIN} et {SEUIL_MAX}.
            </p>
          )}

          <button
            type="button"
            className="seuil-contribution-submit"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {status === "submitting" ? "Envoi…" : "Envoyer le seuil"}
          </button>
        </div>
      )}

      {status === "success" && (
        <p className="seuil-contribution-feedback success">
          Merci ! Le seuil a été envoyé pour validation.
        </p>
      )}
      {status === "error" && error && (
        <p className="seuil-contribution-feedback error">{error}</p>
      )}
    </section>
  );
}
