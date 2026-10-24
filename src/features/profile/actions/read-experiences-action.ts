'use server';

import { unstable_rethrow } from 'next/navigation';
import { getCurrentUser } from '@/features/auth/server/get-current-user';
import type { StructuredExperience } from '@/features/translation/schemas/structured-experience.schema';
import {
  domainFailure,
  domainSuccess,
  type DomainResult,
} from '../../../lib/contracts/domain-result';
import { readCareerHistory } from '../server/read-career-history';

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
    const result = await readCareerHistory(user.id);
    if (!result.ok) return result;
    return domainSuccess({
      experiences: result.data.state === 'ready' ? result.data.careerHistory.experiences : [],
    });
  } catch (error) {
    unstable_rethrow(error);
    return domainFailure({
      code: 'EXTERNAL_DEPENDENCY_ERROR',
      message: 'No se pudo cargar el historial. Tu borrador se conserva.',
      retryable: true,
    });
  }
}
