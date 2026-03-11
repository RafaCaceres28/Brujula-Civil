export type WizardStepKeyDb =
  | 'welcome'
  | 'personal_info'
  | 'military_background'
  | 'missions_achievements'
  | 'skills_tools'
  | 'education_certifications'
  | 'preferences'
  | 'civil_translation'
  | 'cv_customization'
  | 'linkedin_customization'
  | 'review'
  | 'completed';

export type AppUserProfileRow = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  locale: string;
  timezone: string;
  onboarding_completed: boolean;
  marketing_opt_in: boolean;
  created_at: string;
  updated_at: string;
};

export type UserWizardStateRow = {
  user_id: string;
  current_step: WizardStepKeyDb;
  last_completed_step: WizardStepKeyDb | null;
  completion_percent: number;
  is_completed: boolean;
  aggregated_draft_jsonb: Record<string, unknown>;
  started_at: string;
  last_saved_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WizardStepStateRow = {
  id: string;
  user_id: string;
  step_key: WizardStepKeyDb;
  step_order: number;
  is_completed: boolean;
  payload_jsonb: Record<string, unknown>;
  saved_at: string;
  created_at: string;
  updated_at: string;
};

export type UserMilitaryProfileRow = {
  id: string;
  user_id: string;
  is_current: boolean;
  branch: string | null;
  component: string | null;
  rank_text: string | null;
  specialty_text: string | null;
  service_years: number | null;
  latest_unit: string | null;
  latest_role_title: string | null;
  source_text: string | null;
  raw_profile_jsonb: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type UserCivilProfileRow = {
  id: string;
  user_id: string;
  military_profile_id: string;
  version_no: number;
  is_current: boolean;
  status: 'draft' | 'processing' | 'ready' | 'archived' | 'failed';
  target_role: string | null;
  target_sector: string | null;
  headline: string | null;
  summary: string | null;
  structured_profile_jsonb: Record<string, unknown>;
  generator_name: string | null;
  generator_version: string | null;
  prompt_version: string | null;
  created_at: string;
  updated_at: string;
};
