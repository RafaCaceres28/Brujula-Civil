import { domainFailure, domainSuccess, toInternalDomainError } from '../../../lib/contracts/index';
import {
  translationExplainabilityContextSchema,
  translationOutputSchema,
} from '../schemas/translation.schema';
import type {
  TranslationDomainInput,
  TranslationDomainOutput,
  TranslationDomainResult,
} from '../types/translation.types';

function normalizeSentence(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return trimmed;
  }

  return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
}

function professionalizeText(text: string, tone: TranslationDomainInput['tone']): string {
  const normalized = normalizeSentence(text);

  if (tone === 'concise') {
    return normalized;
  }

  if (tone === 'formal') {
    return `Demonstrated ${normalized.charAt(0).toLowerCase()}${normalized.slice(1)}`;
  }

  return normalized;
}

const buildTranslationOutput = (input: TranslationDomainInput): TranslationDomainOutput => {
  const sourceRef =
    input.sourceProfile.kind === 'profile_snapshot'
      ? input.sourceProfile.snapshotId
      : input.sourceProfile.profileId;

  const tone = input.tone ?? 'neutral';
  const candidateBlocks =
    input.sourceProfile.kind === 'profile_snapshot'
      ? [input.sourceProfile.summary, ...input.sourceProfile.highlights]
      : [input.sourceProfile.headline, ...input.sourceProfile.highlights];

  const translatedBlocks = candidateBlocks
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .slice(0, 3)
    .map((value, index) => ({
      id: `translation-block-${index + 1}`,
      sourceRef,
      content: professionalizeText(value, tone),
    }));

  const qualityFlags: TranslationDomainOutput['qualityFlags'] = [];
  if (translatedBlocks.length < 2) {
    qualityFlags.push('MISSING_CONTEXT');
  }

  const selectedRouteContext = translationExplainabilityContextSchema.safeParse(
    input.selectedRouteContext,
  );

  return translationOutputSchema.parse({
    blocks: translatedBlocks,
    sourceRefMap: translatedBlocks.reduce<Record<string, string>>((map, block) => {
      map[block.id] = sourceRef;
      return map;
    }, {}),
    qualityFlags,
    ...(input.selectedRouteId ? { selectedRouteId: input.selectedRouteId } : {}),
    ...(selectedRouteContext.success ? { selectedRouteContext: selectedRouteContext.data } : {}),
  });
};

export async function generateTranslation(
  input: TranslationDomainInput,
): Promise<TranslationDomainResult> {
  try {
    const output = buildTranslationOutput(input);
    return domainSuccess(output);
  } catch (error) {
    return domainFailure(toInternalDomainError(error, 'Failed to generate translation'));
  }
}
