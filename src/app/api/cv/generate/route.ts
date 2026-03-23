import {
  createValidationDomainError,
  domainFailure,
  domainSuccess,
  toInternalDomainError,
  type DomainResult,
} from '../../../../lib/contracts/index';
import { NextResponse } from 'next/server';
import {
  cvPreviewInputSchema,
  cvPreviewOutputSchema,
  type CvPreviewModel,
} from '../../../../features/cv/schemas/cv.schema';
import type { CvDomainError } from '../../../../features/cv/types/cv.types';

type CvGenerateRouteResult = DomainResult<CvPreviewModel, CvDomainError>;

function responseForResult(result: CvGenerateRouteResult) {
  const status = result.ok ? 200 : result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
  return NextResponse.json(result, { status });
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    const result = domainFailure(
      createValidationDomainError('Invalid JSON payload for CV endpoint'),
    );
    return responseForResult(result);
  }

  const parsedInput = cvPreviewInputSchema.safeParse(payload);
  if (!parsedInput.success) {
    const result = domainFailure(
      createValidationDomainError('Invalid CV preview input', {
        issues: parsedInput.error.issues,
      }),
    );
    return responseForResult(result);
  }

  try {
    const firstBlock = parsedInput.data.translatedContent.blocks[0];

    const output = cvPreviewOutputSchema.parse({
      sections: [
        {
          id: 'cv-section-summary',
          title: 'Professional Summary',
          content: firstBlock.content,
          sourceBlockIds: [firstBlock.id],
        },
      ],
      layout: {
        templateKey: parsedInput.data.templateKey,
        columns: parsedInput.data.templateKey === 'single-column' ? 1 : 2,
      },
      completeness: 'needs_review',
    });

    return responseForResult(domainSuccess(output));
  } catch (error) {
    const result = domainFailure(toInternalDomainError(error, 'Failed to generate CV preview'));
    return responseForResult(result);
  }
}
