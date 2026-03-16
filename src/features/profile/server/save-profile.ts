import type { SaveDraftInput } from '@/features/profile/types/profile.types';

export async function saveProfile(_input: SaveDraftInput): Promise<{ status: 'draft' }> {
  void _input;

  return { status: 'draft' };
}
