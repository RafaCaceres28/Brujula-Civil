import type { Database as SupabaseDatabase } from '../../supabase/types/database.generated';

export type Database = SupabaseDatabase;

export type AppUserProfilesTable = Database['public']['Tables']['app_user_profiles'];
export type AppUserProfileRow = AppUserProfilesTable['Row'];
export type AppUserProfileInsert = AppUserProfilesTable['Insert'];
export type AppUserProfileUpdate = AppUserProfilesTable['Update'];

export type UserWizardStateTable = Database['public']['Tables']['user_wizard_state'];
export type UserWizardStateRow = UserWizardStateTable['Row'];
export type UserWizardStateInsert = UserWizardStateTable['Insert'];
export type UserWizardStateUpdate = UserWizardStateTable['Update'];

export type WizardStepStatesTable = Database['public']['Tables']['wizard_step_states'];
export type WizardStepStateRow = WizardStepStatesTable['Row'];
export type WizardStepStateInsert = WizardStepStatesTable['Insert'];
export type WizardStepStateUpdate = WizardStepStatesTable['Update'];

export type WizardStepKeyDb = Database['public']['Enums']['wizard_step_key'];
