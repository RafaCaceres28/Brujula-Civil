import { act } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfessionalExperienceEditor } from './professional-experience-editor';
import type { StructuredExperience } from '../schemas/structured-experience.schema';

const mocks = vi.hoisted(() => ({ create: vi.fn(), edit: vi.fn(), read: vi.fn() }));
vi.mock('@/features/profile/actions/save-experience-action', () => ({
  createExperienceAction: mocks.create,
  editExperienceAction: mocks.edit,
}));
vi.mock('@/features/profile/actions/read-experiences-action', () => ({
  readExperiencesAction: mocks.read,
}));

let container: HTMLDivElement;
let root: Root;
const saved: StructuredExperience = {
  id: 'experience-one',
  activity: 'analysis',
  frequency: 'by_periods',
  participation: ['performed'],
  context: 'Contexto original',
  result: 'Resultado original',
  stageIds: ['stage-one'],
  equipment: 'radio_comms',
};
beforeEach(() => vi.resetAllMocks());
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  vi.restoreAllMocks();
});
function setup(experiences: StructuredExperience[] = [], initialError?: string) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root.render(
      <ProfessionalExperienceEditor initialExperiences={experiences} initialError={initialError} />,
    ),
  );
}
function button(label: string) {
  return Array.from(container.querySelectorAll('button')).find(
    (b) => (b.getAttribute('aria-label') ?? b.textContent) === label,
  )!;
}
async function click(label: string) {
  await act(async () => button(label).click());
}
function change(name: string, value: string) {
  act(() => {
    const input = container.querySelector<HTMLSelectElement>(`[name="${name}"]`)!;
    input.value = value;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
function failure(code: string) {
  return { ok: false, error: { code, message: 'Error controlado' } };
}

describe('ProfessionalExperienceEditor', () => {
  it('distingue vacío válido y lectura fallida; reintenta sin habilitar creación antes de leer', async () => {
    setup([], 'No se pudo cargar el historial');
    expect(container.querySelector('form')).toBeNull();
    expect(button('Añadir experiencia')).toBeUndefined();
    mocks.read.mockResolvedValue({ ok: true, data: { experiences: [] } });
    await click('Reintentar lectura');
    expect(container.textContent).toContain('Todavía no tienes experiencias guardadas');
    expect(button('Consultar versión guardada')).toBeUndefined();
    await click('Añadir experiencia');
    expect(container.querySelector<HTMLSelectElement>('[name="activity"]')?.value).toBe('');
  });

  it('lista varias guardadas con etiquetas y edita sin mostrar códigos', async () => {
    setup([saved, { id: 'experience-two', activity: 'execution' }]);
    expect(container.textContent).toContain('Análisis');
    expect(container.textContent).toContain('Ejecución');
    expect(container.textContent).not.toContain('analysis');
    await click('Editar experiencia: Análisis');
    for (const item of container.querySelectorAll('[aria-label="Experiencias guardadas"] li')) {
      const edit = item.querySelector('button')!;
      expect(edit.textContent).toBe('Editar');
      expect(edit.getAttribute('aria-label')).toBe(
        `Editar experiencia: ${item.querySelector('span')!.textContent}`,
      );
      expect(edit.classList.contains('shrink-0')).toBe(true);
      expect(item.querySelector('span')!.classList.contains('min-w-0')).toBe(true);
    }
    expect(container.textContent).toContain('Editar experiencia guardada');
    expect(container.querySelector<HTMLSelectElement>('[name="frequency"]')?.value).toBe(
      'by_periods',
    );
  });

  it('valida antes de guardar y conserva ID al reintentar almacenamiento sin revisión', async () => {
    setup();
    await click('Añadir experiencia');
    await click('Guardar experiencia');
    expect(mocks.create).not.toHaveBeenCalled();
    change('activity', 'analysis');
    expect(button('Revisar experiencia')).toBeUndefined();
    expect(mocks.create).not.toHaveBeenCalled();
    mocks.create.mockResolvedValueOnce(failure('EXTERNAL_DEPENDENCY_ERROR'));
    await click('Guardar experiencia');
    const experience = mocks.create.mock.calls[0][0].experience;
    expect(experience.id).toMatch(/^experience-[a-f0-9-]+$/);
    expect(container.textContent).toContain('No se pudo guardar');
    mocks.create.mockResolvedValueOnce({ ok: true, data: { experience } });
    await click('Guardar experiencia');
    expect(mocks.create.mock.calls[1][0].experience).toEqual(experience);
    expect(container.textContent).toContain('Experiencia guardada en tu perfil');
    expect(button('Guardar cambios').disabled).toBe(true);
    expect(button('Editar experiencia: Análisis')).toBeDefined();
    expect(button('Consultar versión guardada')).toBeUndefined();
  });

  it('edita solo diferencias, clear al omitir participación y preserva baseline invisible completo', async () => {
    setup([saved]);
    await click('Editar experiencia: Análisis');
    change('activity', 'execution');
    change('frequency', '');
    act(() => container.querySelector<HTMLInputElement>('[value="performed"]')!.click());
    const updated: StructuredExperience = { ...saved, activity: 'execution' };
    delete updated.frequency;
    delete updated.participation;
    mocks.edit.mockResolvedValue({
      ok: true,
      data: {
        experience: updated,
      },
    });
    await click('Guardar cambios');
    expect(mocks.edit).toHaveBeenCalledWith({
      id: saved.id,
      expectedExperience: saved,
      set: { activity: 'execution' },
      clear: ['frequency', 'participation'],
    });
    expect(button('Editar experiencia: Ejecución operativa')).toBeDefined();
    expect(
      container.querySelector(
        '[name="equipment"], [name="context"], [name="result"], [name="stageIds"]',
      ),
    ).toBeNull();
  });

  it('no considera dirty el orden de participación ni envía una edición sin diferencias', async () => {
    setup([{ ...saved, participation: ['performed', 'assisted'] }]);
    await click('Editar experiencia: Análisis');
    expect(button('Guardar cambios').disabled).toBe(true);
    act(() => container.querySelector<HTMLInputElement>('[value="performed"]')!.click());
    expect(button('Guardar cambios').disabled).toBe(false);
    act(() => container.querySelector<HTMLInputElement>('[value="performed"]')!.click());
    expect(button('Guardar cambios').disabled).toBe(true);
    await click('Guardar cambios');
    expect(mocks.edit).not.toHaveBeenCalled();
    const confirm = vi.spyOn(window, 'confirm');
    await click('Añadir experiencia');
    expect(confirm).not.toHaveBeenCalled();
  });

  it('submit por teclado guarda mediante el mismo botón y conserva labels asociados', async () => {
    setup();
    await click('Añadir experiencia');
    change('activity', 'analysis');
    const select = container.querySelector<HTMLSelectElement>('[name="activity"]')!;
    expect(container.querySelector(`label[for="${select.id}"]`)?.textContent).toContain(
      'Actividad (obligatoria)',
    );
    select.focus();
    expect(document.activeElement).toBe(select);
    const event = new Event('submit', { bubbles: true, cancelable: true });
    mocks.create.mockResolvedValue(failure('EXTERNAL_DEPENDENCY_ERROR'));
    await act(async () => container.querySelector('form')!.dispatchEvent(event));
    expect(event.defaultPrevented).toBe(true);
    expect(container.textContent).not.toContain('Esta revisión no guarda cambios');
    expect(button('Guardar experiencia').type).toBe('submit');
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.edit).not.toHaveBeenCalled();
  });

  it('hidrata la lista SSR sin generar identidades ni invocar acciones', async () => {
    const uuid = vi.spyOn(crypto, 'randomUUID');
    const element = <ProfessionalExperienceEditor initialExperiences={[saved]} />;
    container = document.createElement('div');
    container.innerHTML = renderToString(element);
    document.body.appendChild(container);
    const onRecoverableError = vi.fn();
    await act(async () => {
      root = hydrateRoot(container, element, { onRecoverableError });
    });
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(uuid).not.toHaveBeenCalled();
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    await click('Añadir experiencia');
    expect(uuid).toHaveBeenCalledTimes(1);
  });

  it('releer bloquea duplicados y cambios de selección hasta resolver; nunca reemplaza el borrador', async () => {
    setup([saved]);
    await click('Editar experiencia: Análisis');
    change('frequency', 'occasional');
    mocks.edit.mockResolvedValue(failure('CONFLICT'));
    await click('Guardar cambios');
    let resolve!: (value: unknown) => void;
    mocks.read.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    act(() => {
      button('Consultar versión guardada').click();
      button('Consultar versión guardada').click();
    });
    expect(mocks.read).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[role="status"]')?.textContent).toContain('Cargando historial');
    expect(button('Añadir experiencia').disabled).toBe(true);
    expect(container.querySelector('fieldset')?.disabled).toBe(true);
    await act(async () =>
      resolve({
        ok: true,
        data: { experiences: [{ ...saved, frequency: 'daily_or_almost_daily' }] },
      }),
    );
    expect(container.querySelector<HTMLSelectElement>('[name="frequency"]')?.value).toBe(
      'occasional',
    );
    // New server props from a route reconciliation must not silently reset local edits either.
    act(() =>
      root.render(
        <ProfessionalExperienceEditor
          initialExperiences={[{ ...saved, frequency: 'daily_or_almost_daily' }]}
        />,
      ),
    );
    expect(container.querySelector<HTMLSelectElement>('[name="frequency"]')?.value).toBe(
      'occasional',
    );
    mocks.edit.mockResolvedValue(failure('CONFLICT'));
    await click('Guardar cambios');
    expect(mocks.edit.mock.calls.at(-1)![0].expectedExperience).toEqual(saved);
  });

  it('una excepción de transporte conserva borrador sin éxito y permite reintento', async () => {
    setup();
    await click('Añadir experiencia');
    change('activity', 'analysis');
    mocks.create.mockRejectedValue(new Error('network'));
    await click('Guardar experiencia');
    expect(container.textContent).toContain('No se pudo guardar');
    expect(container.querySelector<HTMLSelectElement>('[name="activity"]')?.value).toBe('analysis');
    expect(container.querySelector('fieldset')?.disabled).toBe(false);
    expect(container.textContent).not.toContain('Experiencia guardada en tu perfil');
  });

  it.each(['UNAUTHORIZED', 'VALIDATION_ERROR', 'EXTERNAL_DEPENDENCY_ERROR', 'NOT_FOUND'])(
    'conserva el borrador ante %s y no anuncia guardado',
    async (code) => {
      setup();
      await click('Añadir experiencia');
      change('activity', 'analysis');
      mocks.create.mockResolvedValue(failure(code));
      await click('Guardar experiencia');
      expect(container.querySelector<HTMLSelectElement>('[name="activity"]')?.value).toBe(
        'analysis',
      );
      expect(container.querySelector('[role="alert"]')).not.toBeNull();
      expect(container.textContent).not.toContain('Experiencia guardada en tu perfil');
      expect(button('Consultar versión guardada')).toBeUndefined();
    },
  );

  it('protege cambios al seleccionar otra guardada o añadir, cancelando o aceptando confirmación', async () => {
    setup([saved, { id: 'experience-two', activity: 'execution' }]);
    await click('Editar experiencia: Análisis');
    change('frequency', 'occasional');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await click('Añadir experiencia');
    await click('Editar experiencia: Ejecución operativa');
    expect(container.querySelector<HTMLSelectElement>('[name="frequency"]')?.value).toBe(
      'occasional',
    );
    expect(confirm).toHaveBeenCalledTimes(2);
    confirm.mockReturnValue(true);
    await click('Añadir experiencia');
    expect(container.querySelector<HTMLSelectElement>('[name="activity"]')?.value).toBe('');
  });

  it('conflicto: consulta sin perder borrador; cancelar conserva baseline y confirmar carga versión actual', async () => {
    setup([saved]);
    await click('Editar experiencia: Análisis');
    change('frequency', 'occasional');
    mocks.edit.mockResolvedValue(failure('CONFLICT'));
    await click('Guardar cambios');
    expect(container.textContent).toContain('ha cambiado');
    const current = { ...saved, activity: 'execution' };
    mocks.read.mockRejectedValueOnce(new Error('network'));
    await click('Consultar versión guardada');
    expect(button('Consultar versión guardada')).toBeDefined();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('No se pudo cargar');
    mocks.read.mockResolvedValueOnce(failure('EXTERNAL_DEPENDENCY_ERROR'));
    await click('Consultar versión guardada');
    expect(button('Consultar versión guardada')).toBeDefined();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.querySelector<HTMLSelectElement>('[name="frequency"]')?.value).toBe(
      'occasional',
    );
    mocks.read.mockResolvedValue({ ok: true, data: { experiences: [current] } });
    await click('Consultar versión guardada');
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      'Versión guardada disponible',
    );
    expect(container.textContent).not.toContain('Experiencia guardada en tu perfil');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await click('Cargar versión guardada');
    await click('Guardar cambios');
    expect(mocks.edit.mock.calls.at(-1)![0].expectedExperience).toEqual(saved);
    expect(container.querySelector<HTMLSelectElement>('[name="frequency"]')?.value).toBe(
      'occasional',
    );
    confirm.mockReturnValue(true);
    await click('Cargar versión guardada');
    expect(button('Consultar versión guardada')).toBeUndefined();
    expect(container.querySelector<HTMLSelectElement>('[name="activity"]')?.value).toBe(
      'execution',
    );
    change('frequency', 'daily_or_almost_daily');
    await click('Guardar cambios');
    expect(mocks.edit.mock.calls.at(-1)![0].expectedExperience).toEqual(current);
  });

  it('bloquea duplicados y selección mientras guarda; una edición sintética tardía no queda marcada guardada', async () => {
    setup();
    await click('Añadir experiencia');
    change('activity', 'analysis');
    let resolve!: (value: unknown) => void;
    mocks.create.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    act(() => {
      button('Guardar experiencia').click();
      button('Guardar experiencia').click();
    });
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(container.querySelector('form')?.getAttribute('aria-busy')).toBe('true');
    expect(container.querySelector('fieldset')?.disabled).toBe(true);
    expect(button('Añadir experiencia').disabled).toBe(true);
    change('activity', 'execution');
    const experience = mocks.create.mock.calls[0][0].experience;
    await act(async () => resolve({ ok: true, data: { experience } }));
    expect(container.querySelector<HTMLSelectElement>('[name="activity"]')?.value).toBe(
      'execution',
    );
    expect(container.textContent).not.toContain('Experiencia guardada en tu perfil');
    expect(button('Guardar cambios').disabled).toBe(false);
    expect(button('Editar experiencia: Análisis')).toBeDefined();
  });

  it('oculta la consulta en estado normal y al abrir edición', async () => {
    setup([saved]);
    expect(button('Consultar versión guardada')).toBeUndefined();
    await click('Editar experiencia: Análisis');
    expect(button('Consultar versión guardada')).toBeUndefined();
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it('conflicto al crear permite consultar; si desaparece el destino conserva el borrador y permite reintentar', async () => {
    setup();
    await click('Añadir experiencia');
    change('activity', 'reporting');
    mocks.create.mockResolvedValue(failure('CONFLICT'));
    await click('Guardar experiencia');
    mocks.read.mockResolvedValue({ ok: true, data: { experiences: [] } });
    await click('Consultar versión guardada');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('ya no está guardada');
    expect(container.querySelector<HTMLSelectElement>('[name="activity"]')?.value).toBe(
      'reporting',
    );
    expect(button('Cargar versión guardada')).toBeUndefined();
    expect(button('Consultar versión guardada')).toBeDefined();
    expect(container.textContent).not.toContain('Experiencia guardada en tu perfil');
    const experience = mocks.create.mock.calls[0][0].experience;
    mocks.read.mockResolvedValue({ ok: true, data: { experiences: [experience] } });
    await click('Consultar versión guardada');
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      'Elaboración de informes',
    );
    expect(button('Cargar versión guardada')).toBeDefined();
  });
});
