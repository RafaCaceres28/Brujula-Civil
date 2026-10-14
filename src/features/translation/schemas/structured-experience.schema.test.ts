import { describe, expect, it } from 'vitest';
import { FUNCTION_TYPE_OPTIONS, TOOL_OPTIONS } from '../../wizard/config/wizard-catalogs';
import {
  structuredExperienceSchema,
  structuredExperiencesSchema,
} from './structured-experience.schema';

const EXPERIENCE = {
  id: 'experience-radio-01',
  activity: 'op_maintenance',
  equipment: 'radio_comms',
};

describe('structuredExperienceSchema', () => {
  it.each(['less_than_1_year', 'one_to_five_years', 'more_than_5_years', 'not_sure'])(
    'preserves durationRange %s without requiring frequency',
    (durationRange) => {
      const input = { ...EXPERIENCE, durationRange };
      expect(structuredExperienceSchema.parse(input)).toStrictEqual(input);
    },
  );

  it.each([
    'daily_or_almost_daily',
    'several_times_per_week',
    'by_periods',
    'occasional',
    'not_sure',
  ])('preserves frequency %s without requiring durationRange', (frequency) => {
    const input = { ...EXPERIENCE, frequency };
    expect(structuredExperienceSchema.parse(input)).toStrictEqual(input);
  });

  it('leaves uninformed metadata absent without defaults', () => {
    const parsed = structuredExperienceSchema.parse(EXPERIENCE);
    expect(parsed).toStrictEqual(EXPERIENCE);
    expect(parsed).not.toHaveProperty('durationRange');
    expect(parsed).not.toHaveProperty('frequency');
  });

  it('preserves both explicit not_sure answers without requiring equipment', () => {
    const input = {
      id: EXPERIENCE.id,
      activity: EXPERIENCE.activity,
      durationRange: 'not_sure',
      frequency: 'not_sure',
      context: 'Taller de mantenimiento',
      result: 'Equipo operativo',
    };
    expect(structuredExperienceSchema.parse(input)).toStrictEqual(input);
  });

  it.each(['durationRange', 'frequency'])(
    'rejects invalid supplied %s rather than coercing or defaulting',
    (field) => {
      for (const value of ['unknown', '', '   ', null, 42, [], {}]) {
        const parsed = structuredExperienceSchema.safeParse({ ...EXPERIENCE, [field]: value });
        expect(parsed.success).toBe(false);
        if (!parsed.success) {
          expect(parsed.error.issues).toContainEqual(expect.objectContaining({ path: [field] }));
        }
      }
    },
  );

  it('keeps enriched records strict and validates all existing fields', () => {
    const input = { ...EXPERIENCE, durationRange: 'more_than_5_years', frequency: 'by_periods' };
    expect(structuredExperienceSchema.parse(input)).toStrictEqual(input);
    for (const invalid of [
      { years: 20 },
      { id: 'invalid/id' },
      { activity: 'unknown' },
      { equipment: null },
      { context: '' },
      { result: 'x'.repeat(501) },
    ]) {
      expect(structuredExperienceSchema.safeParse({ ...input, ...invalid }).success).toBe(false);
    }
  });

  it('accepts an experience without optional narratives and preserves its stable id', () => {
    expect(structuredExperienceSchema.parse(EXPERIENCE)).toStrictEqual(EXPERIENCE);
    expect(structuredExperienceSchema.parse(EXPERIENCE)).toStrictEqual(EXPERIENCE);
  });

  it('accepts every real activity and equipment code from the source catalogs', () => {
    expect(FUNCTION_TYPE_OPTIONS.some(({ value }) => value === 'op_maintenance')).toBe(true);
    expect(TOOL_OPTIONS.some(({ value }) => value === 'radio_comms')).toBe(true);
    expect(TOOL_OPTIONS.some(({ value }) => value === 'maintenance_tools')).toBe(true);
    for (const { value: activity } of FUNCTION_TYPE_OPTIONS) {
      expect(structuredExperienceSchema.parse({ ...EXPERIENCE, activity }).activity).toBe(activity);
    }
    for (const { value: equipment } of TOOL_OPTIONS) {
      expect(structuredExperienceSchema.parse({ ...EXPERIENCE, equipment }).equipment).toBe(
        equipment,
      );
    }
  });

  it('requires id and activity without generating an id', () => {
    for (const field of ['id', 'activity'] as const) {
      const input: Partial<typeof EXPERIENCE> = { ...EXPERIENCE };
      delete input[field];
      expect(structuredExperienceSchema.safeParse(input).success).toBe(false);
    }
  });

  it('accepts omitted equipment without adding a default or sentinel', () => {
    const input = { id: EXPERIENCE.id, activity: EXPERIENCE.activity };
    expect(structuredExperienceSchema.parse(input)).toStrictEqual(input);
    expect(structuredExperienceSchema.safeParse({ ...input, years: 20 }).success).toBe(false);
  });

  it('rejects null, sentinel and empty equipment when supplied', () => {
    for (const equipment of [null, 'none', 'unknown', '', '   ']) {
      expect(structuredExperienceSchema.safeParse({ ...EXPERIENCE, equipment }).success).toBe(
        false,
      );
    }
  });

  it.each(['', '   ', 'id with spaces', 'id/invalid', 'x'.repeat(129), 42, null])(
    'rejects invalid domain id %j',
    (id) => {
      expect(structuredExperienceSchema.safeParse({ ...EXPERIENCE, id }).success).toBe(false);
    },
  );

  it('rejects unknown codes, labels, approximate tokens and non-string catalog values', () => {
    for (const [field, values] of [
      ['activity', ['unknown', '', 'OP_MAINTENANCE', 'Mantenimiento y Puesta a Punto', 42, null]],
      ['equipment', ['unknown', '', 'RADIO_COMMS', 'Equipos de Radio y Transmisiones', [], null]],
    ] as const) {
      for (const value of values) {
        expect(
          structuredExperienceSchema.safeParse({ ...EXPERIENCE, [field]: value }).success,
        ).toBe(false);
      }
    }
  });

  it('trims id and optional narratives following the domain text convention', () => {
    expect(
      structuredExperienceSchema.parse({
        ...EXPERIENCE,
        id: ' experience-radio-01 ',
        context: ' Taller de mantenimiento ',
        result: ' Equipo operativo ',
      }),
    ).toStrictEqual({
      ...EXPERIENCE,
      context: 'Taller de mantenimiento',
      result: 'Equipo operativo',
    });
  });

  it('accepts either optional narrative independently and the maximum text length', () => {
    for (const field of ['context', 'result']) {
      expect(
        structuredExperienceSchema.parse({ ...EXPERIENCE, [field]: 'x'.repeat(500) }),
      ).toStrictEqual({ ...EXPERIENCE, [field]: 'x'.repeat(500) });
    }
  });

  it.each(['context', 'result'])('rejects invalid optional %s formats', (field) => {
    for (const value of ['', '   ', 'x'.repeat(501), 42, null, [], {}]) {
      expect(structuredExperienceSchema.safeParse({ ...EXPERIENCE, [field]: value }).success).toBe(
        false,
      );
    }
  });

  it('rejects unknown fields rather than silently accepting unsupported assertions', () => {
    expect(structuredExperienceSchema.safeParse({ ...EXPERIENCE, years: 20 }).success).toBe(false);
  });
});

