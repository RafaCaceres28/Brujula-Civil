import { createClient } from '@/lib/supabase/server';

export async function getOnboardingState(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_wizard_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Error loading onboarding state: ${error.message}`);
  }

  return data;
}
