import { describe, expect, it } from 'vitest';
import { onboardingDraftStateSchema } from '../../wizard/schemas/wizard-state.schema';
import { buildRecommendationInput } from './build-recommendation-input';

describe('buildRecommendationInput', () => {
  it('keeps downstream-compatible normalized signals from guided draft', () => {
    const draft = onboardingDraftStateSchema.parse({
      militar: {
        branch: 'Ejército de Tierra',
        corps: 'Ingenieros y Zapadores',
        rank: { code: 'captain', label: 'Capitán' },
        specialty: { code: 'communications', label: 'Comunicaciones / Sistemas' },
        destinationContext: 'hq_staff',
        leadershipLevel: 'section_lead',
        teamSize: '6_15',
      },
      experiencia: {
        responsibilityAreas: ['operations', 'operations'],
        missionTypes: ['intl_stability'],
        functionTypes: ['coordination'],
        tools: ['erp'],
      },
      competencias: {
        technicalSkills: ['operations_management'],
        softSkills: ['leadership'],
        certifications: ['quality_iso'],
        drivingLicenses: ['c'],
        languages: [{ name: 'english', level: 'advanced' }],
        officeTools: ['excel'],
      },
      objetivos: {
        targetRoles: ['Gestor de Proyectos y Operaciones', 'Gestor de Proyectos y Operaciones'],
        targetSectors: ['logistics'],
        workModel: 'hybrid',
        seniority: 'manager',
      },
    });

    const snapshot = buildRecommendationInput({
      userId: 'user-1',
      overview: {
        draft,
        employabilityFlow: {
          profileSnapshotId: 'profile-snapshot-user-1',
        },
      },
    });

    expect(snapshot.snapshotId).toBe('wizard-profile-snapshot-user-1');
    expect(snapshot.branch).toBe('army');
    expect(snapshot.corps).toBe('engineers');
    expect(snapshot.leadership).toBe(true);
    expect(snapshot.teamSize).toBe(15);
    expect(snapshot.responsibilityAreas).toEqual(['operations']);
    expect(snapshot.languages).toEqual(['english']);
    expect(snapshot.targetRoleHints).toEqual(['project-manager']);
    expect(snapshot.targetSectorHints).toEqual(['logistics']);
    expect(snapshot.workModelHint).toBe('hybrid');
    expect(snapshot.seniorityHint).toBe('manager');
  });

  it('returns safe defaults when optional guided fields are not present', () => {
    const snapshot = buildRecommendationInput({
      userId: 'user-2',
      overview: {
        draft: onboardingDraftStateSchema.parse({}),
      },
      locale: 'es-ES',
    });

    expect(snapshot.snapshotId).toBe('wizard-snapshot-user-2');
    expect(snapshot.teamSize).toBeUndefined();
    expect(snapshot.branch).toBeUndefined();
    expect(snapshot.responsibilityAreas).toEqual([]);
    expect(snapshot.targetRoleHints).toEqual([]);
  });
});
