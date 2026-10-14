import { describe, expect, it } from 'vitest';
import { careerHistorySchema, type CareerHistory } from './career-history.schema';

const STAGES = [
  { id: 'stage-technical', focus: 'technical' },
  { id: 'stage-instruction', focus: 'instruction' },
];
const EXPERIENCE = { id: 'experience-01', activity: 'op_maintenance' };

describe('careerHistorySchema', () => {
  it('preserves mixed assignment contexts and existing metadata through the aggregate', () => {
    const input = {
      stages: STAGES,
      experiences: [
        EXPERIENCE,
        ...['regular_duties', 'temporary_assignment', 'acting_replacement', 'not_sure'].map(
          (assignmentContext, index) => ({
            ...EXPERIENCE,
            id: `experience-context-${index}`,
            assignmentContext,
            stageIds: ['stage-instruction', 'stage-technical'],
            context: 'Taller',
            result: 'Equipo operativo',
            autonomy: 'supervised',
            participation: ['assisted', 'coordinated'],
            durationRange: 'not_sure',
            frequency: 'occasional',
          }),
        ),
      ],
    };
    const parsed: CareerHistory = careerHistorySchema.parse(input);
    expect(parsed).toStrictEqual(input);
    expect(parsed.experiences[0]).not.toHaveProperty('assignmentContext');
  });

  it('retains reference, uniqueness, id and strict guards with assignment context', () => {
    const experience = {
      ...EXPERIENCE,
      assignmentContext: 'acting_replacement',
      stageIds: ['stage-technical'],
    };
    expect(careerHistorySchema.parse({ stages: STAGES, experiences: [experience] })).toStrictEqual({
      stages: STAGES,
      experiences: [experience],
    });
    for (const [input, path] of [
      [{ experiences: [experience] }, ['experiences', 0, 'stageIds', 0]],
      [
        { stages: STAGES, experiences: [{ ...experience, stageIds: ['missing'] }] },
        ['experiences', 0, 'stageIds', 0],
      ],
      [
        { stages: STAGES, experiences: [experience, { ...experience, id: ' experience-01 ' }] },
        ['experiences', 1, 'id'],
      ],
      [
        {
          stages: [STAGES[0], { ...STAGES[0], id: ' stage-technical ' }],
          experiences: [experience],
        },
        ['stages', 1, 'id'],
      ],
      [
        {
          stages: STAGES,
          experiences: [{ ...experience, stageIds: ['stage-technical', ' stage-technical '] }],
        },
        ['experiences', 0, 'stageIds'],
      ],
      [
        { stages: STAGES, experiences: [{ ...experience, id: 'invalid/id' }] },
        ['experiences', 0, 'id'],
      ],
      [{ stages: STAGES, experiences: [{ ...experience, rank: 'commander' }] }, ['experiences', 0]],
      [
        { stages: STAGES, experiences: [{ ...experience, assignmentContext: null }] },
        ['experiences', 0, 'assignmentContext'],
      ],
      [{ stages: STAGES, experiences: [experience], rank: 'commander' }, []],
    ] as const) {
      const parsed = careerHistorySchema.safeParse(input);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues).toContainEqual(expect.objectContaining({ path }));
      }
    }
  });

  it('preserves omitted stages and legacy experiences without adding defaults', () => {
    for (const input of [
      { experiences: [] },
      { experiences: [EXPERIENCE] },
      { stages: [], experiences: [] },
      { stages: [], experiences: [EXPERIENCE] },
      { stages: STAGES, experiences: [] },
    ]) {
      expect(careerHistorySchema.parse(input)).toStrictEqual(input);
    }
  });

  it('supports multiple stages per experience and the same stage across experiences', () => {
    const input = {
      stages: STAGES,
      experiences: [
        { ...EXPERIENCE, stageIds: ['stage-technical', 'stage-instruction'] },
        { ...EXPERIENCE, id: 'experience-02', stageIds: ['stage-technical'] },
        { ...EXPERIENCE, id: 'experience-03' },
      ],
    };
    const history: CareerHistory = careerHistorySchema.parse(input);
    expect(history).toStrictEqual(input);
  });

  it('resolves references after id normalization on both sides', () => {
    expect(
      careerHistorySchema.parse({
        stages: [{ id: ' stage-technical ', focus: 'technical' }],
        experiences: [{ ...EXPERIENCE, stageIds: [' stage-technical '] }],
      }),
    ).toStrictEqual({
      stages: [STAGES[0]],
      experiences: [{ ...EXPERIENCE, stageIds: ['stage-technical'] }],
    });
  });

  it('reports every orphan at its experience and reference index including absent stages', () => {
    for (const stages of [undefined, [], STAGES]) {
      const parsed = careerHistorySchema.safeParse({
        ...(stages === undefined ? {} : { stages }),
        experiences: [
          EXPERIENCE,
          { ...EXPERIENCE, id: 'experience-02', stageIds: ['missing-01', 'missing-02'] },
        ],
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues.map(({ path }) => path)).toStrictEqual([
          ['experiences', 1, 'stageIds', 0],
          ['experiences', 1, 'stageIds', 1],
        ]);
      }
    }
  });

  it('reuses collection uniqueness validation for stages, experiences and references', () => {
    for (const [input, path] of [
      [
        { stages: [STAGES[0], { ...STAGES[0], id: ' stage-technical ' }], experiences: [] },
        ['stages', 1, 'id'],
      ],
      [
        { experiences: [EXPERIENCE, { ...EXPERIENCE, id: ' experience-01 ' }] },
        ['experiences', 1, 'id'],
      ],
      [
        {
          stages: STAGES,
          experiences: [{ ...EXPERIENCE, stageIds: ['stage-technical', ' stage-technical '] }],
        },
        ['experiences', 0, 'stageIds'],
      ],
    ] as const) {
      const parsed = careerHistorySchema.safeParse(input);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues).toContainEqual(expect.objectContaining({ path }));
      }
    }
  });

  it('preserves id-based associations under stage, experience and reference reordering', () => {
    const input = {
      stages: STAGES,
      experiences: [
        { ...EXPERIENCE, stageIds: ['stage-technical', 'stage-instruction'] },
        { ...EXPERIENCE, id: 'experience-02', stageIds: ['stage-technical'] },
      ],
    };
    const reordered = {
      stages: [...input.stages].reverse(),
      experiences: [...input.experiences].reverse().map((experience) => ({
        ...experience,
        stageIds: [...experience.stageIds].reverse(),
      })),
    };
    expect(careerHistorySchema.parse(input)).toStrictEqual(input);
    expect(careerHistorySchema.parse(reordered)).toStrictEqual(reordered);
  });

  it('requires experiences, keeps the aggregate strict and validates nested contracts', () => {
    for (const input of [
      {},
      { stages: STAGES },
      { experiences: null },
      { stages: null, experiences: [] },
      { experiences: [], militar: { rank: 'sergeant' } },
      { experiences: [{ ...EXPERIENCE, activity: 'technical' }] },
      { experiences: [{ ...EXPERIENCE, stageIds: [] }] },
      { stages: [{ ...STAGES[0], unitName: 'signals' }], experiences: [] },
    ]) {
      expect(careerHistorySchema.safeParse(input).success).toBe(false);
    }
  });
});
