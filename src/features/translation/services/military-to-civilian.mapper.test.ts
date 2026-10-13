import { describe, expect, it } from 'vitest';
import { FUNCTION_TYPE_OPTIONS, TOOL_OPTIONS } from '../../wizard/config/wizard-catalogs';
import type { StructuredExperience } from '../schemas/structured-experience.schema';
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
