import {
  createValidationDomainError,
  domainFailure,
  domainSuccess,
  toInternalDomainError,
  type DomainResult,
} from '../../../../lib/contracts/index';
import { NextResponse } from 'next/server';
import {
  linkedInNormalizedProfileSchema,
  linkedInSourceInputSchema,
  type LinkedInNormalizedProfile,
} from '../../../../features/linkedin/schemas/linkedin.schema';
import type { LinkedInDomainError } from '../../../../features/linkedin/types/linkedin.types';

type LinkedInRouteResult = DomainResult<LinkedInNormalizedProfile, LinkedInDomainError>;

function responseForResult(result: LinkedInRouteResult) {
  const status = result.ok ? 200 : result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
  return NextResponse.json(result, { status });
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    const result = domainFailure(
      createValidationDomainError('Invalid JSON payload for LinkedIn endpoint'),
    );
    return responseForResult(result);
  }

  const parsedInput = linkedInSourceInputSchema.safeParse(payload);
  if (!parsedInput.success) {
    const result = domainFailure(
      createValidationDomainError('Invalid LinkedIn generation input', {
        issues: parsedInput.error.issues,
      }),
    );
    return responseForResult(result);
  }

  try {
    const output = linkedInNormalizedProfileSchema.parse({
      headline: parsedInput.data.profileUrl ? 'Profile imported from LinkedIn URL' : null,
      experience: [],
      education: [],
      skills: [],
    });

    return responseForResult(domainSuccess(output));
  } catch (error) {
    const result = domainFailure(
      toInternalDomainError(error, 'Failed to generate LinkedIn profile'),
    );
    return responseForResult(result);
  }
}
