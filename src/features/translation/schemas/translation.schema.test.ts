import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  translationInputSchema,
  translationOutputSchema,
  type TranslationInput,
  type TranslationOutput,
} from './translation.schema';
import type {
  TranslationDomainInput,
  TranslationDomainOutput,
  TranslationDomainResult,
} from '../types/translation.types';

describe('translationInputSchema', () => {
  it('accepts profile snapshot input contract', () => {
    const input: TranslationInput = {
      userId: 'user_123',
      sourceProfile: {
        kind: 'profile_snapshot',
        snapshotId: 'snapshot_001',
        summary: 'Experiencia liderando equipos operativos',
        highlights: ['Planificacion de misiones', 'Gestion de riesgo'],
      },
      sourceLanguage: 'es-CO',
      targetLanguage: 'en-US',
      tone: 'formal',
    };

    expect(translationInputSchema.parse(input)).toEqual(input);
  });

  it('accepts linkedin normalized input contract', () => {
    const input: TranslationInput = {
      userId: 'user_456',
      sourceProfile: {
        kind: 'linkedin_normalized_profile',
        profileId: 'linkedin_profile_1',
        headline: 'Operations Leader',
        highlights: ['Cross-functional leadership'],
      },
      sourceLanguage: 'en-US',
      targetLanguage: 'es-CO',
    };

    expect(translationInputSchema.parse(input)).toEqual(input);
  });

  it('normalizes nullable summary and rejects invalid locales', () => {
    const validInput = {
      userId: 'user_789',
      sourceProfile: {
        kind: 'profile_snapshot',
        snapshotId: 'snapshot_002',
        summary: '   ',
        highlights: ['Coordination'],
      },
      sourceLanguage: 'es',
      targetLanguage: 'en-US',
    };

    const parsed = translationInputSchema.parse(validInput);
    expect(parsed.sourceProfile.kind).toBe('profile_snapshot');
    if (parsed.sourceProfile.kind === 'profile_snapshot') {
      expect(parsed.sourceProfile.summary).toBeNull();
    }

    const invalidLocaleInput = {
      ...validInput,
      sourceLanguage: 'spanish',
    };

    expect(translationInputSchema.safeParse(invalidLocaleInput).success).toBe(false);
  });

  it('rejects extra keys in strict input objects', () => {
    const invalidInput = {
      userId: 'user_123',
      sourceProfile: {
        kind: 'linkedin_normalized_profile',
        profileId: 'linkedin_profile_2',
        headline: 'Operations Specialist',
        highlights: ['Incident response'],
        extraField: 'not-allowed',
      },
      sourceLanguage: 'en-US',
      targetLanguage: 'es-CO',
    };

    const result = translationInputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });
});

describe('translationOutputSchema', () => {
  it('accepts translated profile content with traceability map', () => {
    const output: TranslationOutput = {
      blocks: [
        {
          id: 'block_1',
          content: 'Led mission planning and risk mitigation in complex environments.',
          sourceRef: 'source_1',
        },
      ],
      sourceRefMap: {
        block_1: 'source_1',
      },
      qualityFlags: ['LOW_CONFIDENCE'],
    };

    expect(translationOutputSchema.parse(output)).toEqual(output);
  });

  it('rejects empty blocks and invalid quality flags', () => {
    const emptyBlocks = {
      blocks: [],
      sourceRefMap: {},
      qualityFlags: [],
    };

    expect(translationOutputSchema.safeParse(emptyBlocks).success).toBe(false);

    const invalidFlag = {
      blocks: [
        {
          id: 'block_1',
          content: 'Valid translated content',
          sourceRef: 'source_1',
        },
      ],
      sourceRefMap: {
        block_1: 'source_1',
      },
      qualityFlags: ['UNEXPECTED_FLAG'],
    };

    expect(translationOutputSchema.safeParse(invalidFlag).success).toBe(false);
  });

  it('keeps type compatibility with translation domain aliases', () => {
    expectTypeOf<TranslationInput>().toEqualTypeOf<TranslationDomainInput>();
    expectTypeOf<TranslationOutput>().toEqualTypeOf<TranslationDomainOutput>();
    expectTypeOf<TranslationDomainResult>().toMatchTypeOf<
      | { ok: true; data: TranslationDomainOutput }
      | { ok: false; error: { code: string; message: string } }
    >();
  });
});
