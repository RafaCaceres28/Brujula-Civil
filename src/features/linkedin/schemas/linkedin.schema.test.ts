import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  linkedInNormalizedProfileSchema,
  linkedInSourceInputSchema,
  type LinkedInNormalizedProfile,
  type LinkedInSourceInput,
} from './linkedin.schema';
import type {
  LinkedInDomainInput,
  LinkedInDomainOutput,
  LinkedInDomainResult,
} from '../types/linkedin.types';

describe('linkedInSourceInputSchema', () => {
  it('accepts source input with profile url and raw payload', () => {
    const input: LinkedInSourceInput = {
      userId: 'user_123',
      profileUrl: 'https://www.linkedin.com/in/jane-doe',
      rawProfilePayload: {
        source: 'linkedin-api',
      },
    };

    expect(linkedInSourceInputSchema.parse(input)).toEqual(input);
  });

  it('normalizes empty profile url and rejects invalid urls', () => {
    const parsed = linkedInSourceInputSchema.parse({
      userId: 'user_456',
      profileUrl: '   ',
    });

    expect(parsed.profileUrl).toBeUndefined();
    expect(
      linkedInSourceInputSchema.safeParse({ userId: 'user_456', profileUrl: 'linkedin' }).success,
    ).toBe(false);
  });

  it('rejects extra keys in strict input object', () => {
    const result = linkedInSourceInputSchema.safeParse({
      userId: 'user_789',
      profileUrl: 'https://www.linkedin.com/in/strict-mode',
      extraField: 'not-allowed',
    });

    expect(result.success).toBe(false);
  });
});

describe('linkedInNormalizedProfileSchema', () => {
  it('accepts normalized linkedin profile contract', () => {
    const output: LinkedInNormalizedProfile = {
      headline: 'Operations Leader',
      experience: [
        {
          role: 'Operations Manager',
          company: 'Civil Ops Inc.',
          summary: 'Led multi-team operations with measurable impact.',
        },
      ],
      education: [
        {
          institution: 'National Defense Academy',
          degree: 'Strategic Leadership',
          fieldOfStudy: 'Operations',
        },
      ],
      skills: ['Leadership', 'Risk management'],
    };

    expect(linkedInNormalizedProfileSchema.parse(output)).toEqual(output);
  });

  it('normalizes nullable content and keeps type compatibility with domain aliases', () => {
    const parsed = linkedInNormalizedProfileSchema.parse({
      headline: '   ',
      experience: [
        {
          role: 'Coordinator',
          company: 'Example Corp',
          summary: '   ',
        },
      ],
      education: [
        {
          institution: 'Example Institute',
          degree: '   ',
          fieldOfStudy: '   ',
        },
      ],
      skills: ['Planning'],
    });

    expect(parsed.headline).toBeNull();
    expect(parsed.experience[0]?.summary).toBeNull();
    expect(parsed.education[0]?.degree).toBeNull();
    expect(parsed.education[0]?.fieldOfStudy).toBeNull();

    expectTypeOf<LinkedInSourceInput>().toEqualTypeOf<LinkedInDomainInput>();
    expectTypeOf<LinkedInNormalizedProfile>().toEqualTypeOf<LinkedInDomainOutput>();
    expectTypeOf<LinkedInDomainResult>().toMatchTypeOf<
      | { ok: true; data: LinkedInDomainOutput }
      | { ok: false; error: { code: string; message: string } }
    >();
  });
});
