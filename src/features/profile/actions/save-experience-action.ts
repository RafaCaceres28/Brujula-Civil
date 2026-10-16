'use server';

import { getCurrentUser } from '@/features/auth/server/get-current-user';
import { createDomainError } from '../../../lib/contracts/domain-error';
import { domainFailure, type DomainResult } from '../../../lib/contracts/domain-result';
import type { StructuredExperience } from '@/features/translation/schemas/structured-experience.schema';
import {
  createExperienceInputSchema,
  editExperienceInputSchema,
} from '../schemas/save-experience.schema';
import { saveExperience } from '../server/save-experience';

async function executeExperienceAction(
  operation: 'create' | 'edit',
  input: unknown,
): Promise<DomainResult<{ experience: StructuredExperience }>> {
  const parsed = (
    operation === 'create' ? createExperienceInputSchema : editExperienceInputSchema
  ).safeParse(input);
  if (!parsed.success)
    return domainFailure(
      createDomainError({ code: 'VALIDATION_ERROR', message: 'Comando de experiencia invalido' }),
    );
  try {
    const user = await getCurrentUser();
    if (!user)
      return domainFailure(
        createDomainError({
          code: 'UNAUTHORIZED',
          message: 'Inicia sesion para guardar experiencias',
        }),
      );
    return await saveExperience(user.id, { ...parsed.data, operation });
  } catch {
    return domainFailure(
      createDomainError({
        code: 'EXTERNAL_DEPENDENCY_ERROR',
        message: 'No se pudo verificar la sesion',
        retryable: true,
      }),
    );
  }
}

export async function createExperienceAction(input: unknown) {
  return executeExperienceAction('create', input);
}

export async function editExperienceAction(input: unknown) {
  return executeExperienceAction('edit', input);
}
