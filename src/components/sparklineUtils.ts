// Utilitaire pour filtrer les valeurs invalides (0, null, undefined, 'N/A', etc.)
export const isValidSeuil = (
  y: number | string | null | undefined,
): boolean => {
  if (y == null) return false;
  const val = Number(y);
  return val !== 0 && !Number.isNaN(val);
};

// Fonction à utiliser dans le composant parent pour cacher l'icône/le bouton entier
export const hasValidSparklineData = (
  seuils?: readonly (number | string | null | undefined)[] | null,
): boolean => {
  if (!seuils) return false;
  return seuils.some(isValidSeuil);
};
