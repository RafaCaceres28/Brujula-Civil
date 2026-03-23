import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  cvPreviewInputSchema,
  cvPreviewOutputSchema,
  type CvPreviewInput,
  type CvPreviewModel,
} from './cv.schema';
import type { CvDomainInput, CvDomainOutput, CvDomainResult } from '../types/cv.types';

describe('cvPreviewInputSchema', () => {
  it('accepts CV preview input contract with translation output traceability', () => {
    const input: CvPreviewInput = {
      userId: 'user_123',
      profileSnapshotId: 'snapshot_001',
      translatedContent: {
        blocks: [
          {
            id: 'block_1',
            content: 'Led mission planning and risk mitigation.',
            sourceRef: 'source_1',
          },
        ],
        sourceRefMap: {
          block_1: 'source_1',
        },
        qualityFlags: ['LOW_CONFIDENCE'],
      },
      templateKey: 'modern',
    };

    expect(cvPreviewInputSchema.parse(input)).toEqual(input);
  });

  it('rejects invalid template key and extra keys in strict input object', () => {
    const invalidTemplate = {
      userId: 'user_123',
      profileSnapshotId: 'snapshot_001',
      translatedContent: {
        blocks: [
          {
            id: 'block_1',
            content: 'Valid content',
            sourceRef: 'source_1',
          },
        ],
        sourceRefMap: {
          block_1: 'source_1',
        },
        qualityFlags: ['LOW_CONFIDENCE'],
      },
      templateKey: 'classic',
    };

    expect(cvPreviewInputSchema.safeParse(invalidTemplate).success).toBe(false);

    const withExtraKey = {
      ...invalidTemplate,
      templateKey: 'single-column',
      extraField: 'not-allowed',
    };

    expect(cvPreviewInputSchema.safeParse(withExtraKey).success).toBe(false);
  });
});

describe('cvPreviewOutputSchema', () => {
  it('accepts CV preview output contract', () => {
    const output: CvPreviewModel = {
      sections: [
        {
          id: 'section_1',
          title: 'Summary',
          content: 'Operations leader with cross-functional experience.',
          sourceBlockIds: ['block_1'],
        },
      ],
      layout: {
        templateKey: 'modern',
        columns: 2,
      },
      completeness: 'complete',
    };

    expect(cvPreviewOutputSchema.parse(output)).toEqual(output);
  });

  it('rejects empty sections and invalid layout columns', () => {
    const emptySections = {
      sections: [],
      layout: {
        templateKey: 'single-column',
        columns: 1,
      },
      completeness: 'needs_review',
    };

    expect(cvPreviewOutputSchema.safeParse(emptySections).success).toBe(false);

    const invalidColumns = {
      sections: [
        {
          id: 'section_1',
          title: 'Summary',
          content: 'Valid content',
          sourceBlockIds: ['block_1'],
        },
      ],
      layout: {
        templateKey: 'single-column',
        columns: 3,
      },
      completeness: 'complete',
    };

    expect(cvPreviewOutputSchema.safeParse(invalidColumns).success).toBe(false);
  });

  it('keeps type compatibility with CV domain aliases', () => {
    expectTypeOf<CvPreviewInput>().toEqualTypeOf<CvDomainInput>();
    expectTypeOf<CvPreviewModel>().toEqualTypeOf<CvDomainOutput>();
    expectTypeOf<CvDomainResult>().toMatchTypeOf<
      { ok: true; data: CvDomainOutput } | { ok: false; error: { code: string; message: string } }
    >();
  });
});
