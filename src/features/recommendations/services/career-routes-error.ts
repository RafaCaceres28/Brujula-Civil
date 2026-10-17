import type { DomainError, DomainMeta } from '@/lib/contracts';

// These prefixes are emitted only by the two storage reads in getOnboardingOverview.
export function isOnboardingStorageReadError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.startsWith('Error loading user_wizard_state: ') ||
      error.message.startsWith('Error loading wizard_step_states: '))
  );
}

export function classifyCareerRoutesError(error: DomainError, meta?: DomainMeta) {
  if (error.code === 'VALIDATION_ERROR' && meta?.source === 'recs.server.generate-routes') {
    if (error.message === 'Insufficient structured profile to generate career routes') {
      return 'insufficient_data';
    }
    if (error.message === 'Invalid recommendation input payload') return 'invalid_input';
    if (error.message === 'No compatible career routes found for current profile') {
      return 'unavailable';
    }
    // Output validation and shortlist invariants are NOT missing user data.
    return 'internal';
  }
  if (error.code === 'INTERNAL_ERROR' || error.code === 'VALIDATION_ERROR') return 'internal';
  if (
    error.code === 'EXTERNAL_DEPENDENCY_ERROR' &&
    meta?.source === 'recs.action.get-career-routes' &&
    error.message === 'Unable to read stored onboarding data'
  ) {
    return 'storage';
  }
  if (error.code === 'EXTERNAL_DEPENDENCY_ERROR' || error.code === 'RATE_LIMITED') {
    return 'service';
  }
  return 'unavailable';
}
