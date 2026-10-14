import { describe, expect, it } from 'vitest';
import { careerStageSchema, careerStagesSchema } from './career-stage.schema';

const STAGE = { id: 'stage:technical_01', focus: 'technical' };

describe('careerStageSchema', () => {
  it('accepts exactly the six career focuses independently of activity codes', () => {
    for (const focus of [
      'operational',
      'technical',
      'logistics',
      'administration',
      'instruction',
      'other',
    ]) {
      const input = { ...STAGE, focus };
      expect(careerStageSchema.parse(input)).toStrictEqual(input);
    }
    for (const focus of ['op_maintenance', 'radio_comms', 'TECHNICAL', '', null, 42]) {
      expect(careerStageSchema.safeParse({ ...STAGE, focus }).success).toBe(false);
    }
  });

  it('uses normalized domain ids with their existing format and length limits', () => {
    expect(careerStageSchema.parse({ ...STAGE, id: ` ${STAGE.id} ` })).toStrictEqual(STAGE);
    expect(careerStageSchema.parse({ ...STAGE, id: 'x'.repeat(128) }).id).toHaveLength(128);
    for (const id of ['', '   ', 'id with spaces', 'id/invalid', 'x'.repeat(129), null, 42]) {
      expect(careerStageSchema.safeParse({ ...STAGE, id }).success).toBe(false);
    }
  });

  it('requires both fields and rejects dates, units, military identity and activities', () => {
    for (const input of [{ id: STAGE.id }, { focus: STAGE.focus }, {}, null]) {
      expect(careerStageSchema.safeParse(input).success).toBe(false);
    }
    for (const extra of [
      { startDate: '2000-01-01' },
      { endDate: '2001-01-01' },
      { unitName: 'signals' },
      { rank: 'sergeant' },
      { branch: 'army' },
      { activity: 'op_maintenance' },
      { equipment: 'radio_comms' },
    ]) {
      expect(careerStageSchema.safeParse({ ...STAGE, ...extra }).success).toBe(false);
    }
  });
});

describe('careerStagesSchema', () => {
  it('accepts zero or multiple stages including repeated focuses with distinct ids', () => {
    expect(careerStagesSchema.parse([])).toStrictEqual([]);
    const stages = [STAGE, { ...STAGE, id: 'stage-02' }, { id: 'stage-03', focus: 'other' }];
    expect(careerStagesSchema.parse(stages)).toStrictEqual(stages);
  });

  it('rejects duplicate normalized ids at the repeated stage id', () => {
    const parsed = careerStagesSchema.safeParse([
      STAGE,
      { id: ` ${STAGE.id} `, focus: 'operational' },
    ]);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues).toContainEqual(
        expect.objectContaining({ code: 'custom', path: [1, 'id'] }),
      );
    }
  });

  it('requires an array and validates each stage', () => {
    for (const input of [null, STAGE, [STAGE, { id: 'stage-02', focus: 'op_maintenance' }]]) {
      expect(careerStagesSchema.safeParse(input).success).toBe(false);
    }
  });
});
