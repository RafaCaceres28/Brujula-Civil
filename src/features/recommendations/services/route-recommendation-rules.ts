import {
  SENIORITY_OPTIONS,
  TARGET_ROLE_OPTIONS,
  TARGET_SECTOR_OPTIONS,
  WORK_MODEL_OPTIONS,
} from '../../wizard/config/wizard-catalogs';
import type {
  RecommendationInputSnapshot,
  RecommendationRoute,
} from '../schemas/recommendation.schema';

const MAX_SHORTLIST_ROUTES = 5;
const MIN_SHORTLIST_ROUTES = 3;

const DEFAULT_REASON_CODE = 'PROFILE_BASELINE';

const MANAGEMENT_ROLE_SET = new Set([
  'project-manager',
  'operations-coordinator',
  'team-lead',
  'security-manager',
]);

const ROLE_SIGNAL_RULES: Record<string, string[]> = {
  'operations-coordinator': ['operations', 'coordination', 'team_management'],
  'project-manager': ['planning', 'project_management', 'leadership'],
  'team-lead': ['team_supervision', 'leadership', 'supervision'],
  'logistics-specialist': ['logistics', 'warehouse_inventory', 'logistics_distribution'],
  'security-manager': ['security', 'facility_security', 'security_protocols'],
  'training-specialist': ['training', 'instruction', 'training_instruction'],
};

const SECTOR_SIGNAL_RULES: Record<string, string[]> = {
  logistics: ['logistics', 'warehouse_inventory', 'logistics_distribution'],
  transport: ['vehicle_fleet_responsibility', 'equipment_operation', 'incident_management'],
  defense_security: ['security', 'facility_security', 'security_protocols'],
  technology: ['communications', 'systems_usage', 'data_tracking'],
  training: ['training', 'instruction', 'training_instruction'],
  consulting: ['analysis', 'reporting', 'process_improvement'],
};

type RouteCandidate = RecommendationRoute & {
  score: number;
};

function normalizeSignal(value: string): string {
  return value.trim().toLowerCase();
}

function addReasonCode(reasons: Set<string>, reasonCode: string): void {
  reasons.add(reasonCode);
}

function computeScore(
  input: RecommendationInputSnapshot,
  roleId: string,
  sectorId: string,
  seniorityId: string | undefined,
  workModelId: string | undefined,
): number {
  let score = 0;

  if (input.targetRoleHints.includes(roleId)) {
    score += 40;
  }

  if (input.targetSectorHints.includes(sectorId)) {
    score += 30;
  }

  if (input.leadership && MANAGEMENT_ROLE_SET.has(roleId)) {
    score += 12;
  }

  if (input.teamSize !== undefined) {
    if (input.teamSize >= 16 && MANAGEMENT_ROLE_SET.has(roleId)) {
      score += 15;
    } else if (input.teamSize >= 6) {
      score += 8;
    }
  }

  if (input.seniorityHint && seniorityId && input.seniorityHint === seniorityId) {
    score += 14;
  }

  if (input.workModelHint && workModelId && input.workModelHint === workModelId) {
    score += 10;
  }

  return score;
}

function resolveReasonCodes(
  input: RecommendationInputSnapshot,
  roleId: string,
  sectorId: string,
  matchedSignals: string[],
): string[] {
  const reasonCodes = new Set<string>();

  if (input.targetRoleHints.includes(roleId)) {
    addReasonCode(reasonCodes, 'TARGET_ROLE_HINT');
  }

  if (input.targetSectorHints.includes(sectorId)) {
    addReasonCode(reasonCodes, 'TARGET_SECTOR_HINT');
  }

  if (matchedSignals.length > 0) {
    addReasonCode(reasonCodes, 'SKILL_SIGNAL_MATCH');
  }

  if (input.leadership && MANAGEMENT_ROLE_SET.has(roleId)) {
    addReasonCode(reasonCodes, 'LEADERSHIP_MATCH');
  }

  if (input.teamSize !== undefined && input.teamSize >= 6) {
    addReasonCode(reasonCodes, 'TEAM_SIZE_MATCH');
  }

  if (reasonCodes.size === 0) {
    addReasonCode(reasonCodes, DEFAULT_REASON_CODE);
  }

  return [...reasonCodes];
}

function normalizeSignals(input: RecommendationInputSnapshot): Set<string> {
  const signalList = [
    ...input.responsibilityAreas,
    ...input.missionTypes,
    ...input.functionTypes,
    ...input.tools,
    ...input.technicalSkills,
    ...input.softSkills,
    ...input.certifications,
    ...input.drivingLicenses,
    ...input.languages,
    ...input.officeTools,
    ...(input.targetSectorHints ?? []),
    ...(input.targetRoleHints ?? []),
    input.branch,
    input.corps,
    input.rank,
    input.specialty,
    input.destinationContext,
  ];

  return new Set(
    signalList
      .filter((signal): signal is string => Boolean(signal && signal.trim()))
      .map(normalizeSignal),
  );
}

