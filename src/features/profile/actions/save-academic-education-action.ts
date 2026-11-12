'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/features/auth/server/get-current-user';
import { domainFailure, type DomainResult } from '../../../lib/contracts/domain-result';
import { routes } from '../../../lib/constants/routes';
import type { AcademicEducation } from '../schemas/academic-education.schema';
import { saveAcademicEducation } from '../server/academic-education';

export async function saveAcademicEducationAction(
  input: unknown,
): Promise<DomainResult<AcademicEducation>> {
  try {
    const user = await getCurrentUser();
    if (!user)
      return domainFailure({
        code: 'UNAUTHORIZED',
        message: 'Inicia sesión para guardar tus estudios.',
      });
    const result = await saveAcademicEducation(user.id, input);
    if (result.ok) {
      revalidatePath(routes.app.academicEducation);
      revalidatePath(routes.app.cvDraft);
    }
    return result;
  } catch (error) {
    unstable_rethrow(error);
    return domainFailure({
      code: 'EXTERNAL_DEPENDENCY_ERROR',
      message: 'No se pudo confirmar el guardado. Tus cambios se conservan en el formulario.',
      retryable: true,
    });
  }
}
