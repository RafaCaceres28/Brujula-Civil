import { describe, expect, it } from 'vitest';
import { exportCvPdf } from '../../cv/server/export-cv-pdf';
import { parseEditableCvPreviewBoundary } from '../../cv/services/cv.mapper';
import { cvPreviewFixture } from '../../translation/server/__fixtures__/contract-fixtures';

describe('cv preview -> pdf contract', () => {
  it('exports PDF from the confirmed preview snapshot without semantic drift', async () => {
    const editablePreview = {
      ...cvPreviewFixture,
      sections: cvPreviewFixture.sections.map((section) => ({
        ...section,
        content: ` ${section.content} Snapshot approved `,
      })),
    };

    const previewBoundary = parseEditableCvPreviewBoundary(editablePreview);
    expect(previewBoundary.ok).toBe(true);
    if (!previewBoundary.ok) {
      throw new Error('Expected editable preview checkpoint success');
    }

    const result = await exportCvPdf({
      userId: 'user-001',
      cvPreview: previewBoundary.data,
      locale: 'es-ES',
      previewVersionId: 'preview-v1',
      isUserEdited: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected PDF export success');
    }

    expect(result.data.status).toBe('queued');
    expect(result.data.storagePath).toContain('documents/user-001');
    expect(result.meta?.source).toBe('cv.server.export-cv-pdf');
  });

  it('returns validation error when preview snapshot is not editable-valid', async () => {
    const invalidPreview = {
      ...cvPreviewFixture,
      sections: cvPreviewFixture.sections.map((section) => ({
        ...section,
        content: '   ',
      })),
    };

    const result = await exportCvPdf({
      userId: 'user-001',
      cvPreview: invalidPreview,
      locale: 'es-ES',
      previewVersionId: 'preview-v2',
      isUserEdited: true,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toBe('Invalid editable CV preview payload');
    }
  });
});
