import { describe, expect, it } from 'vitest';
import {
  translationInputSchema,
  translationOutputSchema,
  type TranslationInput,
  type TranslationOutput,
} from './translation.schema';
import type { TranslationResult } from '../types/translation.types';

describe('translationInputSchema', () => {
  it('accepts valid input from onboarding draft', () => {
    const validInput: TranslationInput = {
      militaryProfile: {
        rank: 'Capitan',
        area: 'Infanteria',
        yearsOfService: 5,
        summary: 'Experiencia en liderazgo y operaciones',
      },
      civilianTarget: {
        targetRole: 'Project Manager',
        targetSector: 'Construccion',
        locationPreference: 'Bogota',
      },
    };

    expect(() => translationInputSchema.parse(validInput)).not.toThrow();
  });

  it('accepts valid input with nullable values', () => {
    const validInput: TranslationInput = {
      militaryProfile: {
        rank: 'Valid Rank',
        area: 'Valid Area',
        yearsOfService: null,
        summary: null,
      },
      civilianTarget: {
        targetRole: 'Valid Target Role',
        targetSector: 'Valid Target Sector',
        locationPreference: 'Valid Location Preference',
      },
    };

    const parsed = translationInputSchema.parse(validInput);

    expect(parsed.militaryProfile.rank).toBe('Valid Rank');
    expect(parsed.militaryProfile.area).toBe('Valid Area');
    expect(parsed.militaryProfile.yearsOfService).toBeNull();
    expect(parsed.militaryProfile.summary).toBeNull();
    expect(parsed.civilianTarget.targetRole).toBe('Valid Target Role');
    expect(parsed.civilianTarget.targetSector).toBe('Valid Target Sector');
    expect(parsed.civilianTarget.locationPreference).toBe('Valid Location Preference');
  });

  it('rejects input with missing required fields', () => {
    const invalidInput = {
      militaryProfile: {
        rank: 'Capitan',
        // area is missing but required
        yearsOfService: 5,
        summary: 'Experiencia',
      },
      civilianTarget: {
        targetRole: 'Project Manager',
        targetSector: 'Construccion',
        locationPreference: 'Bogota',
      },
    };

    const result = translationInputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      // Should have an error about the missing area field
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['militaryProfile', 'area'],
          code: 'invalid_type',
        }),
      );
    }
  });

  it('rejects input with incorrect types', () => {
    const invalidInput = {
      militaryProfile: {
        rank: 'Capitan',
        area: 'Infanteria',
        yearsOfService: 'cinco', // string instead of number
        summary: 'Experiencia',
      },
      civilianTarget: {
        targetRole: 'Project Manager',
        targetSector: 'Construccion',
        locationPreference: 'Bogota',
      },
    };

    const result = translationInputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['militaryProfile', 'yearsOfService'],
          code: 'invalid_type',
        }),
      );
    }
  });

  it('rejects yearsOfService outside valid range', () => {
    const invalidInput = {
      militaryProfile: {
        rank: 'Capitan',
        area: 'Infanteria',
        yearsOfService: 65, // above max of 60
        summary: 'Experiencia',
      },
      civilianTarget: {
        targetRole: 'Project Manager',
        targetSector: 'Construccion',
        locationPreference: 'Bogota',
      },
    };

    const result = translationInputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['militaryProfile', 'yearsOfService'],
        }),
      );
    }
  });

  it('rejects input when yearsOfService is missing', () => {
    const invalidInput = {
      militaryProfile: {
        rank: 'Capitan',
        area: 'Infanteria',
        summary: 'Experiencia',
      },
      civilianTarget: {
        targetRole: 'Project Manager',
        targetSector: 'Construccion',
        locationPreference: 'Bogota',
      },
    };

    const result = translationInputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['militaryProfile', 'yearsOfService'],
          code: 'invalid_type',
        }),
      );
    }
  });

  it('accepts yearsOfService at boundary values', () => {
    const validInputMin = {
      militaryProfile: {
        rank: 'Capitan',
        area: 'Infanteria',
        yearsOfService: 0, // minimum valid
        summary: 'Experiencia',
      },
      civilianTarget: {
        targetRole: 'Project Manager',
        targetSector: 'Construccion',
        locationPreference: 'Bogota',
      },
    };

    const validInputMax = {
      militaryProfile: {
        rank: 'Capitan',
        area: 'Infanteria',
        yearsOfService: 60, // maximum valid
        summary: 'Experiencia',
      },
      civilianTarget: {
        targetRole: 'Project Manager',
        targetSector: 'Construccion',
        locationPreference: 'Bogota',
      },
    };

    expect(() => translationInputSchema.parse(validInputMin)).not.toThrow();
    expect(() => translationInputSchema.parse(validInputMax)).not.toThrow();
  });

  it('trims and validates string length limits', () => {
    const longString = 'a'.repeat(121); // exceeds MAX_NAME_LENGTH of 120

    const invalidInput = {
      militaryProfile: {
        rank: longString,
        area: 'Infanteria',
        yearsOfService: 5,
        summary: 'Experiencia',
      },
      civilianTarget: {
        targetRole: 'Project Manager',
        targetSector: 'Construccion',
        locationPreference: 'Bogota',
      },
    };

    const result = translationInputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['militaryProfile', 'rank'],
        }),
      );
    }
  });

  it('rejects required strings with whitespace-only values', () => {
    const invalidInput = {
      militaryProfile: {
        rank: '   ',
        area: 'Infanteria',
        yearsOfService: 5,
        summary: 'Experiencia',
      },
      civilianTarget: {
        targetRole: 'Project Manager',
        targetSector: 'Construccion',
        locationPreference: 'Bogota',
      },
    };

    const result = translationInputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['militaryProfile', 'rank'],
          code: 'invalid_type',
        }),
      );
    }
  });

  it('rejects extra keys in input boundary objects', () => {
    const invalidInput = {
      militaryProfile: {
        rank: 'Capitan',
        area: 'Infanteria',
        yearsOfService: 5,
        summary: 'Experiencia',
        extraMilitaryField: 'not-allowed',
      },
      civilianTarget: {
        targetRole: 'Project Manager',
        targetSector: 'Construccion',
        locationPreference: 'Bogota',
        extraCivilianField: 'not-allowed',
      },
      extraRootField: 'not-allowed',
    };

    const result = translationInputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.code === 'unrecognized_keys')).toBe(true);
    }
  });
});

