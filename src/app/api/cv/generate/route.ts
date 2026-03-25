import {
  createValidationDomainError,
  domainFailure,
  domainSuccess,
  toInternalDomainError,
  type DomainMeta,
  type DomainResult,
} from '../../../../lib/contracts/index';
import { getHttpStatusForDomainResult } from '../../../../lib/contracts/http-error-mapper';
import { NextResponse } from 'next/server';
import {
  cvPreviewInputSchema,
  type CvPreviewModel,
} from '../../../../features/cv/schemas/cv.schema';
import { generateCv } from '../../../../features/cv/server/generate-cv';
import type { CvDomainError } from '../../../../features/cv/types/cv.types';

type CvGenerateRouteResult = DomainResult<CvPreviewModel, CvDomainError>;

const ROUTE_SOURCE = 'api.cv.generate.route';

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

function withMeta(result: CvGenerateRouteResult, meta: DomainMeta): CvGenerateRouteResult {
  return result.ok ? domainSuccess(result.data, meta) : domainFailure(result.error, meta);
}

function responseForResult(
  result: CvGenerateRouteResult,
  options?: { traceTag?: string; selectedRouteFitLabel?: string },
) {
  const status = getHttpStatusForDomainResult(result);
  const headers: HeadersInit = {};

  if (options?.traceTag) {
    headers['x-flow-trace'] = options.traceTag;
  }

  if (options?.selectedRouteFitLabel) {
    headers['x-route-fit-label'] = options.selectedRouteFitLabel;
  }

  return NextResponse.json(result, {
    status,
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
  });
}

function resolveFlowTraceTag(input: {
  profileSnapshotId: string;
  selectedRouteId?: string;
}): string {
  return input.selectedRouteId
    ? `profile:${input.profileSnapshotId};route:${input.selectedRouteId}`
    : `profile:${input.profileSnapshotId}`;
}

export async function POST(request: Request) {
  const requestId = resolveRequestId(request);
  const meta = createMeta(requestId);
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    const result = withMeta(
      domainFailure(createValidationDomainError('Invalid JSON payload for CV endpoint')),
      meta,
    );
    return responseForResult(result);
  }

  const parsedInput = cvPreviewInputSchema.safeParse(payload);
  if (!parsedInput.success) {
    const result = withMeta(
      domainFailure(
        createValidationDomainError('Invalid CV preview input', {
          issues: parsedInput.error.issues,
        }),
      ),
      meta,
    );
    return responseForResult(result);
  }

  try {
    const result = await generateCv(parsedInput.data);
    const traceTag = resolveFlowTraceTag({
      profileSnapshotId: parsedInput.data.profileSnapshotId,
      selectedRouteId: result.ok
        ? result.data.selectedRouteId
        : (parsedInput.data.selectedRouteId ?? parsedInput.data.translatedContent.selectedRouteId),
    });
    return responseForResult(withMeta(result, meta), {
      traceTag,
      selectedRouteFitLabel: result.ok
        ? result.data.selectedRouteContext?.fitLabelSnapshot
        : parsedInput.data.selectedRouteContext?.fitLabelSnapshot,
    });
  } catch (error) {
    const result = withMeta(
      domainFailure(toInternalDomainError(error, 'Failed to generate CV preview')),
      meta,
    );
    return responseForResult(result);
  }
}
