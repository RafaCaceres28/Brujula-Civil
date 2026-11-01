'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/features/auth/server/get-current-user';
import { domainFailure, type DomainResult } from '../../../lib/contracts/domain-result';
import { routes } from '../../../lib/constants/routes';
import type { ContactDetailsRow } from '../schemas/contact-details.schema';
import { saveContactDetails } from '../server/contact-details';

export async function saveContactDetailsAction(
  input: unknown,
): Promise<DomainResult<ContactDetailsRow>> {
  try {
    const user = await getCurrentUser();
    if (!user)
      return domainFailure({
        code: 'UNAUTHORIZED',
        message: 'Inicia sesión para guardar tus datos de contacto.',
      });
    const result = await saveContactDetails(user.id, input);
    if (result.ok) {
      revalidatePath(routes.app.contactDetails);
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
