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
