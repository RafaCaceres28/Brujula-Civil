import { describe, expect, it } from 'vitest';
import { FUNCTION_TYPE_OPTIONS, TOOL_OPTIONS } from '../../wizard/config/wizard-catalogs';
import type { StructuredExperience } from '../schemas/structured-experience.schema';
import { structuredExperiencesSchema } from '../schemas/structured-experience.schema';
import {
  mapMilitaryToCivilianCompetencies,
  type MilitaryToCivilianInput,
} from './military-to-civilian.mapper';

const RADIO_USAGE = {
  id: 'radio-equipment-usage',
  label: 'Uso de equipos de radiocomunicaciones',
  basis: 'direct_declaration',
  requiresReview: true,
  evidence: [{ field: 'experiencia.tools', value: 'radio_comms' }],
};

const RADIO_MAINTENANCE = {
  id: 'radio-equipment-maintenance',
  label: 'Mantenimiento de equipos de radiocomunicaciones',
  basis: 'inference',
  requiresReview: true,
  evidence: [
    { field: 'experiencia.tools', value: 'radio_comms' },
    { field: 'experiencia.functionTypes', value: 'op_maintenance' },
  ],
};

describe('mapMilitaryToCivilianCompetencies', () => {
  it('returns no candidates for an empty input', () => {
    expect(mapMilitaryToCivilianCompetencies({})).toStrictEqual([]);
  });

  it('returns no candidates for empty experience', () => {
    expect(
      mapMilitaryToCivilianCompetencies({ experiencia: { tools: [], functionTypes: [] } }),
    ).toStrictEqual([]);
  });

  it('does not infer competencies from ET, rank, corps or communications specialty', () => {
    expect(
      mapMilitaryToCivilianCompetencies({
        militar: {
          branch: 'army',
          corps: 'signals',
          rank: { code: 'sergeant', label: 'Sargento' },
          specialty: { code: 'communications', label: 'Comunicaciones / Sistemas' },
          serviceYears: 15,
        },
      }),
    ).toStrictEqual([]);
  });

  it('maps declared radio usage with the original field and value', () => {
    expect(
      mapMilitaryToCivilianCompetencies({ experiencia: { tools: ['radio_comms'] } }),
    ).toStrictEqual([RADIO_USAGE]);
  });

  it('requires both fields and review for inferred radio maintenance', () => {
    expect(
      mapMilitaryToCivilianCompetencies({
        experiencia: { tools: ['radio_comms'], functionTypes: ['op_maintenance'] },
      }),
    ).toStrictEqual([RADIO_USAGE, RADIO_MAINTENANCE]);
  });

  it('does not map maintenance without radio', () => {
    expect(
      mapMilitaryToCivilianCompetencies({
        experiencia: { tools: ['maintenance_tools'], functionTypes: ['op_maintenance'] },
      }),
    ).toStrictEqual([]);
  });

  it('does not treat career preferences as experience', () => {
    expect(
      mapMilitaryToCivilianCompetencies({
        objetivos: {
          targetRoles: [
            {
              slug: 'tecnico-mantenimiento-electromecanico',
              label: 'Técnico de Mantenimiento Electromecánico',
            },
          ],
          targetSectors: ['technology', 'industry'],
          workModel: 'remote',
          seniority: 'senior',
          preferencesNotes: 'radio_comms op_maintenance',
        },
      }),
    ).toStrictEqual([]);
  });

  it('traces every evidence item to an actual input selection', () => {
    const input = {
      experiencia: {
        tools: ['office_suite', 'radio_comms'],
        functionTypes: ['equipment_operation', 'op_maintenance'],
      },
    };
    const output = mapMilitaryToCivilianCompetencies(input);

    expect(output).toHaveLength(2);
    for (const candidate of output) {
      expect(candidate.evidence.length).toBeGreaterThan(0);
      for (const evidence of candidate.evidence) {
        const field = evidence.field === 'experiencia.tools' ? 'tools' : 'functionTypes';
        expect(input.experiencia[field]).toContain(evidence.value);
      }
    }
  });

  it('is deterministic across repeated calls', () => {
    const input = {
      experiencia: { tools: ['radio_comms'], functionTypes: ['op_maintenance'] },
    };

    expect(mapMilitaryToCivilianCompetencies(input)).toStrictEqual([
      RADIO_USAGE,
      RADIO_MAINTENANCE,
    ]);
    expect(mapMilitaryToCivilianCompetencies(input)).toStrictEqual(
      mapMilitaryToCivilianCompetencies(input),
    );
  });

  it('does not duplicate candidates or evidence for repeated and overlapping signals', () => {
    const output = mapMilitaryToCivilianCompetencies({
      experiencia: {
        tools: ['radio_comms', 'maintenance_tools', 'radio_comms'],
        functionTypes: ['op_maintenance', 'equipment_operation', 'op_maintenance'],
        responsibilityAreas: ['communications', 'maintenance'],
      },
      competencias: { technicalSkills: ['industrial_maintenance', 'systems_usage'] },
    });

    expect(output).toStrictEqual([RADIO_USAGE, RADIO_MAINTENANCE]);
    expect(new Set(output.map((candidate) => candidate.id)).size).toBe(output.length);
  });

  it('does not mutate frozen input objects or arrays', () => {
    const input = {
      experiencia: { tools: ['radio_comms'], functionTypes: ['op_maintenance'] },
    };
    const original = structuredClone(input);
    Object.freeze(input.experiencia.tools);
    Object.freeze(input.experiencia.functionTypes);
    Object.freeze(input.experiencia);
    Object.freeze(input);

    expect(mapMilitaryToCivilianCompetencies(input)).toStrictEqual([
      RADIO_USAGE,
      RADIO_MAINTENANCE,
    ]);
    expect(input).toStrictEqual(original);
  });

  it('ignores free narratives even when they contain catalog codes', () => {
    expect(
      mapMilitaryToCivilianCompetencies({
        militar: { unitName: 'radio_comms', notes: 'op_maintenance' },
        experiencia: {
          achievements: ['radio_comms op_maintenance'],
          additionalContext: 'radio_comms op_maintenance',
        },
        competencias: { extraTraining: 'radio_comms op_maintenance' },
      }),
    ).toStrictEqual([]);
  });

  it('does not infer maintenance from specialty, responsibility or technical skill', () => {
    expect(
      mapMilitaryToCivilianCompetencies({
        militar: { specialty: { code: 'maintenance', label: 'Mantenimiento' } },
        experiencia: { tools: ['radio_comms'], responsibilityAreas: ['maintenance'] },
        competencias: { technicalSkills: ['industrial_maintenance'] },
      }),
    ).toStrictEqual([RADIO_USAGE]);
  });

  it('is invariant to unrelated structured and narrative context', () => {
    const input: MilitaryToCivilianInput = {
      experiencia: { tools: ['radio_comms'], functionTypes: ['op_maintenance'] },
    };

    expect(
      mapMilitaryToCivilianCompetencies({
        ...input,
        militar: { serviceYears: 30, leadershipLevel: 'unit_commander' },
        competencias: { certifications: ['mantenimiento_tecnico'], softSkills: ['leadership'] },
        objetivos: { targetSectors: ['technology'], preferencesNotes: 'Redes IP avanzadas' },
        experiencia: {
          ...input.experiencia,
          additionalContext: 'Configurar redes IP, reparar equipos y acreditar certificados',
        },
      }),
    ).toStrictEqual(mapMilitaryToCivilianCompetencies(input));
  });

  it('matches verified catalog codes rather than labels or approximate tokens', () => {
    expect(TOOL_OPTIONS.some((option) => option.value === 'radio_comms')).toBe(true);
    expect(FUNCTION_TYPE_OPTIONS.some((option) => option.value === 'op_maintenance')).toBe(true);
    expect(
      mapMilitaryToCivilianCompetencies({
        experiencia: {
          tools: ['Equipos de Radio y Transmisiones', 'RADIO_COMMS', ' radio_comms '],
          functionTypes: ['op_maintenance'],
        },
      }),
    ).toStrictEqual([]);
    expect(
      mapMilitaryToCivilianCompetencies({
        experiencia: { tools: ['radio_comms'], functionTypes: ['Mantenimiento y Puesta a Punto'] },
      }),
    ).toStrictEqual([RADIO_USAGE]);
  });
});

