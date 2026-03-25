import { describe, expect, it } from 'vitest';
import { experienciaStepSchema, objetivosStepSchema, onboardingDraftSchema } from './wizard.schema';

describe('wizard.schema', () => {
  it('accepts valid onboarding payload and provides defaults', () => {
    const parsed = onboardingDraftSchema.parse({});

    expect(parsed.militar.branch).toBeNull();
    expect(parsed.experiencia.responsibilityAreas).toEqual([]);
    expect(parsed.objetivos.targetRoles).toEqual([]);
    expect(parsed.resumen.confirmed).toBe(false);
  });

  it('rejects invalid experiencia payload', () => {
    const result = experienciaStepSchema.safeParse({
      responsibilityAreas: ['operations'],
      missionTypes: ['intl_stability'],
      functionTypes: ['coordination'],
      tools: ['erp'],
      leadershipScopes: ['team_supervision'],
      achievements: ['a', 'b', 'c', 'd', 'e', 'f'],
      additionalContext: null,
    });

    expect(result.success).toBe(false);
  });

  it('rejects structured values outside catalog', () => {
    const result = onboardingDraftSchema.safeParse({
      militar: {
        branch: 'free-text',
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid objetivos role contract', () => {
    const result = objetivosStepSchema.safeParse({
      targetRoles: [{ slug: '', label: 'Role' }],
      targetSectors: [],
      preferredLocations: [],
      workModel: null,
      seniority: null,
      preferencesNotes: null,
    });

    expect(result.success).toBe(false);
  });
});
