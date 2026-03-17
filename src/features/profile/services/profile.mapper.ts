import type {
  ProfileDomainModel,
  ProfileFormInitialValues,
  ProfileSummaryViewModel,
  ProfileSupabaseShape,
  ProfileWritePayload,
} from '@/features/profile/types/profile.types';
import { profileReadOutputSchema } from '../schemas/profile.schema';

const DEFAULT_PROFILE_FULL_NAME = 'Unknown user';
const DEFAULT_PROFILE_EMAIL = 'unknown@example.com';
const SUMMARY_PRIMARY_GOAL_FALLBACK = 'Goal pending';
const SUMMARY_LOCATION_FALLBACK = 'Location pending';

export const PROFILE_SUMMARY_FALLBACKS = {
  fullName: DEFAULT_PROFILE_FULL_NAME,
  primaryGoal: SUMMARY_PRIMARY_GOAL_FALLBACK,
  location: SUMMARY_LOCATION_FALLBACK,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getFirstPreferredLocation(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const target = value.target;
  if (!isRecord(target)) {
    return null;
  }

  const preferredLocations = target.preferredLocations;
  if (!Array.isArray(preferredLocations)) {
    return null;
  }

  const firstLocation = preferredLocations[0];
  return typeof firstLocation === 'string' ? firstLocation : null;
}

function toPreferredLocationsJson(locationPreference: string | null): Record<string, unknown> {
  const preferredLocations = locationPreference ? [locationPreference] : [];

  return {
    target: {
      preferredLocations,
    },
  };
}

export function mapDbToDomainProfile(
  userId: string,
  shape: ProfileSupabaseShape,
): ProfileDomainModel {
  return profileReadOutputSchema.parse({
    userId,
    profile: {
      fullName: shape.app?.display_name ?? DEFAULT_PROFILE_FULL_NAME,
      email: shape.app?.email ?? DEFAULT_PROFILE_EMAIL,
      phone: null,
      city: null,
    },
    militaryBackground: {
      rank: shape.military?.rank_text ?? null,
      area: shape.military?.component ?? null,
      yearsOfService: shape.military?.service_years ?? null,
      summary: shape.military?.source_text ?? null,
    },
    civilianTarget: {
      targetRole: shape.civil?.target_role ?? null,
      targetSector: shape.civil?.target_sector ?? null,
      locationPreference: getFirstPreferredLocation(shape.civil?.structured_profile_jsonb) ?? null,
    },
  });
}

function toInputValue(value: string | null | undefined): string {
  return value ?? '';
}

export function mapDomainToProfileFormInitialValues(
  domain: ProfileDomainModel,
): ProfileFormInitialValues {
  const parsed = profileReadOutputSchema.parse(domain);

  return {
    profile: {
      fullName: parsed.profile.fullName,
      email: parsed.profile.email,
      phone: toInputValue(parsed.profile.phone),
      city: toInputValue(parsed.profile.city),
    },
    militaryBackground: {
      rank: toInputValue(parsed.militaryBackground.rank),
      area: toInputValue(parsed.militaryBackground.area),
      yearsOfService:
        parsed.militaryBackground.yearsOfService === null
          ? ''
          : String(parsed.militaryBackground.yearsOfService),
      summary: toInputValue(parsed.militaryBackground.summary),
    },
    civilianTarget: {
      targetRole: toInputValue(parsed.civilianTarget.targetRole),
      targetSector: toInputValue(parsed.civilianTarget.targetSector),
      locationPreference: toInputValue(parsed.civilianTarget.locationPreference),
    },
  };
}

export const mapDomainToProfileFormValues = mapDomainToProfileFormInitialValues;

export function mapProfileWriteToDb(profile: ProfileDomainModel): ProfileWritePayload {
  const parsed = profileReadOutputSchema.parse(profile);

  return {
    app: {
      user_id: parsed.userId,
      email: parsed.profile.email,
      display_name: parsed.profile.fullName,
    },
    military: {
      branch: null,
      component: parsed.militaryBackground.area,
      rank_text: parsed.militaryBackground.rank,
      specialty_text: null,
      service_years: parsed.militaryBackground.yearsOfService,
      latest_unit: null,
      latest_role_title: parsed.militaryBackground.rank,
      source_text: parsed.militaryBackground.summary,
      raw_profile_jsonb: {},
    },
    civil: {
      status: 'draft',
      target_role: parsed.civilianTarget.targetRole,
      target_sector: parsed.civilianTarget.targetSector,
      headline: null,
      summary: null,
      structured_profile_jsonb: toPreferredLocationsJson(parsed.civilianTarget.locationPreference),
      generator_name: null,
      generator_version: null,
      prompt_version: null,
    },
  };
}

export function mapDomainToProfileSummary(domain: ProfileDomainModel): ProfileSummaryViewModel {
  const parsed = profileReadOutputSchema.parse(domain);

  return {
    fullName: parsed.profile.fullName,
    primaryGoal: parsed.civilianTarget.targetRole ?? PROFILE_SUMMARY_FALLBACKS.primaryGoal,
    location: parsed.civilianTarget.locationPreference ?? PROFILE_SUMMARY_FALLBACKS.location,
  };
}

export const mapSupabaseShapeToProfileRow = mapDbToDomainProfile;
export const mapProfileRowToSupabaseShape = mapProfileWriteToDb;
