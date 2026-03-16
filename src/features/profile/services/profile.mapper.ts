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
  const preferredLocations =
    typeof shape.civil?.structured_profile_jsonb?.target === 'object' &&
    shape.civil?.structured_profile_jsonb?.target !== null &&
    Array.isArray(
      (shape.civil.structured_profile_jsonb.target as { preferredLocations?: unknown })
        .preferredLocations,
    )
      ? ((shape.civil.structured_profile_jsonb.target as { preferredLocations: unknown[] })
          .preferredLocations[0] as string | undefined)
      : null;

  return {
    userId,
    profile: {
      fullName: shape.app?.display_name ?? '',
      email: shape.app?.email ?? '',
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
      locationPreference: preferredLocations ?? null,
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
      email: profile.profile.email,
      display_name: profile.profile.fullName,
    },
    military: {
      branch: null,
      component: profile.militaryBackground.area,
      rank_text: profile.militaryBackground.rank,
      specialty_text: null,
      service_years: profile.militaryBackground.yearsOfService,
      latest_unit: null,
      latest_role_title: profile.militaryBackground.rank,
      source_text: profile.militaryBackground.summary,
      raw_profile_jsonb: {},
    },
    civil: {
      status: 'draft',
      target_role: profile.civilianTarget.targetRole,
      target_sector: profile.civilianTarget.targetSector,
      headline: null,
      summary: null,
      structured_profile_jsonb: {},
      generator_name: null,
      generator_version: null,
      prompt_version: null,
    },
  };
}
