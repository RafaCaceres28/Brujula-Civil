import { describe, expect, it } from 'vitest';
import { createFormData } from '../../../../test/factories/form-data';
import {
  getResumenStepDefaults,
  parseCompetenciasFormData,
  parseExperienciaFormData,
  parseMilitarFormData,
  parseObjetivosFormData,
} from './wizard-form.mapper';

describe('wizard-form.mapper', () => {
  it('parses militar payload using canonical keys and option labels', () => {
    const formData = createFormData({
      branch: 'army',
      corps: 'signals',
      rankCode: 'captain',
      specialtyCode: 'communications',
      serviceYears: '9',
      destinationContext: 'hq_staff',
      leadershipLevel: 'section_lead',
      teamSize: '6_15',
      unitName: 'Batallon Alfa',
      notes: 'Turnos multinacionales',
    });

    const parsed = parseMilitarFormData(formData);

    expect(parsed.rank).toEqual({ code: 'captain', label: 'Capitán' });
    expect(parsed.specialty).toEqual({
      code: 'communications',
      label: 'Comunicaciones / Sistemas',
    });
    expect(parsed.serviceYears).toBe(9);
    expect(parsed.destinationContext).toBe('hq_staff');
  });

  it('parses experiencia payload with deterministic optional handling', () => {
    const formData = createFormData({
      responsibilityAreas: ['operations', 'planning'],
      missionTypes: ['intl_stability'],
      functionTypes: ['coordination'],
      tools: ['erp'],
      leadershipScopes: ['team_supervision'],
      achievements: ['Reduci tiempos 30%'],
      additionalContext: '',
    });

    const parsed = parseExperienciaFormData(formData);

    expect(parsed).toMatchObject({
      responsibilityAreas: ['operations', 'planning'],
      missionTypes: ['intl_stability'],
      functionTypes: ['coordination'],
      tools: ['erp'],
      leadershipScopes: ['team_supervision'],
      achievements: ['Reduci tiempos 30%'],
      additionalContext: null,
    });
  });

  it('normalizes legacy labels to canonical catalog ids and drops unknown structured values', () => {
    const formData = createFormData({
      responsibilityAreas: [
        'Operaciones y Ejecucion',
        'Planificacion y Turnos',
        'valor inventado',
        'operations',
      ],
      missionTypes: ['Mision Internacional: Seguridad y Estabilidad', 'tipo invalido'],
      functionTypes: ['Coordinacion', 'coordination'],
      tools: ['Software de Gestion (ERP/SIPERDEF)', 'herramienta libre'],
      leadershipScopes: ['Supervision de pequenos equipos (Escuadra / Equipo)', 'scope libre'],
      achievements: ['Lidere relevo operativo sin incidencias'],
      additionalContext: 'Contexto legado',
    });

    const parsed = parseExperienciaFormData(formData);

    expect(parsed.responsibilityAreas).toEqual(['operations', 'planning']);
    expect(parsed.missionTypes).toEqual(['intl_stability']);
    expect(parsed.functionTypes).toEqual(['coordination']);
    expect(parsed.tools).toEqual(['erp']);
    expect(parsed.leadershipScopes).toEqual(['team_supervision']);
  });

  it('parses competencias language lines as name-level objects', () => {
    const formData = createFormData({
      technicalSkills: ['operations_management'],
      softSkills: ['leadership'],
      certifications: ['quality_iso'],
      languages: ['english:advanced', 'french'],
      drivingLicenses: ['c'],
      officeTools: ['excel'],
      extraTraining: 'Curso de liderazgo',
    });

    const parsed = parseCompetenciasFormData(formData);

    expect(parsed.languages).toEqual([
      { name: 'english', level: 'advanced' },
      { name: 'french', level: 'intermediate' },
    ]);
    expect(parsed.drivingLicenses).toEqual(['c']);
  });

  it('parses language catalog labels into canonical ids', () => {
    const formData = createFormData({
      technicalSkills: ['operations_management'],
      softSkills: ['leadership'],
      certifications: ['quality_iso'],
      drivingLicenses: ['c'],
      officeTools: ['excel'],
      languages: ['Ingles:Avanzado', 'Frances:Intermedio', 'Idioma libre:nivel libre'],
    });

    const parsed = parseCompetenciasFormData(formData);

    expect(parsed.languages).toEqual([
      { name: 'english', level: 'advanced' },
      { name: 'french', level: 'intermediate' },
    ]);
  });

  it('parses objetivos target roles into canonical slug-label shape', () => {
    const formData = createFormData({
      targetRoles: ['operations-coordinator'],
      targetSectors: ['logistics'],
      preferredLocations: ['madrid'],
      workModel: 'hybrid',
      seniority: 'manager',
      preferencesNotes: 'Preferencia por gestion de equipos',
    });

    const parsed = parseObjetivosFormData(formData);

    expect(parsed.targetRoles).toEqual([
      { slug: 'operations-coordinator', label: 'Coordinador de Operaciones y Logística' },
    ]);
    expect(parsed.seniority).toBe('manager');
    expect(parsed.workModel).toBe('hybrid');
  });

  it('preserves narrative fields while filtering free text from structured fields', () => {
    const militar = parseMilitarFormData(
      createFormData({
        branch: 'valor libre',
        corps: 'signals',
        rankCode: 'captain',
        specialtyCode: 'especialidad inventada',
        destinationContext: 'hq_staff',
        leadershipLevel: 'sin catalogo',
        teamSize: '6_15',
        serviceYears: '11',
        unitName: '  Unidad Legacy  ',
        notes: '  Nota narrativa  ',
      }),
    );

    const experiencia = parseExperienciaFormData(
      createFormData({
        responsibilityAreas: ['operations', 'area libre'],
        missionTypes: ['tipo libre'],
        functionTypes: ['coordination'],
        tools: ['herramienta libre'],
        leadershipScopes: ['team_supervision', 'scope libre'],
        achievements: ['Logro narrativo'],
        additionalContext: 'Contexto narrativo',
      }),
    );

    const objetivos = parseObjetivosFormData(
      createFormData({
        targetRoles: ['operations-coordinator', 'rol libre'],
        targetSectors: ['logistics', 'sector libre'],
        preferredLocations: ['madrid', 'ubicacion libre'],
        workModel: 'hybrid',
        seniority: 'seniority libre',
        preferencesNotes: 'Preferencias narrativas',
      }),
    );

    expect(militar.branch).toBeNull();
    expect(militar.specialty.code).toBeNull();
    expect(militar.leadershipLevel).toBeNull();
    expect(militar.corps).toBe('signals');
    expect(militar.rank.code).toBe('captain');
    expect(militar.destinationContext).toBe('hq_staff');
    expect(militar.teamSize).toBe('6_15');
    expect(militar.unitName).toBe('Unidad Legacy');
    expect(militar.notes).toBe('Nota narrativa');

    expect(experiencia.responsibilityAreas).toEqual(['operations']);
    expect(experiencia.missionTypes).toEqual([]);
    expect(experiencia.functionTypes).toEqual(['coordination']);
    expect(experiencia.tools).toEqual([]);
    expect(experiencia.leadershipScopes).toEqual(['team_supervision']);
    expect(experiencia.achievements).toEqual(['Logro narrativo']);
    expect(experiencia.additionalContext).toBe('Contexto narrativo');

    expect(objetivos.targetRoles).toEqual([
      { slug: 'operations-coordinator', label: 'Coordinador de Operaciones y Logística' },
    ]);
    expect(objetivos.targetSectors).toEqual(['logistics']);
    expect(objetivos.preferredLocations).toEqual(['madrid']);
    expect(objetivos.workModel).toBe('hybrid');
    expect(objetivos.seniority).toBeNull();
    expect(objetivos.preferencesNotes).toBe('Preferencias narrativas');
  });

  it('keeps resumen defaults deterministic', () => {
    expect(getResumenStepDefaults({})).toEqual({ confirmed: false });
    expect(getResumenStepDefaults({ confirmed: true })).toEqual({ confirmed: true });
  });
});
