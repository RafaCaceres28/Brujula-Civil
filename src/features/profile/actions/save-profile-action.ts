'use server';

import {
  createValidationDomainError,
  domainFailure,
  domainSuccess,
  toInternalDomainError,
} from '../../../lib/contracts/index';
import { saveDraftInputSchema } from '../schemas/profile.schema';
import { ProfileActionError, type SaveDraftActionResult } from '../types/profile.types';
import { saveProfile } from '../server/save-profile';
import { requireUser } from '../../auth/server/require-user';

export async function saveDraftAction(rawInput: unknown): Promise<SaveDraftActionResult> {
  const parsedInput = saveDraftInputSchema.safeParse(rawInput);

  if (!parsedInput.success) {
    const result = domainFailure(
      createValidationDomainError('Invalid profile draft input', {
        issues: parsedInput.error.issues,
      }),
    );

    throw new ProfileActionError('validation', result.error.message, {
      cause: parsedInput.error,
    });
  }

  const user = await requireUser();

  try {
    const result = domainSuccess(await saveProfile({ ...parsedInput.data, userId: user.id }));
    return result.data;
  } catch (error) {
    const result = domainFailure(toInternalDomainError(error, 'Failed to save profile draft'));

    throw new ProfileActionError('domain', result.error.message, {
      cause: error,
    });
  }
}

export const saveProfileAction = saveDraftAction;
