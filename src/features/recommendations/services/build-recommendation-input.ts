import { recommendationInputSnapshotSchema } from '../schemas/recommendation.schema';
import type { RecommendationInputSnapshot } from '../schemas/recommendation.schema';
import type { OnboardingOverview } from '../../wizard/types/wizard.types';

type BuildRecommendationInputParams = {
  userId: string;
  overview: Pick<OnboardingOverview, 'draft' | 'employabilityFlow'>;
  locale?: string;
};

const TEAM_SIZE_MAP: Record<string, number> = {
  '0': 0,
  '1_5': 5,
  '6_15': 15,
  '16_40': 40,
  '41_100': 100,
  '100_plus': 120,
};

function toOptionalString(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function toTeamSize(value: string | null | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  if (value in TEAM_SIZE_MAP) {
    return TEAM_SIZE_MAP[value];
  }

  return undefined;
}

function createSnapshotId(userId: string, profileSnapshotId?: string): string {
  return profileSnapshotId ? `wizard-${profileSnapshotId}` : `wizard-snapshot-${userId}`;
}

export function buildRecommendationInput(
  params: BuildRecommendationInputParams,
): RecommendationInputSnapshot {
  const { draft, employabilityFlow } = params.overview;

  return recommendationInputSnapshotSchema.parse({
    userId: params.userId,
    locale: params.locale ?? 'es-ES',
    snapshotId: createSnapshotId(params.userId, employabilityFlow?.profileSnapshotId),
    branch: toOptionalString(draft.militar.branch),
    corps: toOptionalString(draft.militar.corps),
    rank: toOptionalString(draft.militar.rank.code),
    specialty: toOptionalString(draft.militar.specialty.code),
    destinationContext: toOptionalString(draft.militar.destinationContext),
    leadership: Boolean(toOptionalString(draft.militar.leadershipLevel)),
    teamSize: toTeamSize(draft.militar.teamSize),
    responsibilityAreas: draft.experiencia.responsibilityAreas,
    missionTypes: draft.experiencia.missionTypes,
    functionTypes: draft.experiencia.functionTypes,
    tools: draft.experiencia.tools,
    technicalSkills: draft.competencias.technicalSkills,
    softSkills: draft.competencias.softSkills,
    certifications: draft.competencias.certifications,
    drivingLicenses: draft.competencias.drivingLicenses,
    languages: draft.competencias.languages.map((language) => language.name),
    officeTools: draft.competencias.officeTools,
    targetRoleHints: draft.objetivos.targetRoles.map((role) => role.slug),
    targetSectorHints: draft.objetivos.targetSectors,
    seniorityHint: draft.objetivos.seniority ?? undefined,
    workModelHint: draft.objetivos.workModel ?? undefined,
  });
}
