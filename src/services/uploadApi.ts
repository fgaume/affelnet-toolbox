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
