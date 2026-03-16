import type {
  AppUserProfileRow,
  UserCivilProfileRow,
  UserMilitaryProfileRow,
} from '@/types/database.types';

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

export type ProfileRow = {
  userId: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  city: string | null;
  locale: string;
  timezone: string;
  military: {
    rank: string | null;
    area: string | null;
    yearsOfService: number | null;
    summary: string | null;
  };
  civil: {
    targetRole: string | null;
    targetSector: string | null;
    headline: string | null;
    summary: string | null;
    status: UserCivilProfileRow['status'] | null;
  };
};

export type MilitaryBackground = {
  rank: string | null;
  area: string | null;
  yearsOfService: number | null;
  summary: string | null;
};

export type CivilianTarget = {
  targetRole: string | null;
  targetSector: string | null;
  locationPreference: string | null;
};

export type UserProfile = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  militaryBackground: MilitaryBackground;
  civilianTarget: CivilianTarget;
};

export type ProfileFormValues = {
  fullName: string;
  email: string;
  phone: string;
  city: string;
};

export type SaveProfileInput = {
  userId: string;
  profile: ProfileFormValues;
};

export type ProfileSummaryViewModel = {
  fullName: string;
  primaryGoal: string;
  location: string;
};
