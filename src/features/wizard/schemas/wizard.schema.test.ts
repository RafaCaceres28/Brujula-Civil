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
      experiencia: {
        responsibilityAreas: ['operations', 'texto-libre'],
      },
      competencias: {
        languages: [
          { name: 'english', level: 'advanced' },
          { name: 'idioma-invalido', level: 'advanced' },
        ],
      },
    });

    expect(result.success).toBe(false);

    if (result.success) {
      return;
    }

    const invalidPaths = result.error.issues.map((issue) => issue.path.join('.'));

    expect(invalidPaths).toContain('militar.branch');
    expect(invalidPaths).toContain('experiencia.responsibilityAreas.1');
    expect(invalidPaths).toContain('competencias.languages.1.name');
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
