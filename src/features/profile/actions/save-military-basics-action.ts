'use server';

import { unstable_rethrow } from 'next/navigation';
import { getCurrentUser } from '@/features/auth/server/get-current-user';
import { domainFailure, type DomainResult } from '../../../lib/contracts/domain-result';
import type { MilitaryBasicsRow } from '../schemas/military-basics.schema';
import { saveMilitaryBasics } from '../server/military-basics';

export async function saveMilitaryBasicsAction(
  input: unknown,
): Promise<DomainResult<MilitaryBasicsRow>> {
  try {
    const user = await getCurrentUser();
    if (!user)
      return domainFailure({
        code: 'UNAUTHORIZED',
        message: 'Inicia sesión para guardar tu perfil.',
      });
    return await saveMilitaryBasics(user.id, input);
  } catch (error) {
    unstable_rethrow(error);
    return domainFailure({
      code: 'EXTERNAL_DEPENDENCY_ERROR',
      message: 'No se pudo confirmar el guardado. Tus cambios se conservan en el formulario.',
      retryable: true,
    });
  }
}
