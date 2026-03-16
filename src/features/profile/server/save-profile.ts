import { mapProfileWriteToDb } from '../services/profile.mapper';
import type { ProfileWritePayload, SaveDraftInput } from '@/features/profile/types/profile.types';

export function buildProfileWritePayload(input: SaveDraftInput): ProfileWritePayload {
  return mapProfileWriteToDb(input);
}

export async function saveProfile(_input: SaveDraftInput): Promise<{ status: 'draft' }> {
  void _input;

  return { status: 'draft' };
}
