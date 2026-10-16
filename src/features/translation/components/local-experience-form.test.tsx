import { act } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { domainIdSchema } from '../../../lib/contracts/shared.schema';
import { FUNCTION_TYPE_OPTIONS } from '../../wizard/config/wizard-catalogs';
import { structuredExperienceSchema } from '../schemas/structured-experience.schema';
import { LocalExperienceForm } from './local-experience-form';

let container: HTMLDivElement;
let root: Root;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  vi.unstubAllGlobals();
});

function setup() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<LocalExperienceForm />));
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

function review() {
  act(() => container.querySelector<HTMLButtonElement>('button[type="submit"]')!.click());
}

const REVIEW_MESSAGE = 'Vista previa lista. Esta experiencia todavía no se ha guardado';

function preview() {
  return container.querySelector<HTMLElement>('[aria-label="Vista previa de la experiencia"]')!;
}

function observeValidation() {
  const spy = vi.spyOn(structuredExperienceSchema, 'safeParse');
  const latestInput = () => spy.mock.calls.at(-1)![0];
  return { spy, latestInput };
}

describe('LocalExperienceForm', () => {
  it('exige actividad, asocia el error y cancela el submit sin navegar', () => {
    setup();
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
    expect(container.textContent).not.toContain(REVIEW_MESSAGE);
    change('activity', FUNCTION_TYPE_OPTIONS[0].value);
    expect(select('activity').getAttribute('aria-invalid')).toBe('false');
  });

  it('anuncia la revisión válida junto al botón, permite repetirla y no anuncia cada edición', () => {
    setup();
    expect(container.textContent).not.toContain(REVIEW_MESSAGE);
    change('activity', 'analysis');
    expect(container.textContent).not.toContain(REVIEW_MESSAGE);
    review();
    const status = container.querySelector('[role="status"]')!;
    expect(status?.textContent).toBe(REVIEW_MESSAGE);
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.previousElementSibling).toBe(container.querySelector('button[type="submit"]'));
    expect(container.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(preview().hasAttribute('aria-live')).toBe(false);
    const announcement = status.firstElementChild;
    review();
    expect(status.textContent).toBe(REVIEW_MESSAGE);
    expect(status.firstElementChild).not.toBe(announcement);
    expect(select('activity').value).toBe('analysis');
  });

  it.each([
    ['activity', 'execution', 'Ejecución'],
    ['durationRange', 'one_to_five_years', 'Entre 1 y 5 años'],
    ['frequency', 'by_periods', 'Por periodos o temporadas'],
    ['autonomy', 'autonomous', 'De forma autónoma'],
    ['participation', 'performed', 'La realizaba personalmente'],
    ['assignmentContext', 'temporary_assignment', 'La realicé por asignación temporal'],
  ])(
    'invalida la revisión al cambiar %s y permite revisar los datos actualizados',
    (name, value, label) => {
      setup();
      change('activity', 'analysis');
      act(() => container.querySelector('summary')!.click());
      review();
      expect(container.querySelector('[role="status"]')?.textContent).toBe(REVIEW_MESSAGE);
      if (name === 'participation') toggle(value);
      else change(name, value);
      expect(container.textContent).not.toContain(REVIEW_MESSAGE);
      expect(preview().textContent).toContain(label);
      review();
      expect(container.querySelector('[role="status"]')?.textContent).toBe(REVIEW_MESSAGE);
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
      expect(container.textContent).not.toContain(REVIEW_MESSAGE);
    },
  );

  it('retira el éxito al quitar la actividad y enfoca el selector al revisar de nuevo', () => {
    setup();
    change('activity', 'analysis');
    change('frequency', 'by_periods');
    review();
    expect(container.textContent).toContain(REVIEW_MESSAGE);
    change('activity', '');
    expect(container.textContent).not.toContain(REVIEW_MESSAGE);
    review();
    expect(container.textContent).not.toContain(REVIEW_MESSAGE);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'Selecciona una actividad',
    );
    expect(document.activeElement).toBe(select('activity'));
    expect(select('frequency').value).toBe('by_periods');
  });

  it('conserva el éxito al abrir y cerrar detalles sin editar datos', () => {
    setup();
    change('activity', 'analysis');
    review();
    const details = container.querySelector('details')!;
    for (const open of [true, false, true]) {
      act(() => details.querySelector('summary')!.click());
      expect(details.open).toBe(open);
      expect(container.querySelector('[role="status"]')?.textContent).toBe(REVIEW_MESSAGE);
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
    act(() => container.querySelector<HTMLButtonElement>('button[type="submit"]')!.click());
    expect(container.textContent).toContain(
      'Esta es una vista previa. Todavía no se ha guardado en tu perfil',
    );
    expect(container.textContent).toContain('se perderán al recargar o salir de esta página');
    expect(container.textContent).not.toContain('Guardar experiencia');
    expect(fetch).not.toHaveBeenCalled();
    expect(xhr).not.toHaveBeenCalled();
    for (const spy of [get, set, remove, clear]) expect(spy).not.toHaveBeenCalled();
    act(() => root.unmount());
    root = createRoot(container);
    act(() => root.render(<LocalExperienceForm />));
    expect(select('activity').value).toBe('');
    expect(select('frequency').value).toBe('');
    expect(preview().querySelector('dl')).toBeNull();
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
