const UPLOAD_URL = import.meta.env.VITE_UPLOAD_URL ?? 'http://localhost:8000';

export interface UploadResult {
  filename: string;
  original_filename: string;
  size: number;
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${UPLOAD_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur inconnue' }));
    throw new Error(error.detail ?? `Erreur ${response.status}`);
  }

  return response.json();
}

export interface SeuilSubmission {
  code: string;
  nom: string;
  seuil: number;
  is_boursier: boolean;
}

/** Envoie un seuil saisi à la main en file d'attente de validation côté backend. */
export async function submitSeuil(payload: SeuilSubmission): Promise<void> {
  const response = await fetch(`${UPLOAD_URL}/seuil`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ annee: 2026, ...payload }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur inconnue' }));
    throw new Error(error.detail ?? `Erreur ${response.status}`);
  }
}
