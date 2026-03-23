'use server';

import {
  createValidationDomainError,
  domainFailure,
  domainSuccess,
  toInternalDomainError,
} from '../../../lib/contracts/index';
import { submitProfileInputSchema } from '../schemas/profile.schema';
import { ProfileActionError, type SubmitProfileActionResult } from '../types/profile.types';
import { submitProfile } from '../server/submit-profile';

export async function submitProfileAction(rawInput: unknown): Promise<SubmitProfileActionResult> {
  const parsedInput = submitProfileInputSchema.safeParse(rawInput);

  if (!parsedInput.success) {
    const result = domainFailure(
      createValidationDomainError('Invalid profile submit input', {
        issues: parsedInput.error.issues,
      }),
    );

    throw new ProfileActionError('validation', result.error.message, {
      cause: parsedInput.error,
    });
  }

  try {
    const result = domainSuccess(await submitProfile(parsedInput.data));
    return result.data;
  } catch (error) {
    const result = domainFailure(toInternalDomainError(error, 'Failed to submit profile'));

    throw new ProfileActionError('domain', result.error.message, {
      cause: error,
    });
  }
}
