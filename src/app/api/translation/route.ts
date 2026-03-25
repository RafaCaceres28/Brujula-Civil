import {
  createValidationDomainError,
  domainFailure,
  domainSuccess,
  toInternalDomainError,
  type DomainMeta,
  type DomainResult,
} from '../../../lib/contracts/index';
import { getHttpStatusForDomainResult } from '../../../lib/contracts/http-error-mapper';
import { NextResponse } from 'next/server';
import {
  translationExplainabilityContextSchema,
  translationInputSchema,
  type TranslationOutput,
} from '../../../features/translation/schemas/translation.schema';
import { generateTranslation } from '../../../features/translation/server/generate-translation';
import type { TranslationDomainError } from '../../../features/translation/types/translation.types';

type TranslationRouteResult = DomainResult<TranslationOutput, TranslationDomainError>;

const ROUTE_SOURCE = 'api.translation.route';
const DOMAIN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:_-]*$/;

const translationRouteInputSchema = translationInputSchema.strict();

function resolveRequestId(request: Request): string {
  return request.headers.get('x-request-id')?.trim() || crypto.randomUUID();
}

function withMeta(result: TranslationRouteResult, meta: DomainMeta): TranslationRouteResult {
  return result.ok ? domainSuccess(result.data, meta) : domainFailure(result.error, meta);
}

function createMeta(requestId: string): DomainMeta {
  return {
    requestId,
    timestamp: new Date().toISOString(),
    source: ROUTE_SOURCE,
  };
}

function responseForResult(
  result: TranslationRouteResult,
  options?: {
    traceTag?: string;
    explainabilityFallbackUsed?: boolean;
    selectedRouteFitLabel?: string;
  },
) {
  const status = getHttpStatusForDomainResult(result);

  const headers: HeadersInit = {};
  if (options?.traceTag) {
    headers['x-flow-trace'] = options.traceTag;
  }

  if (options?.explainabilityFallbackUsed) {
    headers['x-explainability-status'] = 'fallback';
  }

  if (options?.selectedRouteFitLabel) {
    headers['x-route-fit-label'] = options.selectedRouteFitLabel;
  }

  return NextResponse.json(result, {
    status,
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
  });
}

function sanitizeExplainabilityInput(payload: unknown): {
  payload: unknown;
  explainabilityFallbackUsed: boolean;
} {
  if (typeof payload !== 'object' || payload === null) {
    return { payload, explainabilityFallbackUsed: false };
  }

  const payloadRecord = payload as Record<string, unknown>;
  let explainabilityFallbackUsed = false;
  const safePayload: Record<string, unknown> = { ...payloadRecord };

  if ('selectedRouteContext' in payloadRecord && payloadRecord.selectedRouteContext !== undefined) {
    const parsedContext = translationExplainabilityContextSchema.safeParse(
      payloadRecord.selectedRouteContext,
    );

    if (parsedContext.success) {
      safePayload.selectedRouteContext = parsedContext.data;
    } else {
      delete safePayload.selectedRouteContext;
      explainabilityFallbackUsed = true;
    }
  }

  if (!('selectedRouteId' in payloadRecord)) {
    return { payload: safePayload, explainabilityFallbackUsed };
  }

  const selectedRouteId = payloadRecord.selectedRouteId;

  if (selectedRouteId === undefined) {
    return { payload: safePayload, explainabilityFallbackUsed };
  }

  if (typeof selectedRouteId !== 'string') {
    delete safePayload.selectedRouteId;
    delete safePayload.selectedRouteContext;
    return { payload: safePayload, explainabilityFallbackUsed: true };
  }

  const normalizedRouteId = selectedRouteId.trim();
  if (!normalizedRouteId || !DOMAIN_ID_PATTERN.test(normalizedRouteId)) {
    delete safePayload.selectedRouteId;
    delete safePayload.selectedRouteContext;
    return { payload: safePayload, explainabilityFallbackUsed: true };
  }

  if (normalizedRouteId === selectedRouteId) {
    return { payload: safePayload, explainabilityFallbackUsed };
  }

  safePayload.selectedRouteId = normalizedRouteId;

  return {
    payload: safePayload,
    explainabilityFallbackUsed,
  };
}

function buildTraceTag(
  sourceRef: string,
  selectedRouteId: string | undefined,
  supportsLegacyFlow: boolean,
) {
  if (selectedRouteId) {
    return `profile:${sourceRef};route:${selectedRouteId}`;
  }

  if (supportsLegacyFlow) {
    return `profile:${sourceRef};route:legacy-compatible`;
  }

  return `profile:${sourceRef}`;
}

export async function POST(request: Request) {
  const requestId = resolveRequestId(request);
  const meta = createMeta(requestId);
  let payload: unknown;
  let explainabilityFallbackUsed = false;

  try {
    payload = await request.json();
  } catch {
    const result = withMeta(
      domainFailure(createValidationDomainError('Invalid JSON payload for translation endpoint')),
      meta,
    );
    return responseForResult(result);
  }

  const sanitizedPayload = sanitizeExplainabilityInput(payload);
  explainabilityFallbackUsed = sanitizedPayload.explainabilityFallbackUsed;

  const parsedInput = translationRouteInputSchema.safeParse(sanitizedPayload.payload);
  if (!parsedInput.success) {
    const result = withMeta(
      domainFailure(
        createValidationDomainError('Invalid translation input', {
          issues: parsedInput.error.issues,
        }),
      ),
      meta,
    );
    return responseForResult(result, { explainabilityFallbackUsed });
  }

  try {
    const sourceRef =
      parsedInput.data.sourceProfile.kind === 'profile_snapshot'
        ? parsedInput.data.sourceProfile.snapshotId
        : parsedInput.data.sourceProfile.profileId;

    const result = await generateTranslation({
      userId: parsedInput.data.userId,
      sourceProfile: parsedInput.data.sourceProfile,
      sourceLanguage: parsedInput.data.sourceLanguage,
      targetLanguage: parsedInput.data.targetLanguage,
      ...(parsedInput.data.selectedRouteId
        ? { selectedRouteId: parsedInput.data.selectedRouteId }
        : {}),
      ...(parsedInput.data.selectedRouteContext
        ? { selectedRouteContext: parsedInput.data.selectedRouteContext }
        : {}),
      ...(parsedInput.data.tone ? { tone: parsedInput.data.tone } : {}),
    });

    const traceTag = buildTraceTag(sourceRef, parsedInput.data.selectedRouteId, true);

    return responseForResult(withMeta(result, meta), {
      traceTag,
      explainabilityFallbackUsed,
      selectedRouteFitLabel: parsedInput.data.selectedRouteContext?.fitLabelSnapshot,
    });
  } catch (error) {
    const result = withMeta(
      domainFailure(toInternalDomainError(error, 'Failed to generate translation')),
      meta,
    );
    return responseForResult(result, { explainabilityFallbackUsed });
  }
}
