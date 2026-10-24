import { describe, expect, it } from 'vitest';
import { FUNCTION_TYPE_OPTIONS } from '../../wizard/config/wizard-catalogs';
import {
  structuredExperiencesSchema,
  type StructuredExperience,
} from '../schemas/structured-experience.schema';
import { buildExperienceProposals } from './experience-proposals.builder';

const experience: StructuredExperience = {
  id: 'exp-training',
  activity: 'technical_instruction',
  participation: ['instructed'],
};

describe('buildExperienceProposals', () => {
  it('groups only declared operations of each material, with distinct competency and exact trace', () => {
    const input = structuredExperiencesSchema.parse([
      {
        id: 'maintenance-1',
        activity: 'op_maintenance',
        maintenanceTasks: [
          { material: 'light_vehicles', operations: ['levels_functioning'] },
          {
            material: 'heavy_vehicles',
            operations: ['consumables_lubrication', 'vehicle_cleaning'],
          },
          {
            material: 'communications_equipment',
            operations: ['coaxial_repair', 'batteries', 'communications_cleaning'],
          },
          { material: 'armoured_vehicles' },
        ],
      },
    ]);
    const proposals = buildExperienceProposals(input);
    expect(proposals.map((value) => value.cvDescription.text)).toEqual([
      'Comprobación de niveles y elementos de funcionamiento en vehículos ligeros.',
      'Limpieza y conservación; reposición de consumibles y lubricación en vehículos pesados.',
      'Limpieza y mantenimiento básico; carga y comprobación de baterías en equipos de comunicaciones.',
      'Reparación de cableado coaxial en equipos de comunicaciones.',
    ]);
    expect(proposals.map((value) => value.civilianCompetencyCandidate.label)).toEqual([
      'Comprobaciones básicas de funcionamiento de vehículos ligeros',
      'Conservación básica de vehículos pesados',
      'Mantenimiento básico de equipos de comunicaciones',
      'Reparación de cableado coaxial',
    ]);
    for (const proposal of proposals) {
      expect(proposal.id).toMatch(/^maintenance:maintenance-1:/);
      expect(proposal.cvDescription).toMatchObject({
        basis: 'direct_declaration',
        requiresReview: true,
      });
      expect(proposal.civilianCompetencyCandidate).toMatchObject({
        basis: 'direct_declaration',
        requiresReview: true,
      });
      const { material, operations } = proposal.maintenanceSource!;
      expect(proposal.cvDescription.evidence).toEqual([
        {
          experienceId: 'maintenance-1',
          field: 'structuredExperiences.activity',
          value: 'op_maintenance',
        },
        {
          experienceId: 'maintenance-1',
          field: 'structuredExperiences.maintenanceTasks.material',
          value: material,
        },
        {
          experienceId: 'maintenance-1',
          field: 'structuredExperiences.maintenanceTasks.operations',
          material,
          value: operations,
        },
      ]);
      expect(proposal.civilianCompetencyCandidate.evidence).toEqual(
        proposal.cvDescription.evidence,
      );
      expect(proposal.civilianCompetencyCandidate.evidence).not.toBe(
        proposal.cvDescription.evidence,
      );
    }
  });

  it('does not infer repairs, defaults or tasks from equipment, metadata, siblings or material alone', () => {
    const input = structuredExperiencesSchema.parse([
      {
        id: 'empty',
        activity: 'op_maintenance',
        equipment: 'radio_comms',
        participation: ['performed'],
        autonomy: 'autonomous',
        context: 'Reparación de antenas',
      },
      {
        id: 'material',
        activity: 'op_maintenance',
        maintenanceTasks: [{ material: 'communications_equipment' }],
      },
      {
        id: 'checks',
        activity: 'op_maintenance',
        maintenanceTasks: [
          { material: 'armoured_vehicles', operations: ['periodic_checks', 'report_faults'] },
        ],
      },
    ]);
    const proposals = buildExperienceProposals(input);
    expect(proposals).toHaveLength(2);
    expect(proposals.every((proposal) => proposal.experienceId === 'checks')).toBe(true);
    expect(JSON.stringify(proposals)).not.toMatch(
      /Reparación|reparación|mecánic|certific|diagnóstic|avanzad/,
    );
    expect(proposals[1].civilianCompetencyCandidate.label).toBe(
      'Comunicación de incidencias técnicas',
    );
  });

  it('keeps antenna repair separate and qualifies non-personal participation without inventing performance', () => {
    const [proposal] = buildExperienceProposals(
      structuredExperiencesSchema.parse([
        {
          id: 'help',
          activity: 'op_maintenance',
          participation: ['assisted'],
          maintenanceTasks: [
            { material: 'communications_equipment', operations: ['antenna_repair'] },
          ],
        },
      ]),
    );
    expect(proposal.cvDescription.text).toBe(
      'Participación en tareas de reparación de antenas en equipos de comunicaciones.',
    );
    expect(proposal.civilianCompetencyCandidate.label).toBe(
      'Participación en reparación de antenas',
    );
    expect(proposal.cvDescription.evidence.at(-1)).toEqual({
      experienceId: 'help',
      field: 'structuredExperiences.participation',
      value: 'assisted',
    });
  });

  it('is deterministic for frozen maintenance sets, isolates output evidence and never mutates input', () => {
    const input = structuredExperiencesSchema.parse([
      {
        id: 'stable',
        activity: 'op_maintenance',
        maintenanceTasks: [
          {
            material: 'communications_equipment',
            operations: ['antenna_repair', 'coaxial_repair', 'batteries'],
          },
          { material: 'light_vehicles', operations: ['periodic_checks', 'levels_functioning'] },
        ],
      },
    ]);
    const before = JSON.stringify(input);
    input[0].maintenanceTasks!.forEach((entry) => {
      Object.freeze(entry.operations);
      Object.freeze(entry);
    });
    Object.freeze(input[0].maintenanceTasks);
    Object.freeze(input[0]);
    Object.freeze(input);
    const output = buildExperienceProposals(input);
    expect(
      buildExperienceProposals(
        input.map((value) => ({
          ...value,
          maintenanceTasks: [...value.maintenanceTasks!]
            .reverse()
            .map((entry) => ({ ...entry, operations: [...entry.operations!].reverse() })),
        })),
      ),
    ).toEqual(output);
    expect(JSON.stringify(input)).toBe(before);
    expect(new Set(output.map(({ id }) => id)).size).toBe(output.length);
    output[0].maintenanceSource!.operations.pop();
    expect(buildExperienceProposals(input)).not.toEqual(output);
    expect(output[0].cvDescription.evidence).toEqual(
      output[0].civilianCompetencyCandidate.evidence,
    );
  });

  it.each([
    ['assisted', 'Apoyo en actividades de formación técnica.'],
    ['performed', 'Realización de actividades de formación técnica.'],
    ['coordinated', 'Coordinación de actividades de formación técnica.'],
    ['instructed', 'Enseñanza en actividades de formación técnica.'],
  ] as const)('respeta el rol %s sin atribuir otros roles', (role, text) => {
    const [proposal] = buildExperienceProposals([{ ...experience, participation: [role] }]);
    expect(proposal.cvDescription.text).toBe(text);
    expect(proposal.civilianCompetencyCandidate.label).toBe(text.slice(0, -1));
    for (const output of [proposal.cvDescription, proposal.civilianCompetencyCandidate]) {
      expect(output).toMatchObject({
        experienceId: experience.id,
        basis: 'direct_declaration',
        requiresReview: true,
        evidence: [
          {
            experienceId: experience.id,
            field: 'structuredExperiences.activity',
            value: 'technical_instruction',
          },
          {
            experienceId: experience.id,
            field: 'structuredExperiences.participation',
            value: role,
          },
        ],
      });
    }
    expect(proposal.id).toBe(`training:exp-training:technical_instruction:${role}`);
    expect(proposal.cvDescription.id).toBe(`cv:${proposal.id}`);
    expect(proposal.civilianCompetencyCandidate.id).toBe(`competency:${proposal.id}`);
  });

  it('usa códigos reales y no convierte instrucción genérica en técnica', () => {
    for (const activity of ['instruction', 'technical_instruction']) {
      expect(FUNCTION_TYPE_OPTIONS.some((option) => option.value === activity)).toBe(true);
    }
    const [proposal] = buildExperienceProposals([{ ...experience, activity: 'instruction' }]);
    expect(proposal.cvDescription.text).toBe('Enseñanza en actividades de formación.');
    expect(JSON.stringify(proposal)).not.toMatch(/técnic|titulado|certificad|acreditad|mando|años/);
  });

  it('conserva todos los roles simultáneos sin combinarlos ni duplicarlos', () => {
    const proposals = buildExperienceProposals([
      { ...experience, participation: ['instructed', 'assisted', 'coordinated', 'performed'] },
    ]);
    expect(proposals.map((proposal) => proposal.cvDescription.text)).toEqual([
      'Apoyo en actividades de formación técnica.',
      'Realización de actividades de formación técnica.',
      'Coordinación de actividades de formación técnica.',
      'Enseñanza en actividades de formación técnica.',
    ]);
    expect(
      new Set(
        proposals.flatMap((proposal) => [
          proposal.id,
          proposal.cvDescription.id,
          proposal.civilianCompetencyCandidate.id,
        ]),
      ).size,
    ).toBe(12);
  });

  it('no propone sin historial ni participación declarada', () => {
    expect(buildExperienceProposals()).toEqual([]);
    expect(buildExperienceProposals([])).toEqual([]);
    expect(
      buildExperienceProposals([{ id: 'activity-only', activity: 'technical_instruction' }]),
    ).toEqual([]);
  });

  it('ignora cualquier otra actividad incluso con instrucción y herramientas declaradas', () => {
    const others = FUNCTION_TYPE_OPTIONS.filter(
      ({ value }) => !['instruction', 'technical_instruction'].includes(value),
    );
    expect(
      buildExperienceProposals(
        others.map(({ value }) => ({
          ...experience,
          id: value,
          activity: value,
          equipment: 'maintenance_tools',
        })),
      ),
    ).toEqual([]);
  });

  it('no cruza actividad de una experiencia con participación de otra', () => {
    expect(
      buildExperienceProposals([
        { id: 'training', activity: 'technical_instruction' },
        { id: 'other', activity: 'analysis', participation: ['instructed'] },
      ]),
    ).toEqual([]);
  });

  it('usa exclusivamente campos activadores y no narrativas ni metadatos como evidencia', () => {
    const enriched: StructuredExperience = {
      ...experience,
      equipment: 'radio_comms',
      context: 'Docente titulado con mando',
      result: 'Certificación de 20 años',
      durationRange: 'more_than_5_years',
      frequency: 'daily_or_almost_daily',
      autonomy: 'autonomous',
      assignmentContext: 'acting_replacement',
    };
    expect(buildExperienceProposals([enriched])).toEqual(buildExperienceProposals([experience]));
    expect(buildExperienceProposals([{ ...enriched, activity: 'analysis' }])).toEqual([]);
  });

  it('mantiene IDs y orden con entradas congeladas y reordenadas sin mutar', () => {
    const input = structuredExperiencesSchema.parse([
      { ...experience, id: 'z', participation: ['instructed', 'assisted'] },
      {
        ...experience,
        id: 'a',
        activity: 'instruction',
        participation: ['performed', 'coordinated'],
      },
    ]);
    for (const record of input) {
      Object.freeze(record.participation);
      Object.freeze(record);
    }
    Object.freeze(input);
    const before = JSON.stringify(input);
    const output = buildExperienceProposals(input);
    expect(
      buildExperienceProposals(
        [...input]
          .reverse()
          .map((record) => ({ ...record, participation: [...record.participation!].reverse() })),
      ),
    ).toEqual(output);
    expect(JSON.stringify(input)).toBe(before);
    expect(new Set(output.map(({ id }) => id)).size).toBe(4);
    for (const proposal of output) {
      const source = input.find(({ id }) => id === proposal.experienceId)!;
      expect(proposal.cvDescription.evidence[0].value).toBe(source.activity);
      expect(source.participation).toContain(proposal.cvDescription.evidence[1].value);
    }
    output[0].cvDescription.evidence[0].value = 'technical_instruction';
    expect(buildExperienceProposals(input)[0].cvDescription.evidence[0].value).toBe('instruction');
    expect(output[0].civilianCompetencyCandidate.evidence[0].value).toBe('instruction');
  });
});
