import {
  createValidationDomainError,
  domainIdSchema,
  domainFailure,
  domainSuccess,
  toInternalDomainError,
  type DomainMeta,
  type DomainResult,
} from '../../../lib/contracts/index';
import { getHttpStatusForDomainResult } from '../../../lib/contracts/http-error-mapper';
import { NextResponse } from 'next/server';
import {
  translationInputSchema,
  type TranslationOutput,
} from '../../../features/translation/schemas/translation.schema';
import { generateTranslation } from '../../../features/translation/server/generate-translation';
import type { TranslationDomainError } from '../../../features/translation/types/translation.types';

type TranslationRouteResult = DomainResult<TranslationOutput, TranslationDomainError>;

const ROUTE_SOURCE = 'api.translation.route';

const translationRouteInputSchema = translationInputSchema
  .extend({
    selectedRouteId: domainIdSchema,
  })
  .strict();

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

function responseForResult(result: TranslationRouteResult, traceTag?: string) {
  const status = getHttpStatusForDomainResult(result);
  return NextResponse.json(result, {
    status,
    ...(traceTag ? { headers: { 'x-flow-trace': traceTag } } : {}),
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
      domainFailure(createValidationDomainError('Invalid JSON payload for translation endpoint')),
      meta,
    );
    return responseForResult(result);
  }

  const parsedInput = translationRouteInputSchema.safeParse(payload);
  if (!parsedInput.success) {
    const result = withMeta(
      domainFailure(
        createValidationDomainError('Invalid translation input', {
          issues: parsedInput.error.issues,
        }),
      ),
      meta,
    );
    return responseForResult(result);
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
      selectedRouteId: parsedInput.data.selectedRouteId,
      ...(parsedInput.data.tone ? { tone: parsedInput.data.tone } : {}),
    });

    return responseForResult(
      withMeta(result, meta),
      `profile:${sourceRef};route:${parsedInput.data.selectedRouteId}`,
    );
  } catch (error) {
    const result = withMeta(
      domainFailure(toInternalDomainError(error, 'Failed to generate translation')),
      meta,
    );
    return responseForResult(result);
  }
}
