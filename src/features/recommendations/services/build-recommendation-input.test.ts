import { describe, expect, it } from 'vitest';
import { onboardingDraftStateSchema } from '../../wizard/schemas/wizard-state.schema';
import { careerHistorySchema } from '../../translation/schemas/career-history.schema';
import { recommendationInputSnapshotSchema } from '../schemas/recommendation.schema';
import { buildRecommendationContext, buildRecommendationInput } from './build-recommendation-input';

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

  it.each([
    ['unit_commander', true],
    ['section_lead', true],
    ['area_department_lead', true],
    ['small_team_lead', true],
    ['technical_coordination', true],
    ['shift_lead', true],
    ['specialist_autonomy', false],
    ['individual_contributor', false],
    [null, false],
  ])(
    'maps declared leadership %s to %s, independently of rank, scope and team',
    (level, expected) => {
      const input = buildRecommendationInput({
        userId: 'user-1',
        overview: {
          draft: onboardingDraftStateSchema.parse({
            militar: {
              rank: { code: 'captain', label: 'Capitan' },
              leadershipLevel: level,
              teamSize: '16_40',
            },
            experiencia: { leadershipScopes: ['individual_autonomy', 'team_supervision'] },
          }),
        },
      });
      expect(input.leadership).toBe(expected);
      expect(input.teamSize).toBe(40);
      expect(input.softSkills).toEqual([]);
    },
  );
});

describe('buildRecommendationContext internal provenance', () => {
  const overview = {
    draft: onboardingDraftStateSchema.parse({
      experiencia: {
        functionTypes: ['instruction'],
        tools: ['erp'],
        responsibilityAreas: ['planning'],
        missionTypes: ['intl_stability'],
      },
      competencias: {
        technicalSkills: ['warehouse_inventory'],
        softSkills: ['communication'],
        certifications: ['quality_iso'],
        drivingLicenses: ['c'],
        languages: [{ name: 'english', level: 'advanced' }],
        officeTools: ['excel'],
      },
      objetivos: { targetSectors: ['logistics'] },
    }),
  };

  it('keeps grouped cloned frozen evidence separate from the unchanged shared snapshot', () => {
    const history = careerHistorySchema.parse({
      stages: [{ id: 'stage-1', focus: 'technical' }],
      experiences: [
        {
          id: 'exp-1',
          activity: 'analysis',
          equipment: 'radio_comms',
          stageIds: ['stage-1'],
          participation: ['performed'],
        },
        { id: 'exp-2', activity: 'analysis', equipment: 'erp' },
        { id: 'exp-3', activity: 'op_maintenance', equipment: 'maintenance_tools' },
      ],
    });
    const before = structuredClone({ history, overview });
    const { input, source } = buildRecommendationContext({
      userId: 'user-1',
      overview,
      careerHistory: history,
    });
    expect(input.functionTypes).toEqual(['analysis', 'op_maintenance']);
    expect(input.tools).toEqual(['erp', 'radio_comms', 'maintenance_tools']);
    expect(input).toMatchObject({
      responsibilityAreas: ['planning'],
      missionTypes: ['intl_stability'],
      technicalSkills: ['warehouse_inventory'],
      softSkills: ['communication'],
      certifications: ['quality_iso'],
      drivingLicenses: ['c'],
      languages: ['english'],
      officeTools: ['excel'],
      targetSectorHints: ['logistics'],
    });
    expect(source).toEqual({ kind: 'career_history', history, wizardTools: ['erp'] });
    if (source.kind !== 'career_history') throw new Error('Expected canonical evidence');
    expect(source.history).not.toBe(history);
    expect(source.history.experiences).toHaveLength(3);
    for (const value of [
      source,
      source.history,
      source.history.experiences,
      source.history.experiences[0],
      source.history.experiences[0].participation,
      source.history.experiences[0].stageIds,
      source.history.stages,
      source.history.stages?.[0],
      source.wizardTools,
    ]) {
      expect(Object.isFrozen(value)).toBe(true);
    }
    expect({ history, overview }).toEqual(before);
    expect(Object.isFrozen(history)).toBe(false);
    expect(recommendationInputSnapshotSchema.parse(input)).toEqual(input);
    expect(JSON.stringify(input)).not.toMatch(/exp-1|stage-1|career_history|wizardTools/);
  });

  it('labels absence as legacy but explicit empty never resurrects wizard tasks', () => {
    const legacy = buildRecommendationContext({ userId: 'user-1', overview });
    expect(legacy.source).toEqual({ kind: 'legacy_wizard' });
    expect(legacy.input).toEqual(buildRecommendationInput({ userId: 'user-1', overview }));
    const empty = buildRecommendationContext({
      userId: 'user-1',
      overview,
      careerHistory: { experiences: [] },
    });
    expect(empty.source.kind).toBe('career_history');
    expect(empty.input.functionTypes).toEqual([]);
    expect(empty.input.tools).toEqual(['erp']);
  });

  it.each([
    null,
    { experiences: [{ id: 'bad', activity: 'invalid' }] },
    {
      experiences: [
        { id: 'dup', activity: 'analysis' },
        { id: 'dup', activity: 'instruction' },
      ],
    },
  ])('rejects corrupt history without legacy fallback: %j', (careerHistory) => {
    expect(() =>
      buildRecommendationContext({
        userId: 'user-1',
        overview,
        careerHistory: careerHistory as never,
      }),
    ).toThrow();
  });
});
