import { domainFailure, domainSuccess, toInternalDomainError } from '../../../lib/contracts/index';
import { pdfGenerationInputSchema, pdfGenerationOutputSchema } from '../schemas/document.schema';
import type { CvDomainOutput } from '../../cv/types/cv.types';
import type {
  DocumentsDomainInput,
  DocumentsDomainOutput,
  DocumentsDomainResult,
} from '../types/document.types';

type CvPreviewToPdfInput = {
  userId: string;
  cvPreview: CvDomainOutput;
  locale: string;
  selectedRouteId?: string;
};

const buildPdfGenerationOutput = (input: DocumentsDomainInput): DocumentsDomainOutput => {
  const documentId = `document-${input.userId}-${Date.now()}`;

  return pdfGenerationOutputSchema.parse({
    documentId,
    status: 'queued',
    storagePath: `documents/${input.userId}/${documentId}.pdf`,
    downloadUrl: undefined,
  });
};

export async function generatePdf(input: DocumentsDomainInput): Promise<DocumentsDomainResult> {
  try {
    return domainSuccess(buildPdfGenerationOutput(input));
  } catch (error) {
    return domainFailure(toInternalDomainError(error, 'Failed to queue PDF generation'));
  }
}

export function mapCvPreviewToPdfGenerationInput(input: CvPreviewToPdfInput): DocumentsDomainInput {
  return pdfGenerationInputSchema.parse({
    userId: input.userId,
    cvPreview: input.cvPreview,
    format: 'pdf',
    locale: input.locale,
    ...(input.selectedRouteId ? { selectedRouteId: input.selectedRouteId } : {}),
  });
}

export async function generatePdfFromCvPreview(
  input: CvPreviewToPdfInput,
): Promise<DocumentsDomainResult> {
  try {
    const pdfInput = mapCvPreviewToPdfGenerationInput(input);
    return await generatePdf(pdfInput);
  } catch (error) {
    return domainFailure(toInternalDomainError(error, 'Failed to map CV preview into PDF input'));
  }
}
