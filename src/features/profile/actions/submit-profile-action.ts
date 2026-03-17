import { submitProfileInputSchema } from '../schemas/profile.schema';
import { ProfileActionError, type SubmitProfileActionResult } from '../types/profile.types';
import { submitProfile } from '../server/submit-profile';
import { ZodError } from 'zod';

export async function submitProfileAction(rawInput: unknown): Promise<SubmitProfileActionResult> {
  try {
    const input = submitProfileInputSchema.parse(rawInput);
    return await submitProfile(input);
  } catch (error) {
    if (error instanceof ProfileActionError) {
      throw error;
    }

    if (error instanceof ZodError) {
      throw new ProfileActionError('validation', 'Invalid profile submit input', {
        cause: error,
      });
    }

    throw new ProfileActionError('domain', 'Failed to submit profile', {
      cause: error,
    });
  }
}
