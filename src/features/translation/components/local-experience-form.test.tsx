import { act } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { domainIdSchema } from '../../../lib/contracts/shared.schema';
import { FUNCTION_TYPE_OPTIONS } from '../../wizard/config/wizard-catalogs';
import { structuredExperienceSchema } from '../schemas/structured-experience.schema';
import type { StructuredExperience } from '../schemas/structured-experience.schema';
import { LocalExperienceForm } from './local-experience-form';

const mocks = vi.hoisted(() => ({ create: vi.fn(), edit: vi.fn() }));
vi.mock('@/features/profile/actions/save-experience-action', () => ({
  createExperienceAction: mocks.create,
  editExperienceAction: mocks.edit,
}));

let container: HTMLDivElement;
let root: Root;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

function setup(onSaved?: () => void) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<LocalExperienceForm onSaved={onSaved} />));
}

function select(name: string) {
  return container.querySelector<HTMLSelectElement>(`select[name="${name}"]`)!;
}

function change(name: string, value: string) {
  act(() => {
    select(name).value = value;
    select(name).dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function toggle(value: string) {
  act(() => container.querySelector<HTMLInputElement>(`input[value="${value}"]`)!.click());
}

function save() {
  act(() => container.querySelector<HTMLButtonElement>('button[type="submit"]')!.click());
}

const SAVED_MESSAGE = 'Experiencia guardada en tu perfil.';

function taskText(index: number, field: 'description' | 'target', value: string) {
  const input = container.querySelector<HTMLTextAreaElement>(
    `textarea[name="otherTasks.${index}.${field}"]`,
  )!;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(
      input,
      value,
    );
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function taskButton(label: string) {
  const button = Array.from(container.querySelectorAll('button')).find(
    (button) => button.textContent === label,
  )!;
  act(() => button.click());
}

function preview() {
  return container.querySelector<HTMLElement>('[aria-label="Vista previa de la experiencia"]')!;
}

function observeValidation() {
  const spy = vi.spyOn(structuredExperienceSchema, 'safeParse');
  const latestInput = () => spy.mock.calls.at(-1)![0];
  return { spy, latestInput };
}

describe('LocalExperienceForm', () => {
  it('adds multiple tasks, validates partial rows inline, previews raw text and saves only explicitly', async () => {
    setup(vi.fn());
    change('activity', 'analysis');
    taskButton('Añadir otra tarea');
    const warning = container.querySelector('[id$="-other-tasks-help"]')!;
    const input = container.querySelector('textarea')!;
    expect(warning.textContent).toContain('No incluyas información militar clasificada');
    expect(warning.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    taskText(0, 'description', '<b>Revisaba documentos</b>');
    expect(preview().textContent).toContain('<b>Revisaba documentos</b>');
    expect(preview().querySelector('b')).toBeNull();
    await act(async () => save());
    expect(mocks.create).not.toHaveBeenCalled();
    expect(container.querySelector('textarea[aria-invalid="true"]')).toBe(document.activeElement);
    expect(container.textContent).toContain('Completa ambos campos');
    taskText(0, 'target', 'Documentación administrativa');
    taskButton('Añadir otra tarea');
    taskText(1, 'description', 'Ayudaba a organizar');
    taskText(1, 'target', 'Equipo de trabajo');
    expect(mocks.create).not.toHaveBeenCalled();
    mocks.create.mockImplementation(async ({ experience }) => ({ ok: true, data: { experience } }));
    await act(async () => save());
    const saved = mocks.create.mock.calls[0][0].experience;
    expect(saved.otherTasks).toEqual([
      { description: '<b>Revisaba documentos</b>', target: 'Documentación administrativa' },
      { description: 'Ayudaba a organizar', target: 'Equipo de trabajo' },
    ]);
    taskButton('Eliminar tarea 1');
    expect(container.querySelector<HTMLTextAreaElement>('textarea')!.value).toBe(
      'Ayudaba a organizar',
    );
    taskText(0, 'target', 'Documentos');
    mocks.edit.mockImplementation(async ({ set }) => ({
      ok: true,
      data: { experience: { ...saved, ...set } },
    }));
    await act(async () => save());
    const edited = {
      ...saved,
      otherTasks: [{ description: 'Ayudaba a organizar', target: 'Documentos' }],
    };
    expect(mocks.edit).toHaveBeenLastCalledWith({
      id: saved.id,
      expectedExperience: saved,
      set: { otherTasks: edited.otherTasks },
      clear: [],
    });
    taskButton('Eliminar tarea 1');
    await act(async () => save());
    expect(mocks.edit).toHaveBeenLastCalledWith({
      id: saved.id,
      expectedExperience: edited,
      set: {},
      clear: ['otherTasks'],
    });
  });

  it.each(['instruction', 'op_maintenance'])(
    'reloads other tasks and keeps them independent of %s details and activity changes',
    async (activity) => {
      setup();
      const otherTasks = [{ description: 'Otra tarea guardada', target: 'Documentos' }];
      const initial = structuredExperienceSchema.parse({
        id: 'stored-other',
        activity,
        otherTasks,
        stageIds: ['stage-1'],
        context: 'Contexto',
        ...(activity === 'instruction'
          ? { instructionActivities: ['demonstrated'] }
          : { maintenanceTasks: [{ material: 'light_vehicles' }] }),
      });
      const dirty = vi.fn();
      act(() =>
        root.render(
          <LocalExperienceForm
            key={activity}
            initialExperience={initial}
            mode="edit"
            onSaved={vi.fn()}
            onDirtyChange={dirty}
          />,
        ),
      );
      expect(container.querySelector<HTMLTextAreaElement>('textarea')!.value).toBe(
        otherTasks[0].description,
      );
      taskText(0, 'description', 'Edición');
      expect(dirty).toHaveBeenLastCalledWith(true);
      taskText(0, 'description', otherTasks[0].description);
      expect(dirty).toHaveBeenLastCalledWith(false);
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
      change('activity', 'analysis');
      expect(preview().textContent).toContain(otherTasks[0].description);
      mocks.edit.mockResolvedValue({ ok: false, error: { code: 'CONFLICT' } });
      await act(async () => save());
      expect(mocks.edit).toHaveBeenCalledWith({
        id: initial.id,
        expectedExperience: initial,
        set: { activity: 'analysis' },
        clear: [activity === 'instruction' ? 'instructionActivities' : 'maintenanceTasks'],
      });
      confirm.mockRestore();
    },
  );

  it('captures all five instruction choices without generic defaults, previews, saves and clears explicitly', async () => {
    setup(vi.fn());
    expect(container.querySelector('[name="instructionActivities"]')).toBeNull();
    change('activity', 'technical_instruction');
    expect(container.querySelector('[name="instructionActivities"]')).toBeNull();
    change('activity', 'instruction');
    expect(container.textContent).toContain(
      'Sin estos detalles no se generan propuestas de instrucción',
    );
    expect(container.textContent).not.toContain('se utiliza la participación general declarada');
    const labels = [
      'Recibía instrucción o formación',
      'Participaba en ejercicios y prácticas',
      'Realizaba demostraciones para apoyar al instructor',
      'Explicaba procedimientos o contenidos a compañeros',
      'Preparaba y explicaba contenidos o prácticas',
    ];
    const choices = Array.from(
      container.querySelectorAll<HTMLInputElement>('[name="instructionActivities"]'),
    );
    expect(choices).toHaveLength(5);
    expect(choices.map((choice) => choice.labels![0].textContent?.trim())).toEqual(labels);
    expect(choices.every((choice) => !choice.checked)).toBe(true);
    toggle('received_training');
    expect(preview().textContent).toContain(labels[0]);
    expect(preview().textContent).toContain('No hay evidencia suficiente');
    choices.slice(1).forEach((choice) => toggle(choice.value));
    labels.forEach((label) => expect(preview().textContent).toContain(label));
    expect(preview().textContent).not.toContain('No hay evidencia suficiente');
    mocks.create.mockImplementation(async ({ experience }) => ({ ok: true, data: { experience } }));
    await act(async () => save());
    const saved = mocks.create.mock.calls[0][0].experience;
    expect(saved.instructionActivities).toEqual(choices.map((choice) => choice.value).sort());
    expect(saved).not.toHaveProperty('participation');
    mocks.edit.mockImplementation(async ({ set, clear }) => {
      const experience = { ...saved, ...set };
      clear.forEach((field: string) => delete experience[field]);
      return { ok: true, data: { experience } };
    });
    choices.forEach((choice) => toggle(choice.value));
    await act(async () => save());
    expect(mocks.edit).toHaveBeenCalledWith({
      id: saved.id,
      expectedExperience: saved,
      set: {},
      clear: ['instructionActivities'],
    });
  });

  it('reloads details, treats choices as a set, keeps focus and hidden baseline fields on edit', async () => {
    setup();
    const initial: StructuredExperience = {
      id: 'instruction-stored',
      activity: 'instruction',
      instructionActivities: ['received_training', 'demonstrated'],
      participation: ['instructed'],
      stageIds: ['stage-1'],
      equipment: 'radio_comms',
      context: 'Contexto',
      result: 'Resultado',
    };
    const dirty = vi.fn();
    act(() =>
      root.render(
        <LocalExperienceForm
          key="instruction"
          mode="edit"
          initialExperience={initial}
          onSaved={vi.fn()}
          onDirtyChange={dirty}
        />,
      ),
    );
    const checkbox = container.querySelector<HTMLInputElement>('input[value="demonstrated"]')!;
    expect(checkbox.checked).toBe(true);
    checkbox.focus();
    toggle('demonstrated');
    expect(document.activeElement).toBe(checkbox);
    toggle('demonstrated');
    expect(dirty).toHaveBeenLastCalledWith(false);
    change('frequency', 'occasional');
    mocks.edit.mockResolvedValue({
      ok: true,
      data: { experience: { ...initial, frequency: 'occasional' } },
    });
    await act(async () => save());
    expect(mocks.edit).toHaveBeenCalledWith({
      id: initial.id,
      expectedExperience: initial,
      set: { frequency: 'occasional' },
      clear: [],
    });
    expect(initial.instructionActivities).toEqual(['received_training', 'demonstrated']);
  });

  it('requires confirmation to clear instruction details on activity change, preserving general roles', async () => {
    setup(vi.fn());
    change('activity', 'instruction');
    toggle('received_training');
    toggle('instructed');
    mocks.create.mockImplementation(async ({ experience }) => ({ ok: true, data: { experience } }));
    await act(async () => save());
    const saved = mocks.create.mock.calls[0][0].experience;
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    change('activity', 'op_maintenance');
    expect(select('activity').value).toBe('instruction');
    expect(preview().textContent).toContain('Recibía instrucción o formación');
    confirm.mockReturnValue(true);
    change('activity', 'op_maintenance');
    expect(container.querySelector('[name="instructionActivities"]')).toBeNull();
    mocks.edit.mockResolvedValue({ ok: false, error: { code: 'CONFLICT' } });
    await act(async () => save());
    expect(mocks.edit).toHaveBeenCalledWith({
      id: saved.id,
      expectedExperience: saved,
      set: { activity: 'op_maintenance' },
      clear: ['instructionActivities'],
    });
    expect(preview().textContent).toContain('Enseñaba a otros a realizarla');
    confirm.mockRestore();
  });

  it('hydrates stored instruction choices with stable labels and no errors', async () => {
    const initial: StructuredExperience = {
      id: 'ssr-instruction',
      activity: 'instruction',
      instructionActivities: ['explained_to_peers'],
    };
    container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = renderToString(
      <LocalExperienceForm initialExperience={initial} mode="edit" />,
    );
    const errors = vi.fn();
    await act(async () => {
      root = hydrateRoot(
        container,
        <LocalExperienceForm initialExperience={initial} mode="edit" />,
        { onRecoverableError: errors },
      );
    });
    expect(errors).not.toHaveBeenCalled();
    expect(
      container.querySelector<HTMLInputElement>('input[value="explained_to_peers"]')!.checked,
    ).toBe(true);
    expect(preview().textContent).toContain('Explicaba procedimientos o contenidos a compañeros');
  });

  it('treats maintenance sets as unordered for dirtiness and omits untouched tasks from metadata edits', async () => {
    setup(vi.fn());
    const initial: StructuredExperience = {
      id: 'unchanged-tasks',
      activity: 'op_maintenance',
      maintenanceTasks: [
        { material: 'light_vehicles', operations: ['periodic_checks', 'levels_functioning'] },
        { material: 'communications_equipment', operations: ['batteries'] },
      ],
    };
    const dirty = vi.fn();
    act(() =>
      root.render(
        <LocalExperienceForm
          key="sets"
          mode="edit"
          initialExperience={initial}
          onSaved={vi.fn()}
          onDirtyChange={dirty}
        />,
      ),
    );
    toggle('light_vehicles:periodic_checks');
    expect(dirty).toHaveBeenLastCalledWith(true);
    toggle('light_vehicles:periodic_checks');
    expect(dirty).toHaveBeenLastCalledWith(false);
    const details = container.querySelector('details')!;
    act(() => details.querySelector('summary')!.click());
    act(() => details.querySelector('summary')!.click());
    expect(
      container.querySelector<HTMLInputElement>(
        'input[value="communications_equipment:batteries"]',
      )!.checked,
    ).toBe(true);
    change('frequency', 'occasional');
    mocks.edit.mockResolvedValue({
      ok: true,
      data: { experience: { ...initial, frequency: 'occasional' } },
    });
    await act(async () => save());
    expect(mocks.edit).toHaveBeenCalledWith({
      id: initial.id,
      expectedExperience: initial,
      set: { frequency: 'occasional' },
      clear: [],
    });
  });

  it('captures different tasks per material, preserves material without operations and explicitly clears the last material', async () => {
    setup(vi.fn());
    change('activity', 'op_maintenance');
    toggle('light_vehicles');
    toggle('communications_equipment');
    expect(container.querySelector('input[value="light_vehicles:coaxial_repair"]')).toBeNull();
    expect(
      container.querySelector('input[value="communications_equipment:levels_functioning"]'),
    ).toBeNull();
    toggle('light_vehicles:levels_functioning');
    toggle('communications_equipment:coaxial_repair');
    mocks.create.mockImplementation(async ({ experience }) => ({ ok: true, data: { experience } }));
    await act(async () => save());
    const saved = mocks.create.mock.calls[0][0].experience;
    expect(saved.maintenanceTasks).toEqual([
      { material: 'communications_equipment', operations: ['coaxial_repair'] },
      { material: 'light_vehicles', operations: ['levels_functioning'] },
    ]);
    expect(preview().textContent).toContain('Reparación de cableado coaxial');
    toggle('light_vehicles:levels_functioning');
    mocks.edit.mockImplementation(async ({ set, clear }) => {
      const experience = { ...saved, ...set };
      clear.forEach((field: string) => delete experience[field]);
      return { ok: true, data: { experience } };
    });
    await act(async () => save());
    expect(mocks.edit.mock.calls[0][0]).toMatchObject({
      expectedExperience: saved,
      set: {
        maintenanceTasks: [
          { material: 'communications_equipment', operations: ['coaxial_repair'] },
          { material: 'light_vehicles' },
        ],
      },
      clear: [],
    });
    toggle('light_vehicles');
    expect(
      container.querySelector<HTMLInputElement>(
        'input[value="communications_equipment:coaxial_repair"]',
      )!.checked,
    ).toBe(true);
    toggle('communications_equipment');
    await act(async () => save());
    expect(mocks.edit.mock.calls[1][0]).toMatchObject({ set: {}, clear: ['maintenanceTasks'] });
  });

  it('reloads full task details and requires confirmation before changing activity, without losing hidden baseline fields', async () => {
    setup(vi.fn());
    const initial: StructuredExperience = {
      id: 'stored-tasks',
      activity: 'op_maintenance',
      equipment: 'radio_comms',
      stageIds: ['stage-1'],
      context: 'Taller',
      result: 'Operativo',
      maintenanceTasks: [{ material: 'communications_equipment', operations: ['batteries'] }],
    };
    act(() =>
      root.render(
        <LocalExperienceForm
          key="reloaded"
          mode="edit"
          initialExperience={initial}
          onSaved={vi.fn()}
        />,
      ),
    );
    expect(
      container.querySelector<HTMLInputElement>(
        'input[value="communications_equipment:batteries"]',
      )!.checked,
    ).toBe(true);
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(
      true,
    );
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    change('activity', 'analysis');
    expect(select('activity').value).toBe('op_maintenance');
    expect(preview().textContent).toContain('Carga y comprobación de baterías');
    confirm.mockReturnValue(true);
    change('activity', 'analysis');
    mocks.edit.mockResolvedValue({ ok: false, error: { code: 'CONFLICT', message: 'Conflict' } });
    await act(async () => save());
    expect(mocks.edit).toHaveBeenCalledWith({
      id: initial.id,
      expectedExperience: initial,
      set: { activity: 'analysis' },
      clear: ['maintenanceTasks'],
    });
    expect(container.textContent).toContain('tu borrador se conserva');
    confirm.mockRestore();
  });

  it('exige actividad, asocia el error y cancela el submit sin navegar', () => {
    setup(vi.fn());
    expect(select('activity').value).toBe('');
    expect(select('activity').required).toBe(true);
    expect(preview().querySelector('dl')).toBeNull();
    const event = new Event('submit', { bubbles: true, cancelable: true });
    act(() => container.querySelector('form')!.dispatchEvent(event));
    expect(event.defaultPrevented).toBe(true);
    expect(select('activity').getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(select('activity'));
    const errorId = select('activity').getAttribute('aria-describedby')!;
    expect(document.getElementById(errorId)?.textContent).toContain('Selecciona una actividad');
    expect(document.getElementById(errorId)?.getAttribute('role')).toBe('alert');
    expect(document.getElementById(errorId)?.parentElement).toBe(select('activity').parentElement);
    expect(container.querySelectorAll('[role="alert"]')).toHaveLength(1);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain('Revisar experiencia');
    change('activity', FUNCTION_TYPE_OPTIONS[0].value);
    expect(select('activity').getAttribute('aria-invalid')).toBe('false');
  });

  it('solo anuncia guardado tras confirmación del servidor y lo retira al editar', async () => {
    const onSaved = vi.fn();
    setup(onSaved);
    change('activity', 'analysis');
    expect(mocks.create).not.toHaveBeenCalled();
    let resolve!: (value: unknown) => void;
    mocks.create.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    save();
    expect(container.textContent).not.toContain(SAVED_MESSAGE);
    expect(onSaved).not.toHaveBeenCalled();
    const experience = mocks.create.mock.calls[0][0].experience;
    await act(async () => resolve({ ok: true, data: { experience } }));
    expect(container.querySelector('[role="status"]')?.textContent).toBe(SAVED_MESSAGE);
    expect(onSaved).toHaveBeenCalledWith(experience);
    change('frequency', 'occasional');
    expect(container.textContent).not.toContain(SAVED_MESSAGE);
  });

  it('conserva la validación del schema opcional sin marcar la actividad válida como errónea', () => {
    setup(vi.fn());
    // Remount to supply an invalid boundary value, not a value selectable from the UI.
    act(() =>
      root.render(
        <LocalExperienceForm
          key="invalid-optional"
          initialExperience={
            {
              id: 'experience-one',
              activity: 'analysis',
              frequency: 'invalid',
            } as unknown as StructuredExperience
          }
          onSaved={vi.fn()}
        />,
      ),
    );
    save();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(select('activity').getAttribute('aria-invalid')).toBe('false');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Revisa los datos');
    change('frequency', '');
    expect(preview().textContent).toContain('Análisis');
  });

  it.each([
    ['activity', 'execution', 'Ejecución'],
    ['durationRange', 'one_to_five_years', 'Entre 1 y 5 años'],
    ['frequency', 'by_periods', 'Por periodos o temporadas'],
    ['autonomy', 'autonomous', 'De forma autónoma'],
    ['participation', 'performed', 'La realizaba personalmente'],
    ['assignmentContext', 'temporary_assignment', 'La realicé por asignación temporal'],
  ])(
    'actualiza la vista previa al cambiar %s sin revisión ni llamadas al servidor',
    (name, value, label) => {
      setup();
      change('activity', 'analysis');
      act(() => container.querySelector('summary')!.click());
      if (name === 'participation') toggle(value);
      else change(name, value);
      expect(preview().textContent).toContain(label);
      if (name === 'participation') {
        expect(container.querySelector<HTMLInputElement>(`input[value="${value}"]`)!.checked).toBe(
          true,
        );
        toggle(value);
      } else {
        expect(select(name).value).toBe(value);
        change(name, '');
      }
      expect(container.querySelector('[role="status"]')).toBeNull();
      expect(mocks.create).not.toHaveBeenCalled();
      expect(mocks.edit).not.toHaveBeenCalled();
    },
  );

  it('valida al guardar después de quitar la actividad y conserva los opcionales', () => {
    setup(vi.fn());
    change('activity', 'analysis');
    change('frequency', 'by_periods');
    change('activity', '');
    save();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'Selecciona una actividad',
    );
    expect(document.activeElement).toBe(select('activity'));
    expect(select('frequency').value).toBe('by_periods');
  });

  it('conserva la vista previa al abrir y cerrar detalles sin generar feedback redundante', () => {
    setup();
    change('activity', 'analysis');
    const details = container.querySelector('details')!;
    for (const open of [true, false, true]) {
      act(() => details.querySelector('summary')!.click());
      expect(details.open).toBe(open);
      expect(preview().textContent).toContain('Análisis');
      expect(container.querySelector('[role="status"]')).toBeNull();
    }
  });

  it('ofrece todas las actividades reales con etiquetas españolas y sin equipos ni texto libre', () => {
    setup();
    expect(
      Array.from(select('activity').options)
        .slice(1)
        .map((option) => option.value),
    ).toEqual(FUNCTION_TYPE_OPTIONS.map((option) => option.value));
    for (const option of FUNCTION_TYPE_OPTIONS) {
      change('activity', option.value);
      expect(preview().textContent).toContain(
        option.value === 'reporting' ? 'Elaboración de informes' : option.label,
      );
      expect(container.textContent).not.toContain(option.value);
    }
    expect(container.querySelector('[name="equipment"], [name="stageIds"], textarea')).toBeNull();
    expect(container.querySelector('input:not([type="checkbox"])')).toBeNull();
  });

  it('valida actividad sola omitiendo opcionales y mantiene el ID durante correcciones', () => {
    const { latestInput } = observeValidation();
    setup();
    change('activity', 'op_maintenance');
    const first = structuredExperienceSchema.parse(latestInput());
    expect(first).toEqual({ id: expect.any(String), activity: 'op_maintenance' });
    expect(domainIdSchema.safeParse(first.id).success).toBe(true);
    expect(preview().querySelectorAll('dt')).toHaveLength(1);
    change('durationRange', 'not_sure');
    change('activity', 'analysis');
    expect(structuredExperienceSchema.parse(latestInput())).toEqual({
      id: first.id,
      activity: 'analysis',
      durationRange: 'not_sure',
    });
    expect(preview().textContent).not.toContain('Mantenimiento y Puesta a Punto');
    expect(preview().textContent).toContain('Análisis');
    expect(preview().textContent).toContain('No lo recuerdo bien');
    change('activity', '');
    expect(preview().querySelector('dl')).toBeNull();
    change('activity', 'execution');
    expect(preview().textContent).toContain('No lo recuerdo bien');
  });

  it.each([
    [
      'durationRange',
      ['less_than_1_year', 'one_to_five_years', 'more_than_5_years', 'not_sure'],
      ['Menos de un año', 'Entre 1 y 5 años', 'Más de 5 años', 'No lo recuerdo bien'],
    ],
    [
      'frequency',
      ['daily_or_almost_daily', 'several_times_per_week', 'by_periods', 'occasional', 'not_sure'],
      [
        'Todos o casi todos los días',
        'Varias veces por semana',
        'Por periodos o temporadas',
        'Ocasionalmente',
        'No lo recuerdo bien',
      ],
    ],
    [
      'autonomy',
      ['supervised', 'partially_autonomous', 'autonomous', 'not_sure'],
      ['Bajo supervisión', 'Con cierta autonomía', 'De forma autónoma', 'No lo tengo claro'],
    ],
    [
      'assignmentContext',
      ['regular_duties', 'temporary_assignment', 'acting_replacement', 'not_sure'],
      [
        'Era parte de mis funciones habituales',
        'La realicé por asignación temporal',
        'Sustituía temporalmente a otra persona',
        'No lo recuerdo bien',
      ],
    ],
  ])(
    'recorre los enums de %s y permite omitir la respuesta sin perder otras',
    (name, values, labels) => {
      const { latestInput } = observeValidation();
      setup();
      change('activity', 'analysis');
      toggle('assisted');
      expect(Array.from(select(name).options).map((option) => option.textContent)).toEqual([
        'Sin responder',
        ...labels,
      ]);
      for (const [index, value] of values.entries()) {
        change(name, value);
        expect(structuredExperienceSchema.parse(latestInput())).toMatchObject({ [name]: value });
        expect(preview().textContent).toContain(labels[index]);
        expect(preview().textContent).not.toContain(value);
      }
      change(name, '');
      expect(structuredExperienceSchema.parse(latestInput())).not.toHaveProperty(name);
      expect(preview().textContent).toContain('Ayudaba a realizarla');
      expect(preview().textContent).toContain('Análisis');
      expect(preview().querySelectorAll('dt')).toHaveLength(2);
    },
  );

  it('permite participación múltiple sin duplicados y omite el array al desmarcar todo', () => {
    const { latestInput } = observeValidation();
    setup();
    change('activity', 'analysis');
    const values = ['assisted', 'performed', 'coordinated', 'instructed'];
    const labels = [
      'Ayudaba a realizarla',
      'La realizaba personalmente',
      'Coordinaba el trabajo de otras personas',
      'Enseñaba a otros a realizarla',
    ];
    values.forEach(toggle);
    expect(structuredExperienceSchema.parse(latestInput()).participation).toEqual(values);
    labels.forEach((label) => expect(preview().textContent).toContain(label));
    toggle('assisted');
    toggle('assisted');
    expect(structuredExperienceSchema.parse(latestInput()).participation).toHaveLength(4);
    values.forEach(toggle);
    expect(latestInput()).not.toHaveProperty('participation');
    expect(structuredExperienceSchema.safeParse(latestInput()).success).toBe(true);
    expect(preview().querySelectorAll('dt')).toHaveLength(1);
  });

  it('conserva detalles al cerrarlos y aclara los límites de coordinación, instrucción y sustitución', () => {
    setup();
    const details = container.querySelector('details')!;
    expect(details.querySelector('summary')?.textContent).toBe(
      'Añadir detalles de mi experiencia (opcional)',
    );
    expect(details.open).toBe(false);
    act(() => details.querySelector('summary')!.click());
    expect(details.open).toBe(true);
    change('activity', 'analysis');
    change('autonomy', 'autonomous');
    change('assignmentContext', 'acting_replacement');
    toggle('coordinated');
    act(() => details.querySelector('summary')!.click());
    expect(details.open).toBe(false);
    expect(preview().textContent).toContain('De forma autónoma');
    act(() => details.querySelector('summary')!.click());
    expect(select('autonomy').value).toBe('autonomous');
    expect(select('assignmentContext').value).toBe('acting_replacement');
    expect(container.querySelector<HTMLInputElement>('input[value="coordinated"]')!.checked).toBe(
      true,
    );
    expect(container.textContent).toContain('Coordinar no implica mando formal');
    expect(container.textContent).toContain('instruir no acredita una titulación');
    expect(container.textContent).toContain('empleo superior ni un nombramiento');
  });

  it('no usa red ni almacenamiento, informa de pérdida de datos y comienza vacío al remontar', () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const xhr = vi.spyOn(XMLHttpRequest.prototype, 'open');
    const get = vi.spyOn(Storage.prototype, 'getItem');
    const set = vi.spyOn(Storage.prototype, 'setItem');
    const remove = vi.spyOn(Storage.prototype, 'removeItem');
    const clear = vi.spyOn(Storage.prototype, 'clear');
    setup();
    change('activity', 'analysis');
    change('frequency', 'by_periods');
    toggle('performed');
    taskButton('Añadir otra tarea');
    taskText(0, 'description', 'Borrador privado');
    taskText(0, 'target', 'Documentos');
    expect(container.querySelector('button[type="submit"]')).toBeNull();
    expect(container.textContent).toContain(
      'Esta es una vista previa. Todavía no se ha guardado en tu perfil',
    );
    expect(container.textContent).toContain('se perderán al recargar o salir de esta página');
    expect(container.textContent).not.toContain('Guardar experiencia');
    expect(fetch).not.toHaveBeenCalled();
    expect(xhr).not.toHaveBeenCalled();
    for (const spy of [get, set, remove, clear]) expect(spy).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.edit).not.toHaveBeenCalled();
    act(() => root.unmount());
    root = createRoot(container);
    act(() => root.render(<LocalExperienceForm />));
    expect(select('activity').value).toBe('');
    expect(select('frequency').value).toBe('');
    expect(preview().querySelector('dl')).toBeNull();
    expect(container.querySelector('textarea')).toBeNull();
  });

  it('hidrata el HTML de servidor sin errores y conserva IDs y asociaciones de labels', async () => {
    const { spy } = observeValidation();
    container = document.createElement('div');
    container.innerHTML = renderToString(<LocalExperienceForm />);
    document.body.appendChild(container);
    const serverId = select('activity').id;
    const experienceId = (spy.mock.calls.at(-1)![0] as { id: string }).id;
    const onRecoverableError = vi.fn();
    await act(async () => {
      root = hydrateRoot(container, <LocalExperienceForm />, { onRecoverableError });
    });
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(select('activity').id).toBe(serverId);
    for (const control of container.querySelectorAll('select, input')) {
      expect(container.querySelector(`label[for="${control.id}"]`)).not.toBeNull();
    }
    change('activity', 'analysis');
    expect(spy.mock.calls.at(-1)![0]).toEqual({ id: experienceId, activity: 'analysis' });
  });
});
