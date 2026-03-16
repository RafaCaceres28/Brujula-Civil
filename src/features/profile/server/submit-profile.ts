import type {
  ProfileLifecycleStatus,
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
): Promise<{ status: ProfileLifecycleStatus }> {
  void input;

  const status = transitionProfileStatus(currentStatus);

  return { status };
}
