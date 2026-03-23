import { describe, expect, it } from 'vitest';
import { parseEditableCvPreviewBoundary } from '../services/cv.mapper';
import { mapCvPreviewToPdfGenerationInput } from '../../documents/server/generate-pdf';
import { cvPreviewFixture } from '../../translation/server/__fixtures__/contract-fixtures';

describe('cv editability contract before pdf export', () => {
  it('preserves user edits after boundary normalization and keeps pdf input valid', () => {
    const editedPreviewPayload = {
      ...cvPreviewFixture,
      sections: cvPreviewFixture.sections.map((section) => ({
        ...section,
        content: `  ${section.content} Updated before export.  `,
      })),
    };

    const boundaryResult = parseEditableCvPreviewBoundary(editedPreviewPayload);
    expect(boundaryResult.ok).toBe(true);
    if (!boundaryResult.ok) {
      throw new Error('Expected editable boundary success');
    }

    expect(boundaryResult.data.sections[0]?.content).toBe(
      'Operations leader focused on logistics, planning and risk mitigation. Updated before export.',
    );

    const pdfInput = mapCvPreviewToPdfGenerationInput({
      userId: 'user-001',
      cvPreview: boundaryResult.data,
      locale: 'es-ES',
    });

    expect(pdfInput.cvPreview.sections[0]?.content).toBe(boundaryResult.data.sections[0]?.content);
  });

  it('rejects editable payload with blank section content before pdf mapping', () => {
    const invalidPayload = {
      ...cvPreviewFixture,
      sections: cvPreviewFixture.sections.map((section) => ({
        ...section,
        content: '   ',
      })),
    };

    const boundaryResult = parseEditableCvPreviewBoundary(invalidPayload);

    expect(boundaryResult.ok).toBe(false);
    if (!boundaryResult.ok) {
      expect(boundaryResult.error.code).toBe('VALIDATION_ERROR');
      expect(boundaryResult.error.message).toBe('Invalid editable CV preview payload');
    }
  });
});