describe('translationOutputSchema', () => {
  it('accepts valid output', () => {
    const validOutput: TranslationOutput = {
      professionalSummary: 'Profesional con experiencia en liderazgo y operaciones militares',
      transferableSkills: ['Liderazgo', 'Planificacion estratégica', 'Trabajo en equipo'],
      suggestedRoles: [
        'Gerente de proyectos',
        'Supervisor de operaciones',
        'Consultor de seguridad',
      ],
    };

    expect(() => translationOutputSchema.parse(validOutput)).not.toThrow();
  });

  it('rejects output with empty professionalSummary', () => {
    const invalidOutput = {
      professionalSummary: '', // empty string
      transferableSkills: ['Liderazgo'],
      suggestedRoles: ['Gerente'],
    };

    const result = translationOutputSchema.safeParse(invalidOutput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['professionalSummary'],
        }),
      );
    }
  });

  it('rejects output with professionalSummary exceeding max length', () => {
    const longSummary = 'a'.repeat(501); // exceeds MAX_SUMMARY_LENGTH of 500

    const invalidOutput = {
      professionalSummary: longSummary,
      transferableSkills: ['Liderazgo'],
      suggestedRoles: ['Gerente'],
    };

    const result = translationOutputSchema.safeParse(invalidOutput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['professionalSummary'],
        }),
      );
    }
  });

  it('rejects output with empty transferableSkills array', () => {
    const invalidOutput = {
      professionalSummary: 'Resumen profesional',
      transferableSkills: [], // empty array
      suggestedRoles: ['Gerente'],
    };

    const result = translationOutputSchema.safeParse(invalidOutput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['transferableSkills'],
        }),
      );
    }
  });

  it('rejects output with empty suggestedRoles array', () => {
    const invalidOutput = {
      professionalSummary: 'Resumen profesional',
      transferableSkills: ['Liderazgo'],
      suggestedRoles: [], // empty array
    };

    const result = translationOutputSchema.safeParse(invalidOutput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['suggestedRoles'],
        }),
      );
    }
  });

  it('rejects output with non-string elements in arrays', () => {
    const invalidOutput = {
      professionalSummary: 'Resumen profesional',
      transferableSkills: ['Liderazgo', 123], // number instead of string
      suggestedRoles: ['Gerente'],
    };

    const result = translationOutputSchema.safeParse(invalidOutput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['transferableSkills', 1],
        }),
      );
    }
  });

  it('trims and validates minimum length of 1 for array elements', () => {
    const invalidOutput = {
      professionalSummary: 'Resumen profesional',
      transferableSkills: ['Liderazgo', '   '], // whitespace only becomes empty after trim
      suggestedRoles: ['Gerente'],
    };

    const result = translationOutputSchema.safeParse(invalidOutput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['transferableSkills', 1],
        }),
      );
    }
  });

  it('accepts valid output with trimmed strings', () => {
    const validOutput: TranslationOutput = {
      professionalSummary: '  Resumen con espacios  ',
      transferableSkills: ['  Habilidad 1  ', '  Habilidad 2  '],
      suggestedRoles: ['  Rol 1  ', '  Rol 2  '],
    };

    const parsed = translationOutputSchema.parse(validOutput);

    expect(parsed.professionalSummary).toBe('Resumen con espacios');
    expect(parsed.transferableSkills).toEqual(['Habilidad 1', 'Habilidad 2']);
    expect(parsed.suggestedRoles).toEqual(['Rol 1', 'Rol 2']);
  });

  it('rejects output with whitespace-only professionalSummary', () => {
    const invalidOutput = {
      professionalSummary: '   ',
      transferableSkills: ['Liderazgo'],
      suggestedRoles: ['Gerente'],
    };

    const result = translationOutputSchema.safeParse(invalidOutput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['professionalSummary'],
        }),
      );
    }
  });

  it('rejects extra keys in output boundary object', () => {
    const invalidOutput = {
      professionalSummary: 'Resumen profesional',
      transferableSkills: ['Liderazgo'],
      suggestedRoles: ['Gerente'],
      extraOutputField: 'not-allowed',
    };

    const result = translationOutputSchema.safeParse(invalidOutput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          code: 'unrecognized_keys',
        }),
      );
    }
  });
});

describe('translation schema integration', () => {
  it('ensures inferred types match TranslationResult structure', () => {
    // Test that TranslationOutput matches TranslationResult structure
    const sampleOutput: TranslationOutput = {
      professionalSummary: 'Test summary',
      transferableSkills: ['Skill1', 'Skill2'],
      suggestedRoles: ['Role1', 'Role2'],
    };

    // This should not cause TypeScript errors if types are compatible
    const translationResult: TranslationResult = sampleOutput;

    expect(translationResult.professionalSummary).toBe('Test summary');
    expect(translationResult.transferableSkills).toEqual(['Skill1', 'Skill2']);
    expect(translationResult.suggestedRoles).toEqual(['Role1', 'Role2']);
  });
});
