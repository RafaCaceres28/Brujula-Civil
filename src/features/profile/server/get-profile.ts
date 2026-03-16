import { mapDbToDomainProfile } from '../services/profile.mapper';
import type {
  ProfileDomainModel,
  ProfileReadOutput,
  ProfileSupabaseShape,
} from '@/features/profile/types/profile.types';
import { createClient } from '@/lib/supabase/server';
import type { UserCivilProfileRow, UserMilitaryProfileRow } from '@/types/database.types';

type QueryError = {
  message?: string;
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function formatQueryError(table: string, operation: string, error: QueryError): Error {
  const detail = error.message ? `: ${error.message}` : '';
  return new Error(`Error loading ${table} (${operation})${detail}`);
}

async function loadCurrentMilitaryProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserMilitaryProfileRow | null> {
  const { data, error } = await supabase
    .from('user_military_profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('is_current', true)
    .order('updated_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1);

  if (error) {
    throw formatQueryError('user_military_profiles', 'select current military profile', error);
  }

  return data?.[0] ?? null;
}

async function loadCurrentCivilProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserCivilProfileRow | null> {
  const currentQuery = await supabase
    .from('user_civil_profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('is_current', true)
    .order('version_no', { ascending: false })
    .order('updated_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1);

  if (currentQuery.error) {
    throw formatQueryError(
      'user_civil_profiles',
      'select current civil profile',
      currentQuery.error,
    );
  }

  const currentProfile = currentQuery.data?.[0] ?? null;
  if (currentProfile) {
    return currentProfile;
  }

  const fallbackQuery = await supabase
    .from('user_civil_profiles')
    .select('*')
    .eq('user_id', userId)
    .order('version_no', { ascending: false })
    .order('updated_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1);

  if (fallbackQuery.error) {
    throw formatQueryError(
      'user_civil_profiles',
      'select fallback civil profile',
      fallbackQuery.error,
    );
  }

  return fallbackQuery.data?.[0] ?? null;
}

export function projectProfileFromPersistence(
  userId: string,
  shape: ProfileSupabaseShape,
): ProfileDomainModel {
  return mapDbToDomainProfile(userId, shape);
}

export async function getProfile(userId: string): Promise<ProfileReadOutput | null> {
  const supabase = await createClient();

  const { data: appProfile, error: appError } = await supabase
    .from('app_user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (appError) {
    throw formatQueryError('app_user_profiles', 'select base profile', appError);
  }

  if (!appProfile) {
    return null;
  }

  const [military, civil] = await Promise.all([
    loadCurrentMilitaryProfile(supabase, userId),
    loadCurrentCivilProfile(supabase, userId),
  ]);

  return projectProfileFromPersistence(userId, {
    app: appProfile,
    military,
    civil,
  });
}
