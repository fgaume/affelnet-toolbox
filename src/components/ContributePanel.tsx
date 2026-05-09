import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ClipboardEvent,
  type DragEvent,
  type ChangeEvent,
} from "react";
import { uploadFile, type UploadResult } from "../services/uploadApi";
import "./ContributePanel.css";

// Imports des GIFs d'instruction
import harmoGif from "../assets/images/tableau-harmo.gif";
import voeuxGif from "../assets/images/tableau-voeux.gif";

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
  const [pasteText, setPasteText] = useState("");
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

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

  const handlePasteImage = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const ext = file.type.split("/")[1] ?? "png";
            const named = new File([file], `capture.${ext}`, {
              type: file.type,
            });
            doUpload(named);
          }
          return;
        }
      }
    },
    [doUpload],
  );

  const handleSendText = useCallback(() => {
    const trimmed = pasteText.trim();
    if (!trimmed) return;
    const blob = new Blob([trimmed], { type: "text/plain" });
    const file = new File([blob], "fiche-bareme.txt", { type: "text/plain" });
    doUpload(file);
    setPasteText("");
  }, [pasteText, doUpload]);

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
          Cette section vous permet de contribuer à cet outil en saisissant les
          données indispensables à son fonctionnement :{" "}
          <b>les seuils d'admission</b> aux lycées et les{" "}
          <b>notes harmonisées</b> nécessaires au calcul du score Affelnet. Ces
          données se retrouvent facilement sur votre <b>fiche-barème</b> qu'il
          faut demander dès que votre affectation a été prononcée via{" "}
          <a
            href="https://www.demarches-simplifiees.fr/commencer/demande-de-fiche-bareme"
            target="_blank"
            rel="noopener noreferrer"
          >
            cette démarche simplifiée en ligne
          </a>
          .
        </p>
        <p>Vous pouvez ici :</p>
        <ul>
          <li>
            copier-coller le contenu du tableau des vœux (qui contient le barème
            du dernier admis qui nous intéresse) et envoyer les données.
          </li>
          <li>
            puis copier-coller le contenu du tableau des notes harmonisées des
            champs disciplinaires et envoyer les données.
          </li>
          <li>
            ou bien simplement envoyer directement la fiche-barème reçue du
            Rectorat.
          </li>
        </ul>
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
            {/* Section 1: Paste text */}
            <section className="contribute-section">
              <h3>
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="18"
                  height="18"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
                </svg>
                Copier/coller des données textuelles de la fiche barème
              </h3>

              <div
                className="contribute-instructions-gifs"
                style={{
                  display: "flex",
                  gap: "1rem",
                  marginBottom: "1rem",
                  marginTop: "0.5rem",
                }}
              >
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontSize: "0.85rem",
                      marginBottom: "0.5rem",
                      fontWeight: "bold",
                    }}
                  >
                    Zone du tableau des notes à sélectionner :
                  </p>
                  <img
                    src={harmoGif}
                    alt="Zone à copier pour le tableau des notes harmonisées"
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                    }}
                  />
                </div>
                <div style={{ flex: 2 }}>
                  <p
                    style={{
                      fontSize: "0.85rem",
                      marginBottom: "0.5rem",
                      fontWeight: "bold",
                    }}
                  >
                    Zone du tableau des vœux à sélectionner :
                  </p>
                  <img
                    src={voeuxGif}
                    alt="Zone à copier pour le tableau des vœux"
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                    }}
                  />
                </div>
              </div>

              <textarea
                className="contribute-textarea"
                placeholder="Collez ici le contenu texte de votre fiche-barème (sélectionnez le contenu du tableau des vœux ou des notes harmonisées en suivant les animations ci-dessus et copiez-collez-le ici)"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={6}
              />
              <button
                className="contribute-send-btn"
                disabled={!pasteText.trim()}
                onClick={handleSendText}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="16"
                  height="16"
                >
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
                Envoyer les données
              </button>
            </section>

            {/* Section 2: File upload */}
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
                Fichier-barème au format PDF ou image
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

            {/* Section 3: Paste image */}
            <section className="contribute-section">
              <h3>
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="18"
                  height="18"
                >
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                </svg>
                Coller une image (copie d'écran, photo de fiche-barème copiée,
                etc.)
              </h3>
              <div
                className="contribute-paste-zone"
                role="button"
                tabIndex={0}
                onPaste={handlePasteImage}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); } }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="24"
                  height="24"
                >
                  <path d="M19 2h-4.18C14.4.84 13.3 0 12 0c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z" />
                </svg>
                <span>Cliquez ici puis collez (Ctrl+V / Cmd+V)</span>
                <span className="contribute-dropzone-hint">
                  Copie d'écran Mac/Windows, copie depuis Aperçu, iPhone…
                </span>
              </div>
            </section>
          </div>
        )}
    </div>
  );
};
