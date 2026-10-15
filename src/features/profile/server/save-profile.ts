import { mapProfileWriteToDb } from '../services/profile.mapper';
import { saveDraftInputSchema } from '../schemas/profile.schema';
import { mergeProfileJson, militaryProfileJsonSchema } from '../services/profile-json';
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
  prepared: Awaited<ReturnType<typeof prepareMilitaryProfile>>,
  retryCount = 0,
): Promise<{ id: string; mode: 'created' | 'updated' }> {
  const { currentProfile, fields } = prepared;

  if (currentProfile) {
    const { error } = await supabase
      .from('user_military_profiles')
      .update(fields)
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
      return saveMilitaryProfile(
        supabase,
        userId,
        payload,
        await prepareMilitaryProfile(supabase, userId, payload),
        retryCount + 1,
      );
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
  prepared: Awaited<ReturnType<typeof prepareCivilProfile>>,
  retryCount = 0,
): Promise<{ id: string; mode: 'created' | 'updated' }> {
  const { currentOrFallback, fields } = prepared;

  if (currentOrFallback?.is_current) {
    const { error } = await supabase
      .from('user_civil_profiles')
      .update({
        military_profile_id: militaryProfileId,
        ...fields,
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
      ...fields,
    })
    .select('id')
    .single();

  if (error) {
    if (isUniqueViolation(error) && retryCount < MAX_RETRY_ON_CONFLICT) {
      return saveCivilProfile(
        supabase,
        userId,
        militaryProfileId,
        payload,
        await prepareCivilProfile(supabase, userId, payload),
        retryCount + 1,
      );
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

async function prepareMilitaryProfile(
  supabase: SupabaseClient,
  userId: string,
  payload: ProfileWritePayload,
) {
  const currentProfile = await loadCurrentMilitaryProfile(supabase, userId);
  const existingRaw = militaryProfileJsonSchema.parse(
    currentProfile ? currentProfile.raw_profile_jsonb : {},
  );
  const { raw_profile_jsonb: rawPatch, ...militaryFields } = payload.military;
  return {
    currentProfile,
    fields: {
      ...militaryFields,
      // Validate existing history even on replacement; omission never rewrites raw JSON.
      ...(rawPatch.careerHistory !== undefined
        ? { raw_profile_jsonb: { ...existingRaw, ...rawPatch } }
        : {}),
    },
  };
}

async function prepareCivilProfile(
  supabase: SupabaseClient,
  userId: string,
  payload: ProfileWritePayload,
) {
  const currentOrFallback = await loadCurrentCivilProfile(supabase, userId);
  return {
    currentOrFallback,
    fields: {
      ...payload.civil,
      structured_profile_jsonb: mergeProfileJson(
        currentOrFallback ? currentOrFallback.structured_profile_jsonb : {},
        payload.civil.structured_profile_jsonb,
      ),
      status: 'draft' as const,
    },
  };
}

export async function saveProfile(input: SaveDraftInput): Promise<SaveProfileResult> {
  const parsedInput = saveDraftInputSchema.parse(input);
  const supabase = await createClient();
  const payload = buildProfileWritePayload(parsedInput);
  const preparedMilitary = await prepareMilitaryProfile(supabase, parsedInput.userId, payload);
  const preparedCivil = await prepareCivilProfile(supabase, parsedInput.userId, payload);

  await saveBaseProfile(supabase, payload);

  const military = await saveMilitaryProfile(
    supabase,
    parsedInput.userId,
    payload,
    preparedMilitary,
  );
  const civil = await saveCivilProfile(
    supabase,
    parsedInput.userId,
    military.id,
    payload,
    preparedCivil,
  );

  return {
    status: 'draft',
    militaryProfileId: military.id,
    civilProfileId: civil.id,
    operationMode: resolveOperationMode(military.mode, civil.mode),
  };
}
