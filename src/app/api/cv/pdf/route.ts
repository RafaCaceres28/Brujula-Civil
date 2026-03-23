import {
  createValidationDomainError,
  domainFailure,
  domainSuccess,
  toInternalDomainError,
  type DomainResult,
} from '../../../../lib/contracts/index';
import { NextResponse } from 'next/server';
import {
  pdfGenerationInputSchema,
  pdfGenerationOutputSchema,
  type PdfGenerationOutput,
} from '../../../../features/documents/schemas/document.schema';
import type { DocumentsDomainError } from '../../../../features/documents/types/document.types';

type CvPdfRouteResult = DomainResult<PdfGenerationOutput, DocumentsDomainError>;

function responseForResult(result: CvPdfRouteResult) {
  const status = result.ok ? 200 : result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
  return NextResponse.json(result, { status });
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    const result = domainFailure(
      createValidationDomainError('Invalid JSON payload for CV PDF endpoint'),
    );
    return responseForResult(result);
  }

  const parsedInput = pdfGenerationInputSchema.safeParse(payload);
  if (!parsedInput.success) {
    const result = domainFailure(
      createValidationDomainError('Invalid PDF generation input', {
        issues: parsedInput.error.issues,
      }),
    );
    return responseForResult(result);
  }

  try {
    const output = pdfGenerationOutputSchema.parse({
      documentId: 'document-pdf-1',
      status: 'queued',
      storagePath: `documents/${parsedInput.data.userId}/document-pdf-1.pdf`,
      downloadUrl: undefined,
    });

    return responseForResult(domainSuccess(output));
  } catch (error) {
    const result = domainFailure(toInternalDomainError(error, 'Failed to queue PDF generation'));
    return responseForResult(result);
  }
}
