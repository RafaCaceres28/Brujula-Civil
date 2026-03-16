import { FIRST_WIZARD_DB_STEP } from '@/features/wizard/config/wizard-steps';
import type { AppUserProfileInsert } from '@/features/profile/types/profile.types';
import { createClient } from '@/lib/supabase/server';

export async function ensureUserBootstrap(userId: string) {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from('app_user_profiles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Error checking app_user_profiles: ${profileError.message}`);
  }

  if (!profile) {
    const {
      data: { user },
      error: authUserError,
    } = await supabase.auth.getUser();

    if (authUserError) {
      throw new Error(`Error loading auth user during bootstrap: ${authUserError.message}`);
    }

    const insertProfilePayload: AppUserProfileInsert = {
      user_id: userId,
      email: user?.email ?? null,
      display_name: user?.user_metadata?.display_name ?? null,
    };

    const { error: insertProfileError } = await supabase
      .from('app_user_profiles')
      .insert(insertProfilePayload);

    if (insertProfileError) {
      throw new Error(`Error creating app_user_profiles row: ${insertProfileError.message}`);
    }
  }

  const { data: wizardState, error: wizardStateError } = await supabase
    .from('user_wizard_state')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (wizardStateError) {
    throw new Error(`Error checking user_wizard_state: ${wizardStateError.message}`);
  }

  if (!wizardState) {
    const now = new Date().toISOString();

    const { error: insertWizardStateError } = await supabase.from('user_wizard_state').insert({
      user_id: userId,
      current_step: FIRST_WIZARD_DB_STEP,
      last_completed_step: null,
      completion_percent: 0,
      is_completed: false,
      aggregated_draft_jsonb: {},
      last_saved_at: now,
    });

    if (insertWizardStateError) {
      throw new Error(`Error creating user_wizard_state row: ${insertWizardStateError.message}`);
    }
  }
}
