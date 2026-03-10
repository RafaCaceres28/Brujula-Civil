'use server';

import { requireUser } from '@/features/auth/server/require-user';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { FIRST_WIZARD_DB_STEP } from '../config/wizard-steps';

export async function resetOnboardingAction() {
  const user = await requireUser();
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error: deleteStepStatesError } = await supabase
    .from('wizard_step_states')
    .delete()
    .eq('user_id', user.id);

  if (deleteStepStatesError) {
    throw new Error(`Error resetting wizard_step_states: ${deleteStepStatesError.message}`);
  }

  const { error: updateWizardStateError } = await supabase
    .from('user_wizard_state')
    .update({
      current_step: FIRST_WIZARD_DB_STEP,
      last_completed_step: null,
      completion_percent: 0,
      is_completed: false,
      aggregated_draft_jsonb: {},
      completed_at: null,
      last_saved_at: now,
    })
    .eq('user_id', user.id);

  if (updateWizardStateError) {
    throw new Error(`Error resetting user_wizard_state: ${updateWizardStateError.message}`);
  }

  const { error: updateProfileError } = await supabase
    .from('app_user_profiles')
    .update({
      onboarding_completed: false,
    })
    .eq('user_id', user.id);

  if (updateProfileError) {
    throw new Error(`Error resetting app_user_profiles: ${updateProfileError.message}`);
  }

  revalidatePath('/dashboard');
  revalidatePath('/onboarding');

  redirect('/onboarding');
}
