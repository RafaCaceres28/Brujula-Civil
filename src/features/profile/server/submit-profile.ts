import { submitProfileInputSchema } from '../schemas/profile.schema';
import type {
  ProfileLifecycleStatus,
  SubmitProfileResult,
  SubmitProfileInput,
} from '@/features/profile/types/profile.types';

export function transitionProfileStatus(
  currentStatus: ProfileLifecycleStatus,
): ProfileLifecycleStatus {
  if (currentStatus !== 'draft') {
    throw new Error(
      `Invalid profile status transition: expected "draft" as origin, received "${currentStatus}"`,
    );
  }

  return 'submitted';
}

export async function submitProfile(
  input: SubmitProfileInput,
  currentStatus: ProfileLifecycleStatus = 'draft',
): Promise<SubmitProfileResult> {
  submitProfileInputSchema.parse(input);

  const status = transitionProfileStatus(currentStatus);

  return { status };
}