const EXPLICIT_RADIO_EXPERIENCE: StructuredExperience = {
  id: 'experience-radio-01',
  activity: 'op_maintenance',
  equipment: 'radio_comms',
};

const EXPLICIT_RADIO_MAINTENANCE = {
  id: 'radio-equipment-maintenance',
  label: 'Mantenimiento de equipos de radiocomunicaciones',
  basis: 'direct_declaration',
  requiresReview: true,
  evidence: [
    {
      experienceId: 'experience-radio-01',
      field: 'structuredExperiences.activity',
      value: 'op_maintenance',
    },
    {
      experienceId: 'experience-radio-01',
      field: 'structuredExperiences.equipment',
      value: 'radio_comms',
    },
  ],
};

describe('mapMilitaryToCivilianCompetencies with structured experiences', () => {
  it('keeps exact evidence and explicit priority across autonomy, participation and frozen reorderings', () => {
    const legacy = {
      experiencia: { tools: ['radio_comms'], functionTypes: ['op_maintenance'] },
      structuredExperiences: [
        { id: 'experience-00', activity: 'op_maintenance' },
        { ...EXPLICIT_RADIO_EXPERIENCE, id: 'experience-radio-20' },
        { ...EXPLICIT_RADIO_EXPERIENCE },
      ],
    };
    const expected = [RADIO_USAGE, EXPLICIT_RADIO_MAINTENANCE];
    expect(mapMilitaryToCivilianCompetencies(legacy)).toStrictEqual(expected);
    for (const autonomy of ['supervised', 'partially_autonomous', 'autonomous', 'not_sure']) {
      const input = {
        ...structuredClone(legacy),
        structuredExperiences: structuredExperiencesSchema.parse(
          legacy.structuredExperiences.map((record, index) => ({
            ...record,
            autonomy: index === 2 ? 'supervised' : autonomy,
            participation: index === 2 ? ['assisted'] : ['instructed', 'performed', 'coordinated'],
            durationRange: 'more_than_5_years',
            frequency: 'by_periods',
          })),
        ),
      };
      const original = structuredClone(input);
      input.structuredExperiences.forEach((record) => {
        Object.freeze(record.participation);
        Object.freeze(record);
      });
      Object.freeze(input.structuredExperiences);
      Object.freeze(input.experiencia.tools);
      Object.freeze(input.experiencia.functionTypes);
      Object.freeze(input.experiencia);
      Object.freeze(input);
      const reordered = {
        ...input,
        structuredExperiences: [...input.structuredExperiences].reverse().map((record) => ({
          ...record,
          participation: record.participation ? [...record.participation].reverse() : undefined,
        })),
      };
      const reorderedOriginal = structuredClone(reordered);
      reordered.structuredExperiences.forEach((record) => {
        Object.freeze(record.participation);
        Object.freeze(record);
      });
      Object.freeze(reordered.structuredExperiences);
      Object.freeze(reordered);
      for (const variant of [input, reordered, structuredClone(input), input]) {
        expect(mapMilitaryToCivilianCompetencies(variant)).toStrictEqual(expected);
        expect(mapMilitaryToCivilianCompetencies(variant)).toStrictEqual(
          mapMilitaryToCivilianCompetencies(legacy),
        );
      }
      expect(input).toStrictEqual(original);
      expect(reordered).toStrictEqual(reorderedOriginal);
    }
  });

  it('does not invent competencies or promote legacy evidence from coordination or instruction', () => {
    for (const records of [
      [{ id: 'experience-no-equipment', activity: 'op_maintenance' }],
      [{ ...EXPLICIT_RADIO_EXPERIENCE, equipment: 'maintenance_tools' }],
      [
        { id: 'experience-no-equipment', activity: 'op_maintenance' },
        { ...EXPLICIT_RADIO_EXPERIENCE, activity: 'equipment_operation' },
      ],
    ]) {
      const structuredExperiences = structuredExperiencesSchema.parse(
        records.map((record) => ({
          ...record,
          autonomy: 'autonomous',
          participation: ['coordinated', 'instructed'],
        })),
      );
      expect(mapMilitaryToCivilianCompetencies({ structuredExperiences: records })).toStrictEqual(
        [],
      );
      expect(mapMilitaryToCivilianCompetencies({ structuredExperiences })).toStrictEqual([]);
      for (const experiencia of [
        { tools: ['radio_comms'] },
        { tools: ['radio_comms'], functionTypes: ['op_maintenance'] },
      ]) {
        const previous = mapMilitaryToCivilianCompetencies({
          experiencia,
          structuredExperiences: records,
        });
        expect(previous).toStrictEqual(
          experiencia.functionTypes ? [RADIO_USAGE, RADIO_MAINTENANCE] : [RADIO_USAGE],
        );
        expect(
          mapMilitaryToCivilianCompetencies({ experiencia, structuredExperiences }),
        ).toStrictEqual(previous);
      }
    }
  });

  it('keeps exact output and explicit priority across metadata, stable ids and frozen reorderings', () => {
    const legacy = {
      experiencia: { tools: ['radio_comms'], functionTypes: ['op_maintenance'] },
      structuredExperiences: [
        { id: 'experience-00', activity: 'op_maintenance' },
        { ...EXPLICIT_RADIO_EXPERIENCE, id: 'experience-radio-20' },
        { ...EXPLICIT_RADIO_EXPERIENCE },
      ],
    };
    const expected = [RADIO_USAGE, EXPLICIT_RADIO_MAINTENANCE];
    expect(mapMilitaryToCivilianCompetencies(legacy)).toStrictEqual(expected);

    for (const metadata of [
      { durationRange: 'less_than_1_year', frequency: 'daily_or_almost_daily' },
      { durationRange: 'one_to_five_years', frequency: 'several_times_per_week' },
      { durationRange: 'more_than_5_years', frequency: 'by_periods' },
      { durationRange: 'not_sure', frequency: 'occasional' },
      { durationRange: 'not_sure', frequency: 'not_sure' },
    ]) {
      const input = {
        ...structuredClone(legacy),
        structuredExperiences: structuredExperiencesSchema.parse(
          legacy.structuredExperiences.map((record, index) => ({
            ...record,
            ...metadata,
            ...(index === 2 ? { durationRange: 'less_than_1_year', frequency: 'occasional' } : {}),
          })),
        ),
      };
      const original = structuredClone(input);
      input.structuredExperiences.forEach(Object.freeze);
      Object.freeze(input.structuredExperiences);
      Object.freeze(input.experiencia.tools);
      Object.freeze(input.experiencia.functionTypes);
      Object.freeze(input.experiencia);
      Object.freeze(input);

      for (const variant of [
        input,
        structuredClone(input),
        { ...input, structuredExperiences: [...input.structuredExperiences].reverse() },
        input,
      ]) {
        expect(mapMilitaryToCivilianCompetencies(variant)).toStrictEqual(expected);
        expect(mapMilitaryToCivilianCompetencies(variant)).toStrictEqual(
          mapMilitaryToCivilianCompetencies(legacy),
        );
      }
      expect(input).toStrictEqual(original);
    }
  });

  it('does not create competencies, join records or upgrade legacy evidence from metadata', () => {
    for (const records of [
      [{ id: 'experience-maintenance-01', activity: 'op_maintenance' }],
      [{ ...EXPLICIT_RADIO_EXPERIENCE, equipment: 'maintenance_tools' }],
      [
        { id: 'experience-maintenance-01', activity: 'op_maintenance' },
        { ...EXPLICIT_RADIO_EXPERIENCE, activity: 'equipment_operation' },
      ],
    ]) {
      const structuredExperiences = structuredExperiencesSchema.parse(
        records.map((record) => ({
          ...record,
          durationRange: 'more_than_5_years',
          frequency: 'daily_or_almost_daily',
        })),
      );
      expect(mapMilitaryToCivilianCompetencies({ structuredExperiences })).toStrictEqual([]);
      for (const experiencia of [
        { tools: ['radio_comms'] },
        { tools: ['radio_comms'], functionTypes: ['op_maintenance'] },
      ]) {
        const legacy = { experiencia, structuredExperiences: records };
        const expected = experiencia.functionTypes
          ? [RADIO_USAGE, RADIO_MAINTENANCE]
          : [RADIO_USAGE];
        expect(mapMilitaryToCivilianCompetencies(legacy)).toStrictEqual(expected);
        expect(
          mapMilitaryToCivilianCompetencies({ experiencia, structuredExperiences }),
        ).toStrictEqual(mapMilitaryToCivilianCompetencies(legacy));
      }
    }
  });

  it('returns no candidates for any catalog activity without equipment', () => {
    for (const { value: activity } of FUNCTION_TYPE_OPTIONS) {
      expect(
        mapMilitaryToCivilianCompetencies({
          structuredExperiences: [{ id: 'experience-without-equipment', activity }],
        }),
      ).toStrictEqual([]);
    }
  });

  it('does not join maintenance without equipment to radio in another record', () => {
    expect(
      mapMilitaryToCivilianCompetencies({
        structuredExperiences: [
          { id: 'experience-maintenance-01', activity: 'op_maintenance' },
          { ...EXPLICIT_RADIO_EXPERIENCE, activity: 'equipment_operation' },
        ],
      }),
    ).toStrictEqual([]);
  });

  it('does not fabricate explicit maintenance or upgrade legacy inference without equipment', () => {
    const structuredExperiences = [{ id: 'experience-maintenance-01', activity: 'op_maintenance' }];
    expect(
      mapMilitaryToCivilianCompetencies({
        experiencia: { tools: ['radio_comms'] },
        structuredExperiences,
      }),
    ).toStrictEqual([RADIO_USAGE]);
    expect(
      mapMilitaryToCivilianCompetencies({
        experiencia: { tools: ['radio_comms'], functionTypes: ['op_maintenance'] },
        structuredExperiences,
      }),
    ).toStrictEqual([RADIO_USAGE, RADIO_MAINTENANCE]);
  });

  it('preserves explicit priority and stable evidence with frozen mixed records in any order', () => {
    const input = {
      experiencia: { tools: ['radio_comms'], functionTypes: ['op_maintenance'] },
      structuredExperiences: [
        { id: 'experience-00', activity: 'op_maintenance' },
        { ...EXPLICIT_RADIO_EXPERIENCE, id: 'experience-radio-20' },
        { ...EXPLICIT_RADIO_EXPERIENCE },
      ],
    };
    const original = structuredClone(input);
    input.structuredExperiences.forEach(Object.freeze);
    Object.freeze(input.structuredExperiences);
    Object.freeze(input.experiencia.tools);
    Object.freeze(input.experiencia.functionTypes);
    Object.freeze(input.experiencia);
    Object.freeze(input);

    for (const variant of [
      input,
      structuredClone(input),
      { ...input, structuredExperiences: [...input.structuredExperiences].reverse() },
      input,
    ]) {
      expect(mapMilitaryToCivilianCompetencies(variant)).toStrictEqual([
        RADIO_USAGE,
        EXPLICIT_RADIO_MAINTENANCE,
      ]);
    }
    expect(input).toStrictEqual(original);
  });

  it('maps explicit radio maintenance with review and no automatic radio usage', () => {
    expect(
      mapMilitaryToCivilianCompetencies({ structuredExperiences: [EXPLICIT_RADIO_EXPERIENCE] }),
    ).toStrictEqual([EXPLICIT_RADIO_MAINTENANCE]);
  });

  it('ignores maintenance on a real non-radio equipment code', () => {
    expect(TOOL_OPTIONS.some(({ value }) => value === 'maintenance_tools')).toBe(true);
    expect(
      mapMilitaryToCivilianCompetencies({
        structuredExperiences: [{ ...EXPLICIT_RADIO_EXPERIENCE, equipment: 'maintenance_tools' }],
      }),
    ).toStrictEqual([]);
  });

  it('does not join activity and equipment from different structured records', () => {
    expect(
      mapMilitaryToCivilianCompetencies({
        structuredExperiences: [
          { ...EXPLICIT_RADIO_EXPERIENCE, equipment: 'maintenance_tools' },
          {
            ...EXPLICIT_RADIO_EXPERIENCE,
            id: 'experience-radio-02',
            activity: 'equipment_operation',
          },
        ],
      }),
    ).toStrictEqual([]);
  });

  it('distinguishes legacy inferred maintenance from explicit declared maintenance', () => {
    const legacy = mapMilitaryToCivilianCompetencies({
      experiencia: { tools: ['radio_comms'], functionTypes: ['op_maintenance'] },
    });
    const explicit = mapMilitaryToCivilianCompetencies({
      structuredExperiences: [EXPLICIT_RADIO_EXPERIENCE],
    });
    expect(legacy).toStrictEqual([RADIO_USAGE, RADIO_MAINTENANCE]);
    expect(explicit).toStrictEqual([EXPLICIT_RADIO_MAINTENANCE]);
  });

  it('prioritizes explicit maintenance over inference without duplicate candidates or mixed evidence', () => {
    expect(
      mapMilitaryToCivilianCompetencies({
        experiencia: { tools: ['radio_comms', 'radio_comms'], functionTypes: ['op_maintenance'] },
        structuredExperiences: [EXPLICIT_RADIO_EXPERIENCE],
      }),
    ).toStrictEqual([RADIO_USAGE, EXPLICIT_RADIO_MAINTENANCE]);
  });

  it('retains declared wizard usage alongside explicit maintenance without wizard maintenance', () => {
    expect(
      mapMilitaryToCivilianCompetencies({
        experiencia: { tools: ['radio_comms'] },
        structuredExperiences: [EXPLICIT_RADIO_EXPERIENCE],
      }),
    ).toStrictEqual([RADIO_USAGE, EXPLICIT_RADIO_MAINTENANCE]);
  });

  it('traces evidence to the exact stable record id and its actual activity and equipment', () => {
    const record = { ...EXPLICIT_RADIO_EXPERIENCE, id: 'maintenance:radio-42' };
    expect(mapMilitaryToCivilianCompetencies({ structuredExperiences: [record] })).toStrictEqual([
      {
        ...EXPLICIT_RADIO_MAINTENANCE,
        evidence: [
          {
            experienceId: record.id,
            field: 'structuredExperiences.activity',
            value: record.activity,
          },
          {
            experienceId: record.id,
            field: 'structuredExperiences.equipment',
            value: record.equipment,
          },
        ],
      },
    ]);
  });

  it('chooses the smallest stable id across multiple radio records regardless of array order', () => {
    const records = [
      { ...EXPLICIT_RADIO_EXPERIENCE, id: 'experience-radio-20' },
      { ...EXPLICIT_RADIO_EXPERIENCE, id: 'experience-other', equipment: 'maintenance_tools' },
      EXPLICIT_RADIO_EXPERIENCE,
      { ...EXPLICIT_RADIO_EXPERIENCE, id: 'experience-radio-10' },
    ];
    for (const structuredExperiences of [
      records,
      [...records].reverse(),
      [...records.slice(2), ...records.slice(0, 2)],
    ]) {
      expect(mapMilitaryToCivilianCompetencies({ structuredExperiences })).toStrictEqual([
        EXPLICIT_RADIO_MAINTENANCE,
      ]);
    }
  });

  it('ignores narrative radio signals and cannot upgrade legacy inference using non-radio maintenance', () => {
    const structuredExperiences = [
      {
        ...EXPLICIT_RADIO_EXPERIENCE,
        equipment: 'maintenance_tools',
        context: 'radio_comms op_maintenance',
        result: 'Mantenimiento de radio, liderazgo, certificados y 20 anos de experiencia',
      },
    ];
    expect(mapMilitaryToCivilianCompetencies({ structuredExperiences })).toStrictEqual([]);
    expect(
      mapMilitaryToCivilianCompetencies({
        experiencia: { tools: ['radio_comms'], functionTypes: ['op_maintenance'] },
        structuredExperiences,
      }),
    ).toStrictEqual([RADIO_USAGE, RADIO_MAINTENANCE]);
  });

  it('does not mutate frozen structured records, arrays or legacy selections', () => {
    const input = {
      experiencia: { tools: ['radio_comms'], functionTypes: ['op_maintenance'] },
      structuredExperiences: [
        { ...EXPLICIT_RADIO_EXPERIENCE, id: 'experience-radio-20' },
        { ...EXPLICIT_RADIO_EXPERIENCE },
      ],
    };
    const original = structuredClone(input);
    input.structuredExperiences.forEach(Object.freeze);
    Object.freeze(input.structuredExperiences);
    Object.freeze(input.experiencia.tools);
    Object.freeze(input.experiencia.functionTypes);
    Object.freeze(input.experiencia);
    Object.freeze(input);
    expect(mapMilitaryToCivilianCompetencies(input)).toStrictEqual([
      RADIO_USAGE,
      EXPLICIT_RADIO_MAINTENANCE,
    ]);
    expect(input).toStrictEqual(original);
  });

  it('produces identical results for equivalent cloned data and repeated calls', () => {
    const input = { structuredExperiences: [EXPLICIT_RADIO_EXPERIENCE] };
    const output = mapMilitaryToCivilianCompetencies(input);
    expect(output).toStrictEqual([EXPLICIT_RADIO_MAINTENANCE]);
    expect(mapMilitaryToCivilianCompetencies(structuredClone(input))).toStrictEqual(output);
    expect(mapMilitaryToCivilianCompetencies(input)).toStrictEqual(output);
  });

  it('preserves exact legacy output with absent or empty structured experiences', () => {
    const input = { experiencia: { tools: ['radio_comms'], functionTypes: ['op_maintenance'] } };
    expect(mapMilitaryToCivilianCompetencies(input)).toStrictEqual([
      RADIO_USAGE,
      RADIO_MAINTENANCE,
    ]);
    expect(
      mapMilitaryToCivilianCompetencies({ ...input, structuredExperiences: [] }),
    ).toStrictEqual([RADIO_USAGE, RADIO_MAINTENANCE]);
  });
});
