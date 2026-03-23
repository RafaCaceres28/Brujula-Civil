import { describe, expect, it } from 'vitest';
import { cvPreviewInputSchema, cvPreviewOutputSchema } from '../schemas/cv.schema';
import { mapTranslationOutputToCvInput } from '../services/cv.mapper';
import { pdfGenerationInputSchema } from '../../documents/schemas/document.schema';
import { translationOutputSchema } from '../../translation/schemas/translation.schema';

describe('cv contract compatibility', () => {
  it('accepts translation output as valid cv preview input payload', () => {
    const translationOutput = translationOutputSchema.parse({
      blocks: [
        {
          id: 'translation-block-1',
          content: 'Operations leader with expertise in logistics.',
          sourceRef: 'profile-snapshot-user-001',
        },
      ],
      sourceRefMap: {
        'translation-block-1': 'profile-snapshot-user-001',
      },
      qualityFlags: ['LOW_CONFIDENCE'],
    });

    const cvInput = mapTranslationOutputToCvInput({
      userId: 'user-001',
      profileSnapshotId: 'profile-snapshot-user-001',
      translatedContent: translationOutput,
      templateKey: 'modern',
    });

    expect(cvPreviewInputSchema.parse(cvInput)).toEqual(cvInput);
  });

  it('accepts cv preview output as valid pdf generation input payload', () => {
    const cvPreview = cvPreviewOutputSchema.parse({
      sections: [
        {
          id: 'cv-section-summary',
          title: 'Professional Summary',
          content: 'Operations leader with expertise in logistics.',
          sourceBlockIds: ['translation-block-1'],
        },
      ],
      layout: {
        templateKey: 'modern',
        columns: 2,
      },
      completeness: 'needs_review',
    });

    const pdfInput = pdfGenerationInputSchema.parse({
      userId: 'user-001',
      cvPreview,
      format: 'pdf',
      locale: 'es-ES',
    });

    expect(pdfInput.cvPreview.sections[0]?.sourceBlockIds).toEqual(['translation-block-1']);
  });
});
