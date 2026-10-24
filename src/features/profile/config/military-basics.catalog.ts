// Local to /perfil-militar: these options do not extend the wizard contracts.
export const MILITARY_BASICS_BRANCH_OPTIONS = [
  { value: 'army', label: 'Ejército de Tierra' },
  { value: 'navy', label: 'Armada' },
  { value: 'air_force', label: 'Ejército del Aire y del Espacio' },
] as const;

export const MILITARY_BASICS_RANK_OPTIONS = [
  { value: 'soldier', label: 'Soldado', persistedLabel: 'Soldado' },
  { value: 'sailor', label: 'Marinero', persistedLabel: 'Marinero' },
  { value: 'corporal', label: 'Cabo', persistedLabel: 'Cabo' },
  // Same rank, different display spelling; preserve the existing stored representation.
  { value: 'p_corporal', label: 'Cabo Primero', persistedLabel: 'Cabo 1º' },
] as const;

export function militaryBasicsRankOptions(branch: string | null) {
  if (!MILITARY_BASICS_BRANCH_OPTIONS.some((option) => option.value === branch)) return [];
  return MILITARY_BASICS_RANK_OPTIONS.filter((option) =>
    branch === 'navy' ? option.value !== 'soldier' : option.value !== 'sailor',
  );
}

export function militaryBasicsCombinationAllowed(branch: string | null, rank: string | null) {
  if (branch === null) return rank === null;
  const options = militaryBasicsRankOptions(branch);
  return (
    options.length > 0 && (rank === null || options.some((item) => item.persistedLabel === rank))
  );
}

export const MILITARY_BASICS_COMBINATION_ERROR =
  'Selecciona un ejército y un empleo compatible, o borra explícitamente el empleo.';
