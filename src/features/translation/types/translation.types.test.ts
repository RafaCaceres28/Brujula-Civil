import { describe, expectTypeOf, it } from 'vitest';
import type {
  ContractVersion,
  GeneratedArtifactSource,
  GeneratedArtifactType,
  GeneratedTranslationArtifact,
  NormalizedCompetencies,
  SuggestionPriority,
  TranslationFinalResult,
  TranslationResult,
  TranslationSuggestion,
} from './translation.types';
import type { TranslationOutput } from '../schemas/translation.schema';
import type { CompetenciasStep } from '@/features/wizard/schemas/wizard.schema';

type VersionChangeKind = 'breaking' | 'backward-compatible' | 'non-contract-fix';

type VersionForChange<K extends VersionChangeKind> = K extends 'breaking'
  ? `${number}.0.0`
  : K extends 'backward-compatible'
    ? `${number}.${number}.0`
    : ContractVersion;

describe('translation.types contracts', () => {
  it('keeps TranslationResult aligned with translation schema output', () => {
    expectTypeOf<TranslationResult>().toEqualTypeOf<TranslationOutput>();
  });

  it('defines GeneratedTranslationArtifact with required identity and optional metadata', () => {
    expectTypeOf<GeneratedTranslationArtifact>().toMatchTypeOf<{
      artifactType: GeneratedArtifactType;
      content: string;
      contractVersion: ContractVersion;
    }>();

    expectTypeOf<GeneratedTranslationArtifact['source']>().toEqualTypeOf<
      GeneratedArtifactSource | undefined
    >();
    expectTypeOf<GeneratedTranslationArtifact['confidence']>().toEqualTypeOf<
      number | null | undefined
    >();
  });

  it('rejects incomplete GeneratedTranslationArtifact contracts at compile time', () => {
    const acceptArtifact = (_artifact: GeneratedTranslationArtifact): void => {
      return;
    };

    // @ts-expect-error contractVersion is mandatory in GeneratedTranslationArtifact
    acceptArtifact({
      artifactType: 'summary',
      content: 'Resumen traducido',
    });

    // @ts-expect-error content is mandatory in GeneratedTranslationArtifact
    acceptArtifact({
      artifactType: 'summary',
      contractVersion: '1.0.0',
    });
  });

  it('defines TranslationSuggestion for rendering with optional support metadata', () => {
    expectTypeOf<TranslationSuggestion>().toMatchTypeOf<{
      id: string;
      label: string;
      contractVersion: ContractVersion;
    }>();

    expectTypeOf<TranslationSuggestion['priority']>().toEqualTypeOf<
      SuggestionPriority | undefined
    >();
    expectTypeOf<TranslationSuggestion['rationale']>().toEqualTypeOf<string | null | undefined>();
    expectTypeOf<TranslationSuggestion['evidence']>().toEqualTypeOf<string | null | undefined>();
  });

  it('rejects incomplete TranslationSuggestion contracts at compile time', () => {
    const acceptSuggestion = (_suggestion: TranslationSuggestion): void => {
      return;
    };

    // @ts-expect-error label is required for UI consumption
    acceptSuggestion({
      id: 'suggestion-1',
      contractVersion: '1.0.0',
    });

    // @ts-expect-error contractVersion is mandatory in TranslationSuggestion
    acceptSuggestion({
      id: 'suggestion-1',
      label: 'Project Manager',
    });
  });

  it('enforces documented semantic version policy at type level', () => {
    const breakingChangeVersion: VersionForChange<'breaking'> = '2.0.0';
    const backwardCompatibleVersion: VersionForChange<'backward-compatible'> = '2.1.0';
    const nonContractFixVersion: VersionForChange<'non-contract-fix'> = '2.1.4';

    expectTypeOf(breakingChangeVersion).toMatchTypeOf<ContractVersion>();
    expectTypeOf(backwardCompatibleVersion).toMatchTypeOf<ContractVersion>();
    expectTypeOf(nonContractFixVersion).toMatchTypeOf<ContractVersion>();

    // @ts-expect-error breaking changes must use MAJOR bump shape X.0.0
    const invalidBreakingVersion: VersionForChange<'breaking'> = '2.1.0';
    // @ts-expect-error backward-compatible changes must use MINOR bump shape X.Y.0
    const invalidBackwardCompatibleVersion: VersionForChange<'backward-compatible'> = '2.1.4';

    void invalidBreakingVersion;
    void invalidBackwardCompatibleVersion;
  });

  it('keeps NormalizedCompetencies structurally compatible with competenciasStepSchema', () => {
    expectTypeOf<NormalizedCompetencies>().toEqualTypeOf<CompetenciasStep>();
    expectTypeOf<NormalizedCompetencies['extraTraining']>().toEqualTypeOf<string | null>();
  });

  it('composes TranslationFinalResult from TranslationResult and generated artifacts', () => {
    expectTypeOf<TranslationFinalResult>().toMatchTypeOf<TranslationResult>();
    expectTypeOf<TranslationFinalResult['artifacts']>().toEqualTypeOf<
      GeneratedTranslationArtifact[]
    >();
    expectTypeOf<TranslationFinalResult['suggestions']>().toEqualTypeOf<TranslationSuggestion[]>();
    expectTypeOf<
      TranslationFinalResult['normalizedCompetencies']
    >().toEqualTypeOf<NormalizedCompetencies>();
    expectTypeOf<TranslationFinalResult['contractVersion']>().toEqualTypeOf<ContractVersion>();
  });
});
