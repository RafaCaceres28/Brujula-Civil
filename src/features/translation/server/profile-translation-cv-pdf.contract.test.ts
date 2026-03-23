import { describe, expect, it } from 'vitest';
import { cvPreviewOutputSchema } from '../../cv/schemas/cv.schema';
import { mapTranslationOutputToCvInput } from '../../cv/services/cv.mapper';
import { generatePdf, mapCvPreviewToPdfGenerationInput } from '../../documents/server/generate-pdf';
import { mapProfileToTranslationSnapshot } from '../../profile/services/profile.mapper';
import { translationInputSchema, translationOutputSchema } from '../schemas/translation.schema';
import { profileDomainFixture } from './__fixtures__/contract-fixtures';

describe('profile -> translation -> cv -> pdf contract slice', () => {
  it('keeps schema-compatible payloads and traceability across all steps', async () => {
    const profileSnapshot = mapProfileToTranslationSnapshot(profileDomainFixture);

    const translationInput = translationInputSchema.parse({
      userId: profileDomainFixture.userId,
      sourceProfile: profileSnapshot,
      sourceLanguage: 'es-ES',
      targetLanguage: 'en-US',
      tone: 'neutral',
    });

    const translationOutput = translationOutputSchema.parse({
      blocks: [
        {
          id: 'translation-block-1',
          sourceRef: profileSnapshot.snapshotId,
          content: 'Operations leader focused on logistics, planning and risk mitigation.',
        },
      ],
      sourceRefMap: {
        'translation-block-1': profileSnapshot.snapshotId,
      },
      qualityFlags: ['MISSING_CONTEXT'],
    });

    expect(translationOutput.sourceRefMap['translation-block-1']).toBe(profileSnapshot.snapshotId);

    const cvInput = mapTranslationOutputToCvInput({
      userId: translationInput.userId,
      profileSnapshotId: profileSnapshot.snapshotId,
      translatedContent: translationOutput,
      templateKey: 'single-column',
    });

    const cvPreview = cvPreviewOutputSchema.parse({
      sections: [
        {
          id: 'cv-section-summary',
          title: 'Professional Summary',
          content: translationOutput.blocks[0]?.content,
          sourceBlockIds: [translationOutput.blocks[0]?.id],
        },
      ],
      layout: {
        templateKey: cvInput.templateKey,
        columns: cvInput.templateKey === 'single-column' ? 1 : 2,
      },
      completeness: 'needs_review',
    });

    expect(cvPreview.sections[0]?.sourceBlockIds).toContain('translation-block-1');

    const pdfInput = mapCvPreviewToPdfGenerationInput({
      userId: translationInput.userId,
      cvPreview,
      locale: 'es-ES',
    });

    expect(pdfInput.cvPreview.sections[0]?.content).toBe(cvPreview.sections[0]?.content);

    const pdfResult = await generatePdf(pdfInput);

    expect(pdfResult.ok).toBe(true);
    if (!pdfResult.ok) {
      throw new Error('Expected PDF success');
    }

    expect(pdfResult.data.status).toBe('queued');
    expect(pdfResult.data.storagePath).toContain(`documents/${translationInput.userId}`);
  });
});