describe('structuredExperiencesSchema', () => {
  it('preserves mixed old and enriched records with optional equipment', () => {
    const input = [
      EXPERIENCE,
      {
        id: 'experience-maintenance-02',
        activity: 'op_maintenance',
        durationRange: 'one_to_five_years',
        frequency: 'by_periods',
      },
      { ...EXPERIENCE, id: 'experience-radio-03', frequency: 'not_sure' },
    ];
    expect(structuredExperiencesSchema.parse(input)).toStrictEqual(input);
  });

  it('rejects duplicate trimmed ids across old and enriched records', () => {
    const parsed = structuredExperiencesSchema.safeParse([
      EXPERIENCE,
      {
        ...EXPERIENCE,
        id: ` ${EXPERIENCE.id} `,
        durationRange: 'less_than_1_year',
        frequency: 'occasional',
      },
    ]);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues).toContainEqual(
        expect.objectContaining({ code: 'custom', path: [1, 'id'] }),
      );
    }
  });

  it('accepts mixed records with and without equipment unchanged', () => {
    const input = [EXPERIENCE, { id: 'experience-maintenance-02', activity: 'op_maintenance' }];
    expect(structuredExperiencesSchema.parse(input)).toStrictEqual(input);
  });

  it('rejects duplicate ids when equipment is omitted', () => {
    const parsed = structuredExperiencesSchema.safeParse([
      EXPERIENCE,
      { id: ` ${EXPERIENCE.id} `, activity: EXPERIENCE.activity },
    ]);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues).toContainEqual(
        expect.objectContaining({ code: 'custom', path: [1, 'id'] }),
      );
    }
  });

  it('accepts empty collections and repeated activities with distinct stable ids', () => {
    expect(structuredExperiencesSchema.parse([])).toStrictEqual([]);
    const input = [EXPERIENCE, { ...EXPERIENCE, id: 'experience-radio-02' }];
    expect(structuredExperiencesSchema.parse(input)).toStrictEqual(input);
  });

  it('rejects duplicate ids even for different equipment and points to the repeated id', () => {
    const parsed = structuredExperiencesSchema.safeParse([
      EXPERIENCE,
      { ...EXPERIENCE, equipment: 'maintenance_tools' },
    ]);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues).toContainEqual(
        expect.objectContaining({ code: 'custom', path: [1, 'id'] }),
      );
    }
  });

  it('detects duplicate ids after trimming', () => {
    expect(
      structuredExperiencesSchema.safeParse([
        EXPERIENCE,
        { ...EXPERIENCE, id: ` ${EXPERIENCE.id} ` },
      ]).success,
    ).toBe(false);
  });

  it('validates each record and requires an array collection', () => {
    expect(
      structuredExperiencesSchema.safeParse([EXPERIENCE, { ...EXPERIENCE, activity: 'unknown' }])
        .success,
    ).toBe(false);
    expect(structuredExperiencesSchema.safeParse(EXPERIENCE).success).toBe(false);
  });
});
