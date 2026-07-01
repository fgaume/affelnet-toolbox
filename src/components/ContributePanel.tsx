import {
  useState,
  useCallback,
  useRef,
  type DragEvent,
  type ChangeEvent,
} from "react";
import { uploadFile, type UploadResult } from "../services/uploadApi";
import "./ContributePanel.css";

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface UploadState {
  status: UploadStatus;
  result?: UploadResult;
  error?: string;
}

export const ContributePanel = () => {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
  });
  const [isDragOver, setIsDragOver] = useState(false);
  const [currentYear] = useState(() => new Date().getFullYear());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const doUpload = useCallback(async (file: File) => {
    setUploadState({ status: "uploading" });
    try {
      const result = await uploadFile(file);
      setUploadState({ status: "success", result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setUploadState({ status: "error", error: message });
    }
  }, []);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) doUpload(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [doUpload],
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) doUpload(file);
    },
    [doUpload],
  );

  const resetState = useCallback(() => {
    setUploadState({ status: "idle" });
  }, []);

  return (
    <div className="contribute-panel">
      {/* Titre avec l'année courante dynamique */}
      <h2 className="contribute-title">
        Contribuer aux données Affelnet {currentYear}
      </h2>

      <div className="contribute-description">
        <p>
          Cette section vous permet de contribuer à cet outil en envoyant les
          données indispensables à son fonctionnement :{" "}
          <b>les seuils d'admission</b> aux lycées et les <b>notes</b>{" "}
          nécessaires au calcul du score Affelnet. Ces données se trouvent sur
          votre <b>fiche-barème</b>, qu'il faut demander dès que votre
          affectation a été prononcée via{" "}
          <a
            href="https://demarche.numerique.gouv.fr/commencer/academie-de-paris-demande-de-fiche-bareme-2026"
            target="_blank"
            rel="noopener noreferrer"
          >
            cette démarche simplifiée en ligne
          </a>
          .
        </p>
        <p>
          Envoyez simplement votre <b>fiche-barème complète</b> (PDF ou photo) :
          nous en extrayons automatiquement toutes les données nécessaires.
        </p>
      </div>

      {/* Status feedback */}
      {uploadState.status === "uploading" && (
        <div className="contribute-status contribute-status--uploading">
          <span className="contribute-spinner" />
          Envoi en cours…
        </div>
      )}
      {uploadState.status === "success" && (
        <div className="contribute-status contribute-status--success">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
          Données envoyées avec succès, merci !
          <button className="contribute-reset" onClick={resetState}>
            Envoyer d'autres données
          </button>
        </div>
      )}
      {uploadState.status === "error" && (
        <div className="contribute-status contribute-status--error">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          {uploadState.error}
          <button className="contribute-reset" onClick={resetState}>
            Réessayer
          </button>
        </div>
      )}

      {uploadState.status !== "uploading" &&
        uploadState.status !== "success" && (
          <div className="contribute-sections">
            {/* Envoi de la fiche-barème (PDF ou image) */}
            <section className="contribute-section">
              <h3>
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="18"
                  height="18"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
                </svg>
                Fiche-barème au format PDF ou image
              </h3>
              <div
                className={`contribute-dropzone${isDragOver ? " contribute-dropzone--active" : ""}`}
                role="button"
                tabIndex={0}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="32"
                  height="32"
                >
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                </svg>
                <span>Glissez un fichier ici ou cliquez pour choisir</span>
                <span className="contribute-dropzone-hint">
                  PDF, PNG, JPG, WEBP, max 10 Mo
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={handleFileChange}
                  hidden
                />
              </div>
            </section>
          </div>
        )}
    </div>
  );
};