function getDefaultSeniority(input: RecommendationInputSnapshot): string | undefined {
  if (input.teamSize && input.teamSize >= 16) {
    return 'manager';
  }

  if (input.teamSize && input.teamSize >= 6) {
    return 'mid';
  }

  return 'junior';
}

function getDefaultWorkModel(input: RecommendationInputSnapshot): string | undefined {
  if (input.destinationContext === 'hq_staff') {
    return 'hybrid';
  }

  return 'onsite';
}

function createReasonSummary(roleLabel: string, sectorLabel: string, matches: string[]): string {
  if (matches.length === 0) {
    return `Tu experiencia militar transferible sugiere una ruta como ${roleLabel} en ${sectorLabel}.`;
  }

  const highlightedMatches = matches.slice(0, 3).join(', ');
  return `Se recomienda ${roleLabel} en ${sectorLabel} por coincidencias en ${highlightedMatches}.`;
}

function createRouteId(roleId: string, sectorId: string, seniorityId?: string): string {
  const normalizedSeniority = seniorityId ?? 'unspecified';
  return `route-${roleId}-${sectorId}-${normalizedSeniority}`;
}

function buildCandidateRoutes(input: RecommendationInputSnapshot): RecommendationRoute[] {
  const knownSectorIds = new Set(TARGET_SECTOR_OPTIONS.map((option) => option.value));
  const knownRoleIds = new Set(TARGET_ROLE_OPTIONS.map((option) => option.slug));
  const selectedSectorHints = input.targetSectorHints.filter((hint) => knownSectorIds.has(hint));
  const selectedRoleHints = input.targetRoleHints.filter((hint) => knownRoleIds.has(hint));

  const sectorPool =
    selectedSectorHints.length > 0
      ? [
          ...TARGET_SECTOR_OPTIONS.filter((option) => selectedSectorHints.includes(option.value)),
          ...TARGET_SECTOR_OPTIONS.filter((option) => !selectedSectorHints.includes(option.value)),
        ]
      : TARGET_SECTOR_OPTIONS;

  const rolePool =
    selectedRoleHints.length > 0
      ? [
          ...TARGET_ROLE_OPTIONS.filter((option) => selectedRoleHints.includes(option.slug)),
          ...TARGET_ROLE_OPTIONS.filter((option) => !selectedRoleHints.includes(option.slug)),
        ]
      : TARGET_ROLE_OPTIONS;

  const signals = normalizeSignals(input);
  const seniorityId =
    SENIORITY_OPTIONS.find((option) => option.value === input.seniorityHint)?.value ??
    (input.teamSize && input.teamSize >= 16 ? 'manager' : undefined);
  const normalizedSeniority =
    SENIORITY_OPTIONS.find((option) => option.value === seniorityId)?.value ??
    getDefaultSeniority(input);
  const normalizedWorkModel =
    WORK_MODEL_OPTIONS.find((option) => option.value === input.workModelHint)?.value ??
    WORK_MODEL_OPTIONS.find((option) => option.value === input.destinationContext)?.value ??
    getDefaultWorkModel(input);
  const candidates: RouteCandidate[] = [];

  for (const role of rolePool) {
    for (const sector of sectorPool) {
      const roleSignals = ROLE_SIGNAL_RULES[role.slug] ?? [];
      const sectorSignals = SECTOR_SIGNAL_RULES[sector.value] ?? [];
      const matchedSignals = [...new Set([...roleSignals, ...sectorSignals])]
        .map(normalizeSignal)
        .filter((signal) => signals.has(signal));
      const reasonCodes = resolveReasonCodes(input, role.slug, sector.value, matchedSignals);
      const score =
        computeScore(input, role.slug, sector.value, normalizedSeniority, normalizedWorkModel) +
        matchedSignals.length * 9;

      const reasonSummary = createReasonSummary(role.label, sector.label, matchedSignals);

      candidates.push({
        routeId: createRouteId(role.slug, sector.value, normalizedSeniority),
        roleId: role.slug,
        sectorId: sector.value,
        seniorityId: normalizedSeniority,
        workModelId: normalizedWorkModel,
        reasonSummary,
        matchedSignals: reasonCodes,
        score,
      });
    }
  }

  candidates.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    if (left.roleId !== right.roleId) {
      return left.roleId.localeCompare(right.roleId);
    }

    return left.sectorId.localeCompare(right.sectorId);
  });

  if (candidates.length >= MIN_SHORTLIST_ROUTES) {
    return candidates.slice(0, MAX_SHORTLIST_ROUTES).map(({ score: _score, ...route }) => route);
  }

  return [];
}

export function hasRecommendationSignals(input: RecommendationInputSnapshot): boolean {
  const coreSignals = [
    input.branch,
    input.corps,
    input.rank,
    input.specialty,
    ...input.responsibilityAreas,
    ...input.functionTypes,
    ...input.technicalSkills,
    ...input.softSkills,
  ];

  return coreSignals.filter(Boolean).length >= 4;
}

export function buildCareerRouteShortlist(
  input: RecommendationInputSnapshot,
): RecommendationRoute[] {
  return buildCandidateRoutes(input);
}
