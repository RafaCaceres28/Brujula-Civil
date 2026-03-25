import { describe, expect, it } from 'vitest';
import type {
  ProfileDomainModel,
  ProfileSupabaseShape,
} from '@/features/profile/types/profile.types';
import { profileFormValuesSchema, profileReadOutputSchema } from '../schemas/profile.schema';
import {
  PROFILE_SUMMARY_FALLBACKS,
  mapDbToDomainProfile,
  mapDomainToProfileFormInitialValues,
  mapDomainToProfileSummary,
  mapProfileWriteToDb,
} from './profile.mapper';

const FULL_SHAPE: ProfileSupabaseShape = {
  app: {
    user_id: 'user-1',
    email: 'ADA@EXAMPLE.COM',
    display_name: '  Ada Lovelace  ',
    locale: 'es-ES',
    timezone: 'Europe/Madrid',
    onboarding_completed: false,
    marketing_opt_in: false,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  military: {
    id: 'mil-1',
    user_id: 'user-1',
    is_current: true,
    branch: null,
    component: '  Signals ',
    rank_text: '  Captain ',
    specialty_text: null,
    service_years: 12,
    latest_unit: null,
    latest_role_title: null,
    source_text: '  Operations background ',
    raw_profile_jsonb: {},
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  civil: {
    id: 'civ-1',
    user_id: 'user-1',
    military_profile_id: 'mil-1',
    version_no: 1,
    is_current: true,
    status: 'draft',
    target_role: '  Operations Manager ',
    target_sector: '  Logistics ',
    headline: null,
    summary: null,
    structured_profile_jsonb: {
      target: {
        preferredLocations: ['remote'],
      },
    },
    generator_name: null,
    generator_version: null,
    prompt_version: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
};

describe('profile.mapper db -> domain', () => {
  it('maps complete DB shape to schema-parseable domain data', () => {
    const mapped = mapDbToDomainProfile('user-1', FULL_SHAPE);
    const parsed = profileReadOutputSchema.parse(mapped);

    expect(parsed).toEqual({
      userId: 'user-1',
      profile: {
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: null,
        city: null,
      },
      militaryBackground: {
        rank: 'Captain',
        area: 'Signals',
        yearsOfService: 12,
        summary: 'Operations background',
      },
      civilianTarget: {
        targetRole: 'Operations Manager',
        targetSector: 'Logistics',
        locationPreference: 'remote',
      },
    });
  });

  it('applies deterministic defaults when DB rows are missing', () => {
    const mapped = mapDbToDomainProfile('user-2', {
      app: null,
      military: null,
      civil: null,
    });

    expect(mapped).toEqual({
      userId: 'user-2',
      profile: {
        fullName: 'Unknown user',
        email: 'unknown@example.com',
        phone: null,
        city: null,
      },
      militaryBackground: {
        rank: null,
        area: null,
        yearsOfService: null,
        summary: null,
      },
      civilianTarget: {
        targetRole: null,
        targetSector: null,
        locationPreference: null,
      },
    });
  });

  it('truncates oversized military summary deterministically to satisfy domain schema', () => {
    const overLimitSummary = `  ${'x'.repeat(501)}  `;

    const mapped = mapDbToDomainProfile('user-6', {
      ...FULL_SHAPE,
      military: FULL_SHAPE.military
        ? {
            ...FULL_SHAPE.military,
            source_text: overLimitSummary,
          }
        : null,
    });

    expect(mapped.militaryBackground.summary).toHaveLength(500);
    expect(mapped.militaryBackground.summary).toBe('x'.repeat(500));
  });
});

describe('profile.mapper domain -> form', () => {
  it('projects domain fields into nested form initial values', () => {
    const domain = mapDbToDomainProfile('user-1', FULL_SHAPE);
    const formValues = mapDomainToProfileFormInitialValues(domain);

    expect(profileFormValuesSchema.parse(formValues.profile)).toEqual({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: null,
      city: null,
    });

    expect(formValues).toEqual({
      profile: {
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: '',
        city: '',
      },
      militaryBackground: {
        rank: 'Captain',
        area: 'Signals',
        yearsOfService: '12',
        summary: 'Operations background',
      },
      civilianTarget: {
        targetRole: 'Operations Manager',
        targetSector: 'Logistics',
        locationPreference: 'remote',
      },
    });
  });

  it('converts nullable domain values to safe string defaults for client inputs', () => {
    const domain = mapDbToDomainProfile('user-2', {
      app: null,
      military: null,
      civil: null,
    });

    expect(mapDomainToProfileFormInitialValues(domain)).toEqual({
      profile: {
        fullName: 'Unknown user',
        email: 'unknown@example.com',
        phone: '',
        city: '',
      },
      militaryBackground: {
        rank: '',
        area: '',
        yearsOfService: '',
        summary: '',
      },
      civilianTarget: {
        targetRole: '',
        targetSector: '',
        locationPreference: '',
      },
    });
  });
});

describe('profile.mapper domain -> db write payload', () => {
  it('maps domain model to app/military/civil payloads', () => {
    const domain = mapDbToDomainProfile('user-1', FULL_SHAPE);
    const payload = mapProfileWriteToDb(domain);

    expect(payload).toEqual({
      app: {
        user_id: 'user-1',
        email: 'ada@example.com',
        display_name: 'Ada Lovelace',
      },
      military: {
        branch: null,
        component: 'Signals',
        rank_text: 'Captain',
        specialty_text: null,
        service_years: 12,
        latest_unit: null,
        latest_role_title: 'Captain',
        source_text: 'Operations background',
        raw_profile_jsonb: {},
      },
      civil: {
        status: 'draft',
        target_role: 'Operations Manager',
        target_sector: 'Logistics',
        headline: null,
        summary: null,
        structured_profile_jsonb: {
          target: {
            preferredLocations: ['remote'],
          },
        },
        generator_name: null,
        generator_version: null,
        prompt_version: null,
      },
    });
  });

  it('keeps preferredLocations policy as 0..1 values', () => {
    const domain = {
      ...mapDbToDomainProfile('user-3', FULL_SHAPE),
      civilianTarget: {
        targetRole: null,
        targetSector: null,
        locationPreference: null,
      },
    } satisfies ProfileDomainModel;

    const payload = mapProfileWriteToDb(domain);

    expect(payload.civil.structured_profile_jsonb).toEqual({
      target: {
        preferredLocations: [],
      },
    });
  });
});

describe('profile.mapper domain -> summary', () => {
  it('projects summary card values from domain', () => {
    const summary = mapDomainToProfileSummary(mapDbToDomainProfile('user-1', FULL_SHAPE));

    expect(summary).toEqual({
      fullName: 'Ada Lovelace',
      primaryGoal: 'Operations Manager',
      location: 'remote',
    });
  });

  it('uses deterministic fallbacks for missing target fields', () => {
    const civilRow = FULL_SHAPE.civil;

    if (!civilRow) {
      throw new Error('Test fixture invalid: civil row is required');
    }

    const domain = mapDbToDomainProfile('user-4', {
      app: FULL_SHAPE.app,
      military: FULL_SHAPE.military,
      civil: {
        ...civilRow,
        target_role: null,
        structured_profile_jsonb: {},
      },
    });

    expect(mapDomainToProfileSummary(domain)).toEqual({
      fullName: 'Ada Lovelace',
      primaryGoal: PROFILE_SUMMARY_FALLBACKS.primaryGoal,
      location: PROFILE_SUMMARY_FALLBACKS.location,
    });
  });

  it('normalizes whitespace-only target values to fallback values', () => {
    const civilRow = FULL_SHAPE.civil;

    if (!civilRow) {
      throw new Error('Test fixture invalid: civil row is required');
    }

    const domain = mapDbToDomainProfile('user-5', {
      app: FULL_SHAPE.app,
      military: FULL_SHAPE.military,
      civil: {
        ...civilRow,
        target_role: '   ',
        structured_profile_jsonb: {
          target: {
            preferredLocations: ['   '],
          },
        },
      },
    });

    expect(mapDomainToProfileSummary(domain)).toEqual({
      fullName: 'Ada Lovelace',
      primaryGoal: PROFILE_SUMMARY_FALLBACKS.primaryGoal,
      location: PROFILE_SUMMARY_FALLBACKS.location,
    });
  });
});

describe('profile.mapper round-trip controlled integration', () => {
  it('preserves key invariants from DB shape through domain to DB payload', () => {
    const domain = mapDbToDomainProfile('user-1', FULL_SHAPE);
    const payload = mapProfileWriteToDb(domain);

    expect(payload.app.user_id).toBe('user-1');
    expect(payload.app.display_name).toBe('Ada Lovelace');
    expect(payload.app.email).toBe('ada@example.com');
    expect(payload.civil.target_role).toBe('Operations Manager');
    expect(payload.civil.target_sector).toBe('Logistics');
    expect(payload.civil.structured_profile_jsonb).toEqual({
      target: {
        preferredLocations: ['remote'],
      },
    });
  });
});
