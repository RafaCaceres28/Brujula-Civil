'use server';

import {
  domainFailure,
  domainSuccess,
  type DomainMeta,
  type DomainResult,
} from '@/lib/contracts/index';
import { mapProfileToTranslationSnapshot } from '@/features/profile/services/profile.mapper';
import type { ProfileDomainModel } from '@/features/profile/types/profile.types';
import { generateTranslation } from '@/features/translation/server/generate-translation';
import type {
  TranslationDomainError,
  TranslationDomainInput,
} from '@/features/translation/types/translation.types';
import type { TranslationOutput } from '@/features/translation/schemas/translation.schema';
import { generateCv } from '../server/generate-cv';
import { mapTranslationOutputToCvInput } from '../services/cv.mapper';
import type { CvDomainError, CvDomainOutput, CvLayoutTemplateKey } from '../types/cv.types';

type BuildCvPreviewFlowInput = {
  userId: string;
  profile: ProfileDomainModel;
  sourceLanguage: TranslationDomainInput['sourceLanguage'];
  targetLanguage: TranslationDomainInput['targetLanguage'];
  tone?: TranslationDomainInput['tone'];
  templateKey: CvLayoutTemplateKey;
  requestId?: string;
};

type BuildCvPreviewFlowOutput = {
  profileSnapshotId: string;
  translation: TranslationOutput;
  cvPreview: CvDomainOutput;
};

type BuildCvPreviewFlowError = TranslationDomainError | CvDomainError;

const ACTION_SOURCE = 'cv.actions.cv-flow';

function createFlowMeta(requestId?: string): DomainMeta {
  return {
    timestamp: new Date().toISOString(),
    source: ACTION_SOURCE,
    ...(requestId ? { requestId } : {}),
  };
}

export async function buildCvPreviewFlow(
  input: BuildCvPreviewFlowInput,
): Promise<DomainResult<BuildCvPreviewFlowOutput, BuildCvPreviewFlowError>> {
  const meta = createFlowMeta(input.requestId);

  const profileSnapshot = mapProfileToTranslationSnapshot(input.profile);

  const translationResult = await generateTranslation({
    userId: input.userId,
    sourceProfile: profileSnapshot,
    sourceLanguage: input.sourceLanguage,
    targetLanguage: input.targetLanguage,
    tone: input.tone,
  });

  if (!translationResult.ok) {
    return domainFailure(translationResult.error, meta);
  }

  const cvInput = mapTranslationOutputToCvInput({
    userId: input.userId,
    profileSnapshotId: profileSnapshot.snapshotId,
    translatedContent: translationResult.data,
    templateKey: input.templateKey,
  });

  const cvResult = await generateCv(cvInput);
  if (!cvResult.ok) {
    return domainFailure(cvResult.error, meta);
  }

  return domainSuccess(
    {
      profileSnapshotId: profileSnapshot.snapshotId,
      translation: translationResult.data,
      cvPreview: cvResult.data,
    },
    meta,
  );
}
