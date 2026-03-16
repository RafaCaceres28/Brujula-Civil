import { describe, expect, it } from 'vitest';
import { profileReadOutputSchema } from '../schemas/profile.schema';
import type { ProfileSupabaseShape } from '@/features/profile/types/profile.types';
import { mapSupabaseShapeToProfileRow } from './profile.mapper';

describe('profile.mapper read contract', () => {
  it('maps database shape to a payload parseable by the read schema', () => {
    const shape: ProfileSupabaseShape = {
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

    const mapped = mapSupabaseShapeToProfileRow('user-1', shape);
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
});
