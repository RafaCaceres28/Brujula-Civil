import {
  createDomainError,
  createValidationDomainError,
  domainIdSchema,
  domainFailure,
  domainSuccess,
  isDomainError,
  toInternalDomainError,
  type DomainMeta,
  type DomainResult,
} from '../../../../lib/contracts/index';
import { getHttpStatusForDomainResult } from '../../../../lib/contracts/http-error-mapper';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  pdfGenerationInputSchema,
  type PdfGenerationOutput,
} from '../../../../features/documents/schemas/document.schema';
import { exportCvPdf } from '../../../../features/cv/server/export-cv-pdf';
import type { DocumentsDomainError } from '../../../../features/documents/types/document.types';

type CvPdfRouteResult = DomainResult<PdfGenerationOutput, DocumentsDomainError>;

const ROUTE_SOURCE = 'api.cv.pdf.route';

const cvPdfRouteInputSchema = pdfGenerationInputSchema.extend({
  previewVersionId: domainIdSchema,
  isUserEdited: z.boolean(),
});

function resolveRequestId(request: Request): string {
  return request.headers.get('x-request-id')?.trim() || crypto.randomUUID();
}

function createMeta(requestId: string): DomainMeta {
  return {
    requestId,
    timestamp: new Date().toISOString(),
    source: ROUTE_SOURCE,
  };
}

function withMeta(result: CvPdfRouteResult, meta: DomainMeta): CvPdfRouteResult {
  const nextMeta = {
    ...meta,
    ...(result.meta?.traceability ? { traceability: result.meta.traceability } : {}),
  };

  return result.ok ? domainSuccess(result.data, nextMeta) : domainFailure(result.error, nextMeta);
}

function responseForResult(result: CvPdfRouteResult, traceTag?: string) {
  const status = getHttpStatusForDomainResult(result);
  return NextResponse.json(result, {
    status,
    ...(traceTag ? { headers: { 'x-flow-trace': traceTag } } : {}),
  });
}

function toUserSafePdfRouteError(error: unknown, requestId: string): DocumentsDomainError {
  const domainError = isDomainError(error)
    ? error
    : toInternalDomainError(error, 'Failed to queue PDF generation');

  const safeMessageByCode: Record<DocumentsDomainError['code'], string> = {
    VALIDATION_ERROR: 'No pudimos validar la solicitud de exportacion PDF.',
    NOT_FOUND: 'No encontramos datos del preview para exportar el PDF.',
    CONFLICT: 'Detectamos un conflicto de version del preview. Reintenta la exportacion.',
    UNAUTHORIZED: 'Tu sesion no es valida para exportar el PDF.',
    FORBIDDEN: 'No tienes permisos para exportar este PDF.',
    EXTERNAL_DEPENDENCY_ERROR:
      'El servicio de documentos no esta disponible en este momento. Intenta nuevamente.',
    RATE_LIMITED: 'Recibimos demasiadas solicitudes de exportacion. Reintenta en unos minutos.',
    INTERNAL_ERROR: 'No pudimos iniciar la exportacion de PDF. Intenta nuevamente.',
  };

  return createDomainError({
    code: domainError.code,
    message: safeMessageByCode[domainError.code],
    retryable: domainError.retryable ?? domainError.code !== 'VALIDATION_ERROR',
    details: {
      requestId,
    },
  });
}

export async function POST(request: Request) {
  const requestId = resolveRequestId(request);
  const meta = createMeta(requestId);
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    const result = withMeta(
      domainFailure(createValidationDomainError('Invalid JSON payload for CV PDF endpoint')),
      meta,
    );
    return responseForResult(result);
  }

  const parsedInput = cvPdfRouteInputSchema.safeParse(payload);
  if (!parsedInput.success) {
    const result = withMeta(
      domainFailure(
        createValidationDomainError('Invalid PDF generation input', {
          issues: parsedInput.error.issues,
        }),
      ),
      meta,
    );
    return responseForResult(result);
  }

  try {
    const result = await exportCvPdf({
      userId: parsedInput.data.userId,
      cvPreview: parsedInput.data.cvPreview,
      locale: parsedInput.data.locale,
      previewVersionId: parsedInput.data.previewVersionId,
      isUserEdited: parsedInput.data.isUserEdited,
      ...(parsedInput.data.selectedRouteId
        ? { selectedRouteId: parsedInput.data.selectedRouteId }
        : {}),
      requestId,
    });

    const traceRouteId =
      parsedInput.data.selectedRouteId ?? parsedInput.data.cvPreview.selectedRouteId;
    const traceTag = traceRouteId
      ? `preview:${parsedInput.data.previewVersionId};route:${traceRouteId}`
      : `preview:${parsedInput.data.previewVersionId}`;
    return responseForResult(withMeta(result, meta), traceTag);
  } catch (error) {
    console.error('cv/pdf route error', { requestId, error });
    const result = withMeta(domainFailure(toUserSafePdfRouteError(error, requestId)), meta);
    return responseForResult(result);
  }
}
