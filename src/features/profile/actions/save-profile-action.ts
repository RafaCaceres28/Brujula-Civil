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

  try {
    const result = domainSuccess(await saveProfile(parsedInput.data));
    return result.data;
  } catch (error) {
    const result = domainFailure(toInternalDomainError(error, 'Failed to save profile draft'));

    throw new ProfileActionError('domain', result.error.message, {
      cause: error,
    });
  }
}

export const saveProfileAction = saveDraftAction;
