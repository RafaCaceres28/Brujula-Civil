import { describe, expect, it } from 'vitest';
import { employabilityFlowDraftSchema, onboardingDraftStateSchema } from './wizard-state.schema';

function buildRecommendationRoutes() {
  return [
    {
      routeId: 'route-operations-coordinator-logistics-mid',
      roleId: 'operations-coordinator',
      sectorId: 'logistics',
      seniorityId: 'mid',
      reasonSummary: 'Se recomienda por coincidencias de logistica y coordinacion.',
      matchedSignals: ['TARGET_ROLE_HINT'],
    },
    {
      routeId: 'route-project-manager-consulting-mid',
      roleId: 'project-manager',
      sectorId: 'consulting',
      seniorityId: 'mid',
      reasonSummary: 'Se recomienda por coincidencias de planificacion y liderazgo.',
      matchedSignals: ['TARGET_SECTOR_HINT'],
    },
    {
      routeId: 'route-team-lead-technology-mid',
      roleId: 'team-lead',
      sectorId: 'technology',
      seniorityId: 'mid',
      reasonSummary: 'Se recomienda por coincidencias de supervision y comunicacion.',
      matchedSignals: ['LEADERSHIP_MATCH'],
    },
  ];
}

describe('wizard-state.schema', () => {
  it('keeps compatibility for legacy onboarding draft values', () => {
    const parsed = onboardingDraftStateSchema.parse({
      militar: {
        branch: 'Ejército de Tierra',
        corps: 'signals',
        destinationContext: 'unknown-value',
      },
      experiencia: {
        responsibilityAreas: ['Operaciones y Ejecución', 'planning'],
        achievements: ['Lidere guardias rotativas'],
      },
    });

    expect(parsed.militar.branch).toBe('army');
    expect(parsed.militar.destinationContext).toBeNull();
    expect(parsed.experiencia.responsibilityAreas).toEqual(['operations', 'planning']);
    expect(parsed.experiencia.achievements).toEqual(['Lidere guardias rotativas']);
  });

  it('drops invalid structured values and preserves narrative fields', () => {
    const parsed = onboardingDraftStateSchema.parse({
      competencias: {
        technicalSkills: ['invalid-skill'],
        languages: [
          { name: 'english', level: 'advanced' },
          { name: 'invalid', level: 'advanced' },
        ],
        extraTraining: 'Curso interno',
      },
      objetivos: {
        targetRoles: ['project-manager', 'free role'],
        preferredLocations: ['madrid', 'unknown-city'],
        preferencesNotes: 'Flexibilidad geografica',
      },
    });

    expect(parsed.competencias.technicalSkills).toEqual([]);
    expect(parsed.competencias.languages).toEqual([{ name: 'english', level: 'advanced' }]);
    expect(parsed.competencias.extraTraining).toBe('Curso interno');
    expect(parsed.objetivos.targetRoles).toEqual([
      { slug: 'project-manager', label: 'Gestor de Proyectos y Operaciones' },
    ]);
    expect(parsed.objetivos.preferredLocations).toEqual(['madrid']);
    expect(parsed.objetivos.preferencesNotes).toBe('Flexibilidad geografica');
  });

  it('accepts employability flow with selectedRoute', () => {
    const parsed = employabilityFlowDraftSchema.parse({
      recommendations: {
        recommendationSetId: 'recset-snapshot-1-20260324010101',
        generatedAt: '2026-03-24T01:01:01.000Z',
        sourceSnapshotId: 'snapshot-1',
        routes: buildRecommendationRoutes(),
      },
      selectedRoute: {
        recommendationSetId: 'recset-snapshot-1-20260324010101',
        selectedRouteId: 'route-operations-coordinator-logistics-mid',
        selectedAt: '2026-03-24T01:02:03.000Z',
      },
    });

    expect(parsed.selectedRoute?.selectedRouteId).toBe(
      'route-operations-coordinator-logistics-mid',
    );
  });

  it('keeps backward compatibility with selectedRecommendation drafts', () => {
    const parsed = employabilityFlowDraftSchema.parse({
      recommendations: {
        recommendationSetId: 'recset-snapshot-1-20260324010101',
        generatedAt: '2026-03-24T01:01:01.000Z',
        sourceSnapshotId: 'snapshot-1',
        routes: buildRecommendationRoutes(),
      },
      selectedRecommendation: {
        recommendationSetId: 'recset-snapshot-1-20260324010101',
        selectedRouteId: 'route-project-manager-consulting-mid',
        selectedAt: '2026-03-24T01:05:03.000Z',
      },
    });

    expect(parsed.selectedRecommendation?.selectedRouteId).toBe(
      'route-project-manager-consulting-mid',
    );
  });

  it('normalizes mixed legacy and guided draft formats without breaking shape', () => {
    const parsed = onboardingDraftStateSchema.parse({
      militar: {
        branch: 'Cuerpos Comunes de las FAS',
        rank: { code: 'Capitán', label: 'Capitán' },
        specialty: { code: 'Comunicaciones / Sistemas', label: 'legacy' },
      },
      experiencia: {
        missionTypes: [
          'Misión Internacional: Seguridad y Estabilidad',
          'peace_support',
          'legacy-invalid',
        ],
      },
      objetivos: {
        targetRoles: [
          { slug: 'project-manager', label: 'Label manipulada' },
          'Coordinador de Operaciones y Logística',
          'legacy-invalid-role',
        ],
      },
    });

    expect(parsed.militar.branch).toBe('common_corps');
    expect(parsed.militar.rank).toEqual({ code: 'captain', label: 'Capitán' });
    expect(parsed.militar.specialty).toEqual({
      code: 'communications',
      label: 'Comunicaciones / Sistemas',
    });
    expect(parsed.experiencia.missionTypes).toEqual(['intl_stability']);
    expect(parsed.objetivos.targetRoles).toEqual([
      { slug: 'project-manager', label: 'Gestor de Proyectos y Operaciones' },
      { slug: 'operations-coordinator', label: 'Coordinador de Operaciones y Logística' },
    ]);
  });

  it('drops obsolete catalog selections after catalog updates while preserving useful narrative continuity', () => {
    const parsed = onboardingDraftStateSchema.parse({
      objetivos: {
        targetRoles: [{ slug: 'project-manager', label: 'Gestor de Proyectos y Operaciones' }],
        targetSectors: ['consulting'],
        preferredLocations: ['madrid'],
        workModel: 'remote_total_legacy',
        seniority: 'head_of_everything_legacy',
        preferencesNotes: 'Mantener foco en transicion ordenada',
      },
    });

    expect(parsed.objetivos.targetRoles).toEqual([
      { slug: 'project-manager', label: 'Gestor de Proyectos y Operaciones' },
    ]);
    expect(parsed.objetivos.workModel).toBeNull();
    expect(parsed.objetivos.seniority).toBeNull();
    expect(parsed.objetivos.preferencesNotes).toBe('Mantener foco en transicion ordenada');
  });
});
