import type {
  AppUserProfileInsert,
  CivilProfileInsert,
  MilitaryProfileInsert,
  ProfileRow,
  ProfileSupabaseShape,
} from '@/features/profile/types/profile.types';

export function mapSupabaseShapeToProfileRow(
  userId: string,
  shape: ProfileSupabaseShape,
): ProfileRow {
  return {
    userId,
    email: shape.app?.email ?? null,
    fullName: shape.app?.display_name ?? null,
    phone: null,
    city: null,
    locale: shape.app?.locale ?? 'es',
    timezone: shape.app?.timezone ?? 'Europe/Madrid',
    military: {
      rank: shape.military?.rank_text ?? null,
      area: shape.military?.component ?? null,
      yearsOfService: shape.military?.service_years ?? null,
      summary: shape.military?.source_text ?? null,
    },
    civil: {
      targetRole: shape.civil?.target_role ?? null,
      targetSector: shape.civil?.target_sector ?? null,
      headline: shape.civil?.headline ?? null,
      summary: shape.civil?.summary ?? null,
      status: shape.civil?.status ?? null,
    },
  };
}

export function mapProfileRowToSupabaseShape(profile: ProfileRow): {
  app: AppUserProfileInsert;
  military: Omit<MilitaryProfileInsert, 'user_id' | 'is_current'>;
  civil: Omit<CivilProfileInsert, 'user_id' | 'military_profile_id' | 'version_no' | 'is_current'>;
} {
  return {
    app: {
      user_id: profile.userId,
      email: profile.email,
      display_name: profile.fullName,
    },
    military: {
      branch: null,
      component: profile.military.area,
      rank_text: profile.military.rank,
      specialty_text: null,
      service_years: profile.military.yearsOfService,
      latest_unit: null,
      latest_role_title: profile.military.rank,
      source_text: profile.military.summary,
      raw_profile_jsonb: {},
    },
    civil: {
      status: profile.civil.status ?? 'draft',
      target_role: profile.civil.targetRole,
      target_sector: profile.civil.targetSector,
      headline: profile.civil.headline,
      summary: profile.civil.summary,
      structured_profile_jsonb: {},
      generator_name: null,
      generator_version: null,
      prompt_version: null,
    },
  };
}
