import {
  createValidationDomainError,
  domainFailure,
  domainSuccess,
  type DomainMeta,
} from '../../../lib/contracts/index';
import { generatePdf, mapCvPreviewToPdfGenerationInput } from '../../documents/server/generate-pdf';
import type { DocumentsDomainResult } from '../../documents/types/document.types';
import { parseEditableCvPreviewBoundary } from '../services/cv.mapper';
import type { CvDomainOutput } from '../types/cv.types';

type ExportCvPdfInput = {
  userId: string;
  cvPreview: CvDomainOutput;
  locale: string;
  previewVersionId: string;
  isUserEdited: boolean;
  requestId?: string;
};

const EXPORT_SOURCE = 'cv.server.export-cv-pdf';

type SnapshotTagInput = {
  userId: string;
  previewVersionId: string;
};

function createExportMeta(input: Pick<ExportCvPdfInput, 'requestId'>): DomainMeta {
  return {
    timestamp: new Date().toISOString(),
    source: EXPORT_SOURCE,
    ...(input.requestId ? { requestId: input.requestId } : {}),
  };
}

export function buildPreviewSnapshotTag(input: SnapshotTagInput): string {
  return `${input.userId}:${input.previewVersionId}`;
}

export function createPreviewVersionId(): string {
  return `preview-${Date.now()}`;
}

export async function exportCvPdf(input: ExportCvPdfInput): Promise<DocumentsDomainResult> {
  const meta = createExportMeta(input);

  if (!input.isUserEdited) {
    return domainFailure(
      createValidationDomainError('Manual edit confirmation is required before PDF export', {
        previewVersionId: input.previewVersionId,
      }),
      meta,
    );
  }

  const previewBoundary = parseEditableCvPreviewBoundary(input.cvPreview);
  if (!previewBoundary.ok) {
    return domainFailure(previewBoundary.error, meta);
  }

  const pdfInput = mapCvPreviewToPdfGenerationInput({
    userId: input.userId,
    cvPreview: previewBoundary.data,
    locale: input.locale,
  });

  const hasSemanticDrift = pdfInput.cvPreview.sections.some((section, index) => {
    return section.content !== previewBoundary.data.sections[index]?.content;
  });

  if (hasSemanticDrift) {
    return domainFailure(
      createValidationDomainError('Preview snapshot does not match PDF payload', {
        previewVersionId: input.previewVersionId,
      }),
      meta,
    );
  }

  const pdfResult = await generatePdf(pdfInput);
  if (!pdfResult.ok) {
    return domainFailure(pdfResult.error, meta);
  }

  return domainSuccess(pdfResult.data, meta);
}
