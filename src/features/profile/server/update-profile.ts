import type { SaveDraftInput } from '@/features/profile/types/profile.types';
import { saveProfile } from './save-profile';

export async function updateProfile(input: SaveDraftInput) {
  void (await saveProfile(input));
}
