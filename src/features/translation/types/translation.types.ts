import type { DomainError, DomainResult } from '../../../lib/contracts/index';
import type {
  LinkedInNormalizedProfile,
  ProfileSnapshot,
  TranslatedBlock,
  TranslationInput,
  TranslationOutput,
  TranslationQualityFlag,
  TranslationTone,
} from '../schemas/translation.schema';

export type TranslationContractVersion = `${number}.${number}.${number}`;

export type TranslationDomainInput = TranslationInput;

export type TranslationSourceProfile = ProfileSnapshot | LinkedInNormalizedProfile;

export type TranslatedProfileContent = {
  blocks: TranslatedBlock[];
  sourceRefMap: Record<string, string>;
  qualityFlags: TranslationQualityFlag[];
};

export type TranslationDomainOutput = TranslationOutput;

export type TranslationDomainError = DomainError;

export type TranslationDomainResult = DomainResult<TranslationDomainOutput, TranslationDomainError>;

export type SupportedTranslationTone = TranslationTone;
