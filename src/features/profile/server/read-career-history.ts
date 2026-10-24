import { unstable_rethrow } from 'next/navigation';
import type { CareerHistory } from '@/features/translation/schemas/career-history.schema';
import { domainFailure, domainSuccess, type DomainResult } from '@/lib/contracts/domain-result';
import { createClient } from '@/lib/supabase/server';
import { militaryProfileJsonSchema } from '../services/profile-json';

type CareerHistoryRead =
  | { state: 'missing_profile' | 'missing_history' }
  | { state: 'ready'; careerHistory: CareerHistory };

export async function readCareerHistory(userId: string): Promise<DomainResult<CareerHistoryRead>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('user_military_profiles')
      .select('raw_profile_jsonb')
      .eq('user_id', userId)
      .eq('is_current', true)
      .maybeSingle();

    if (error) {
      return domainFailure({
        code: error.code === 'PGRST116' ? 'INTERNAL_ERROR' : 'EXTERNAL_DEPENDENCY_ERROR',
        message: 'No se pudo leer el historial profesional.',
        retryable: error.code !== 'PGRST116',
      });
    }
    if (!data) return domainSuccess({ state: 'missing_profile' });

    const parsed = militaryProfileJsonSchema.safeParse(data.raw_profile_jsonb);
    if (!parsed.success) {
      return domainFailure({
        code: 'INTERNAL_ERROR',
        message: 'No se pudo validar la integridad del historial profesional.',
        retryable: false,
      });
    }
    if (!parsed.data.careerHistory) return domainSuccess({ state: 'missing_history' });

    return domainSuccess({ state: 'ready', careerHistory: parsed.data.careerHistory });
  } catch (error) {
    unstable_rethrow(error);
    return domainFailure({
      code: 'EXTERNAL_DEPENDENCY_ERROR',
      message: 'No se pudo leer el historial profesional.',
      retryable: true,
    });
  }
}
