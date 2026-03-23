import { describe, expect, it } from 'vitest';
import { cvPreviewFixture } from '../../translation/server/__fixtures__/contract-fixtures';
import { exportCvPdf } from './export-cv-pdf';

describe('exportCvPdf', () => {
  it('blocks export when manual edition was not confirmed', async () => {
    const result = await exportCvPdf({
      userId: 'user-001',
      cvPreview: cvPreviewFixture,
      locale: 'es-ES',
      previewVersionId: 'preview-v1',
      isUserEdited: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toBe('Manual edit confirmation is required before PDF export');
    }
  });

  it('exports when manual edition checkpoint is confirmed', async () => {
    const result = await exportCvPdf({
      userId: 'user-001',
      cvPreview: cvPreviewFixture,
      locale: 'es-ES',
      previewVersionId: 'preview-v2',
      isUserEdited: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected export success');
    }

    expect(result.data.status).toBe('queued');
    expect(result.meta?.source).toBe('cv.server.export-cv-pdf');
  });
});
