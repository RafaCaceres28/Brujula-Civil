import { createDomainError } from '../../../lib/contracts/domain-error';
import type { createClient } from '@/lib/supabase/server';
import type { MilitaryProfileUpdate } from '../types/profile.types';

export async function updateMilitarySnapshot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  snapshot: { id: string; raw_profile_jsonb: unknown },
  fields: MilitaryProfileUpdate,
): Promise<void> {
  const { data, error } = await supabase
    .from('user_military_profiles')
    .update(fields)
    .eq('id', snapshot.id)
    .eq('user_id', userId)
    .eq('is_current', true)
    // Guard the original DB value, not the schema's normalized output.
    .filter('raw_profile_jsonb', 'eq', JSON.stringify(snapshot.raw_profile_jsonb))
    .select('id');

  if (error) {
    throw new Error(
      'Error user_military_profiles (update current military profile): error de persistencia en base de datos',
    );
  }
  if (data?.length !== 1) {
    throw createDomainError({
      code: 'CONFLICT',
      message: 'El perfil ha cambiado; recarga antes de guardar',
      retryable: true,
    });
  }
}
