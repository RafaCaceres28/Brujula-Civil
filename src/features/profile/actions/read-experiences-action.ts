'use server';

import { getCurrentUser } from '@/features/auth/server/get-current-user';
import type { StructuredExperience } from '@/features/translation/schemas/structured-experience.schema';
import {
  domainFailure,
  domainSuccess,
  type DomainResult,
} from '../../../lib/contracts/domain-result';
import { getProfile } from '../server/get-profile';

export async function readExperiencesAction(): Promise<
  DomainResult<{ experiences: StructuredExperience[] }>
> {
  try {
    const user = await getCurrentUser();
    if (!user)
      return domainFailure({
        code: 'UNAUTHORIZED',
        message: 'Inicia sesión para consultar tu historial.',
      });
    const profile = await getProfile(user.id);
    if (!profile)
      return domainFailure({
        code: 'NOT_FOUND',
        message: 'No se pudo encontrar tu perfil. Reintenta la lectura.',
      });
    return domainSuccess({ experiences: profile.careerHistory?.experiences ?? [] });
  } catch {
    return domainFailure({
      code: 'EXTERNAL_DEPENDENCY_ERROR',
      message: 'No se pudo cargar el historial. Tu borrador se conserva.',
      retryable: true,
    });
  }
}
