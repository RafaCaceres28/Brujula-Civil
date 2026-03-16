import type {
  AppUserProfileRow,
  UserCivilProfileRow,
  UserMilitaryProfileRow,
} from '@/types/database.types';
import type {
  CivilianTargetSchemaInput,
  MilitaryBackgroundSchemaInput,
  ProfileFormValuesSchemaInput,
  ProfileReadOutputSchemaInput,
  SaveDraftInputSchemaInput,
  SaveProfileInputSchemaInput,
  SubmitProfileInputSchemaInput,
} from '../schemas/profile.schema';

type DbGeneratedColumns = 'id' | 'created_at' | 'updated_at';
type AppUserProfileOptionalDefaults =
  | 'locale'
  | 'timezone'
  | 'onboarding_completed'
  | 'marketing_opt_in';

export type ProfileSupabaseShape = {
  app: AppUserProfileRow | null;
  military: UserMilitaryProfileRow | null;
  civil: UserCivilProfileRow | null;
};

export type AppUserProfileInsert = Omit<
  AppUserProfileRow,
  DbGeneratedColumns | AppUserProfileOptionalDefaults
> &
  Partial<Pick<AppUserProfileRow, AppUserProfileOptionalDefaults>>;

export type MilitaryProfileInsert = Omit<UserMilitaryProfileRow, DbGeneratedColumns>;

export type MilitaryProfileUpdate = Partial<
  Omit<UserMilitaryProfileRow, DbGeneratedColumns | 'user_id' | 'is_current'>
>;

export type CivilProfileInsert = Omit<UserCivilProfileRow, DbGeneratedColumns>;

export type CivilProfileUpdate = Partial<
  Omit<UserCivilProfileRow, DbGeneratedColumns | 'user_id' | 'version_no' | 'is_current'>
>;

export type ProfileRow = ProfileReadOutputSchemaInput;

export type MilitaryBackground = MilitaryBackgroundSchemaInput;

export type CivilianTarget = CivilianTargetSchemaInput;

export type UserProfile = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  militaryBackground: MilitaryBackground;
  civilianTarget: CivilianTarget;
};

export type ProfileFormValues = ProfileFormValuesSchemaInput;

export type SaveDraftInput = SaveDraftInputSchemaInput;

export type SubmitProfileInput = SubmitProfileInputSchemaInput;

export type SaveProfileInput = SaveProfileInputSchemaInput;

export type ProfileLifecycleStatus = 'draft' | 'submitted';

export type ProfileReadOutput = ProfileReadOutputSchemaInput;

export type ProfileSummaryViewModel = {
  fullName: string;
  primaryGoal: string;
  location: string;
};
