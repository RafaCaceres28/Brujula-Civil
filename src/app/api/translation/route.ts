import {
  createValidationDomainError,
  domainFailure,
  domainSuccess,
  toInternalDomainError,
  type DomainResult,
} from '../../../lib/contracts/index';
import { NextResponse } from 'next/server';
import {
  translationInputSchema,
  translationOutputSchema,
  type TranslationOutput,
} from '../../../features/translation/schemas/translation.schema';
import type { TranslationDomainError } from '../../../features/translation/types/translation.types';

type TranslationRouteResult = DomainResult<TranslationOutput, TranslationDomainError>;

function responseForResult(result: TranslationRouteResult) {
  const status = result.ok ? 200 : result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
  return NextResponse.json(result, { status });
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    const result = domainFailure(
      createValidationDomainError('Invalid JSON payload for translation endpoint'),
    );
    return responseForResult(result);
  }

  const parsedInput = translationInputSchema.safeParse(payload);
  if (!parsedInput.success) {
    const result = domainFailure(
      createValidationDomainError('Invalid translation input', {
        issues: parsedInput.error.issues,
      }),
    );
    return responseForResult(result);
  }

  try {
    const sourceRef =
      parsedInput.data.sourceProfile.kind === 'profile_snapshot'
        ? parsedInput.data.sourceProfile.snapshotId
        : parsedInput.data.sourceProfile.profileId;

    const output = translationOutputSchema.parse({
      blocks: [
        {
          id: 'translation-block-1',
          sourceRef,
          content: 'Translation generation pending implementation',
        },
      ],
      sourceRefMap: {
        'translation-block-1': sourceRef,
      },
      qualityFlags: ['MISSING_CONTEXT'],
    });

    return responseForResult(domainSuccess(output));
  } catch (error) {
    const result = domainFailure(toInternalDomainError(error, 'Failed to generate translation'));
    return responseForResult(result);
  }
}
