import { describe, expect, it } from 'vitest';
import { parseEditableCvPreviewBoundary } from '../../../features/cv/services/cv.mapper';
import { generatePdfFromCvPreview } from '../../../features/documents/server/generate-pdf';
import { cvPreviewFixture } from '../../../features/translation/server/__fixtures__/contract-fixtures';

describe('cross domain error taxonomy', () => {
  it('returns validation error for invalid editable preview payload at UI boundary', () => {
    const result = parseEditableCvPreviewBoundary({
      sections: [
        {
          id: 'cv-section-summary',
          title: 'Professional Summary',
          content: '   ',
          sourceBlockIds: ['translation-block-1'],
        },
      ],
      layout: {
        templateKey: 'single-column',
        columns: 1,
      },
      completeness: 'needs_review',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toBe('Invalid editable CV preview payload');
    }
  });

  it('maps invalid CV->PDF input to INTERNAL_ERROR with safe message', async () => {
    const result = await generatePdfFromCvPreview({
      userId: 'invalid user id with spaces',
      cvPreview: cvPreviewFixture,
      locale: 'es-ES',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INTERNAL_ERROR');
      expect(result.error.message).toContain('Invalid domain identifier format');
    }
  });
});
