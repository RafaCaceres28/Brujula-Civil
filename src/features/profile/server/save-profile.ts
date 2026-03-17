import { mapProfileWriteToDb } from '../services/profile.mapper';
import { saveDraftInputSchema } from '../schemas/profile.schema';
import type {
  ProfileWritePayload,
  SaveDraftInput,
  SaveProfileOperationMode,
  SaveProfileResult,
} from '@/features/profile/types/profile.types';
import { createClient } from '@/lib/supabase/server';
import type { UserCivilProfileRow, UserMilitaryProfileRow } from '@/types/database.types';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type QueryError = {
  code?: string;
  message?: string;
};

const UNIQUE_VIOLATION_CODE = '23505';
const MAX_RETRY_ON_CONFLICT = 1;

function formatSaveProfileError(table: string, operation: string, error: QueryError): Error {
  const reason =
    error.code === UNIQUE_VIOLATION_CODE
      ? 'conflicto de concurrencia: existe un registro current para el usuario'
      : 'error de persistencia en base de datos';

  return new Error(`Error ${table} (${operation}): ${reason}`);
}

function isUniqueViolation(error: QueryError | null): boolean {
  return error?.code === UNIQUE_VIOLATION_CODE;
}

function resolveOperationMode(
  militaryMode: 'created' | 'updated',
  civilMode: 'created' | 'updated',
): SaveProfileOperationMode {
  if (militaryMode === civilMode) {
    return militaryMode;
  }

  return 'mixed';
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
    throw formatSaveProfileError(
      'user_military_profiles',
      'select current military profile',
      error,
    );
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
    throw formatSaveProfileError(
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
    throw formatSaveProfileError(
      'user_civil_profiles',
      'select fallback civil profile by version',
      fallbackQuery.error,
    );
  }

  return fallbackQuery.data?.[0] ?? null;
}

async function saveBaseProfile(
  supabase: SupabaseClient,
  payload: ProfileWritePayload,
): Promise<void> {
  const { error } = await supabase
    .from('app_user_profiles')
    .upsert(payload.app, { onConflict: 'user_id' });

  if (error) {
    throw formatSaveProfileError('app_user_profiles', 'upsert base profile', error);
  }
}

async function saveMilitaryProfile(
  supabase: SupabaseClient,
  userId: string,
  payload: ProfileWritePayload,
  retryCount = 0,
): Promise<{ id: string; mode: 'created' | 'updated' }> {
  const currentProfile = await loadCurrentMilitaryProfile(supabase, userId);

  if (currentProfile) {
    const { error } = await supabase
      .from('user_military_profiles')
      .update(payload.military)
      .eq('id', currentProfile.id);

    if (error) {
      throw formatSaveProfileError(
        'user_military_profiles',
        'update current military profile',
        error,
      );
    }

    return {
      id: currentProfile.id,
      mode: 'updated',
    };
  }

  const { data, error } = await supabase
    .from('user_military_profiles')
    .insert({
      user_id: userId,
      is_current: true,
      ...payload.military,
    })
    .select('id')
    .single();

  if (error) {
    if (isUniqueViolation(error) && retryCount < MAX_RETRY_ON_CONFLICT) {
      return saveMilitaryProfile(supabase, userId, payload, retryCount + 1);
    }

    throw formatSaveProfileError(
      'user_military_profiles',
      'insert current military profile',
      error,
    );
  }

  return {
    id: data.id,
    mode: 'created',
  };
}

async function saveCivilProfile(
  supabase: SupabaseClient,
  userId: string,
  militaryProfileId: string,
  payload: ProfileWritePayload,
  retryCount = 0,
): Promise<{ id: string; mode: 'created' | 'updated' }> {
  const currentOrFallback = await loadCurrentCivilProfile(supabase, userId);

  if (currentOrFallback?.is_current) {
    const { error } = await supabase
      .from('user_civil_profiles')
      .update({
        military_profile_id: militaryProfileId,
        ...payload.civil,
        status: 'draft',
      })
      .eq('id', currentOrFallback.id);

    if (error) {
      throw formatSaveProfileError('user_civil_profiles', 'update current civil profile', error);
    }

    return {
      id: currentOrFallback.id,
      mode: 'updated',
    };
  }

  const nextVersionNo = (currentOrFallback?.version_no ?? 0) + 1;

  const { data, error } = await supabase
    .from('user_civil_profiles')
    .insert({
      user_id: userId,
      military_profile_id: militaryProfileId,
      version_no: nextVersionNo,
      is_current: true,
      ...payload.civil,
      status: 'draft',
    })
    .select('id')
    .single();

  if (error) {
    if (isUniqueViolation(error) && retryCount < MAX_RETRY_ON_CONFLICT) {
      return saveCivilProfile(supabase, userId, militaryProfileId, payload, retryCount + 1);
    }

    throw formatSaveProfileError('user_civil_profiles', 'insert current civil profile', error);
  }

  return {
    id: data.id,
    mode: 'created',
  };
}

export function buildProfileWritePayload(input: SaveDraftInput): ProfileWritePayload {
  return mapProfileWriteToDb(input);
}

export async function saveProfile(input: SaveDraftInput): Promise<SaveProfileResult> {
  const parsedInput = saveDraftInputSchema.parse(input);
  const supabase = await createClient();
  const payload = buildProfileWritePayload(parsedInput);

  await saveBaseProfile(supabase, payload);

  const military = await saveMilitaryProfile(supabase, parsedInput.userId, payload);
  const civil = await saveCivilProfile(supabase, parsedInput.userId, military.id, payload);

  return {
    status: 'draft',
    militaryProfileId: military.id,
    civilProfileId: civil.id,
    operationMode: resolveOperationMode(military.mode, civil.mode),
  };
}
