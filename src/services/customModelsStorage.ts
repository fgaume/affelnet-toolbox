import type { AcademicStats, DisciplinaryField } from '../types';

export interface CustomStatsModel {
  readonly id: string;
  readonly name: string;
  readonly stats: Readonly<Record<DisciplinaryField, AcademicStats>>;
}

const STORAGE_KEY = 'affelnet-custom-stats-models';
const STORAGE_VERSION = 1;

export function getCustomModels(): CustomStatsModel[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.data)) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    return parsed.data;
  } catch {
    return [];
  }
}

function saveCustomModels(models: readonly CustomStatsModel[]): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, data: models })
    );
  } catch (error) {
    console.error('Erreur sauvegarde modèles personnalisés:', error);
  }
}

export function addCustomModel(model: CustomStatsModel): CustomStatsModel[] {
  const models = getCustomModels();
  const updated = [...models, model];
  saveCustomModels(updated);
  return updated;
}

export function updateCustomModel(id: string, stats: Record<DisciplinaryField, AcademicStats>): CustomStatsModel[] {
  const models = getCustomModels();
  const updated = models.map(m => m.id === id ? { ...m, stats } : m);
  saveCustomModels(updated);
  return updated;
}

export function deleteCustomModel(id: string): CustomStatsModel[] {
  const models = getCustomModels();
  const updated = models.filter(m => m.id !== id);
  saveCustomModels(updated);
  return updated;
}
