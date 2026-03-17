import { saveDraftInputSchema } from '../schemas/profile.schema';
import { ProfileActionError, type SaveDraftActionResult } from '../types/profile.types';
import { saveProfile } from '../server/save-profile';
import { ZodError } from 'zod';

export async function saveDraftAction(rawInput: unknown): Promise<SaveDraftActionResult> {
  try {
    const input = saveDraftInputSchema.parse(rawInput);
    return await saveProfile(input);
  } catch (error) {
    if (error instanceof ProfileActionError) {
      throw error;
    }

    if (error instanceof ZodError) {
      throw new ProfileActionError('validation', 'Invalid profile draft input', {
        cause: error,
      });
    }

    throw new ProfileActionError('domain', 'Failed to save profile draft', {
      cause: error,
    });
  }
}

export const saveProfileAction = saveDraftAction;
