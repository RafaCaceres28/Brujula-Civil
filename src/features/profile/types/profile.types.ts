export type ProfileRow = unknown;

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
