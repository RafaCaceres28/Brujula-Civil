import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StructuredExperience } from '../schemas/structured-experience.schema';
import { OtherTaskDescriptions } from './other-task-descriptions';

const mocks = vi.hoisted(() => ({ edit: vi.fn() }));
vi.mock('@/features/profile/actions/save-experience-action', () => ({
  editExperienceAction: mocks.edit,
}));
let container: HTMLDivElement;
let root: Root;
const source = { description: '<b>Revisaba documentos</b>', target: 'Documentación' };
const initial: StructuredExperience = {
  id: 'experience-1',
  activity: 'analysis',
  context: 'Original',
  stageIds: ['stage-1'],
  otherTasks: [source, { description: 'Ordenaba', target: 'Material' }],
};

function setup(experience = initial) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<OtherTaskDescriptions experiences={[experience]} />));
}
function button(label: string, index = 0) {
  return Array.from(container.querySelectorAll('button')).filter(
    (element) => element.textContent === label,
  )[index]!;
}
function click(label: string, index = 0) {
  act(() => button(label, index).click());
}
function text(value: string, index = 0) {
  const textarea = container.querySelectorAll('textarea')[index];
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(
      textarea,
      value,
    );
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  vi.resetAllMocks();
});

describe('literal task descriptions through the existing edit action', () => {
  it('prepares only literal source, warns, freely edits and discards without a write', () => {
    setup();
    expect(container.querySelector('b')).toBeNull();
    click('Preparar descripción para CV');
    expect(container.querySelector('textarea')!.value).toBe(
      `${source.description} (${source.target})`,
    );
    expect(container.textContent).toContain('No incluyas información militar clasificada');
    expect(container.textContent).toContain('No se ha añadido a ningún CV');
    expect(container.textContent).toContain('/500 caracteres');
    text('Mi redacción');
    click('Descartar borrador');
    expect(container.querySelector('textarea')).toBeNull();
    expect(mocks.edit).not.toHaveBeenCalled();
  });

  it('confirms only after success, serializes same-experience writes and uses returned full baseline for the next task', async () => {
    setup();
    click('Preparar descripción para CV', 1);
    text('Borrador de la segunda tarea');
    click('Preparar descripción para CV');
    text('Texto revisado por mí');
    let resolve!: (result: unknown) => void;
    mocks.edit.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    click('Confirmar descripción');
    click('Confirmar descripción');
    expect(mocks.edit).toHaveBeenCalledTimes(1);
    expect(container.textContent).not.toContain('Descripción confirmada por ti');
    expect(
      Array.from(container.querySelectorAll('fieldset')).every((field) => field.disabled),
    ).toBe(true);
    const first = {
      ...initial,
      otherTasks: [
        { ...source, confirmedDescription: 'Texto revisado por mí' },
        initial.otherTasks![1],
      ],
    };
    expect(mocks.edit).toHaveBeenLastCalledWith({
      id: initial.id,
      expectedExperience: initial,
      set: { otherTasks: first.otherTasks },
      clear: [],
    });
    await act(async () => resolve({ ok: true, data: { experience: first } }));
    expect(container.textContent).toContain('Descripción confirmada por ti');
    expect(container.querySelector('textarea')!.value).toBe('Borrador de la segunda tarea');
    mocks.edit.mockImplementation(async ({ expectedExperience, set }) => ({
      ok: true,
      data: { experience: { ...expectedExperience, ...set } },
    }));
    await act(async () => click('Confirmar descripción'));
    expect(mocks.edit.mock.calls[1][0].expectedExperience).toEqual(first);
    expect(mocks.edit.mock.calls[1][0].set.otherTasks[0]).toEqual(first.otherTasks[0]);
    expect(container.querySelector('textarea')).toBeNull();
    expect(container.textContent).not.toContain('Pendientes de interpretación');
  });

  it('loads a confirmed nested description, edits it, then withdraws without deleting the source', async () => {
    const stored = { ...initial, otherTasks: [{ ...source, confirmedDescription: 'Guardada' }] };
    setup(stored);
    expect(container.textContent).toContain('Descripciones confirmadas por el usuario');
    expect(container.textContent).toContain('Guardada');
    expect(container.textContent).not.toContain('Pendientes de interpretación');
    mocks.edit.mockImplementation(async ({ expectedExperience, set }) => ({
      ok: true,
      data: { experience: { ...expectedExperience, ...set } },
    }));
    click('Editar descripción');
    expect(container.querySelector('textarea')!.value).toBe('Guardada');
    text('Revisada');
    await act(async () => click('Confirmar descripción'));
    await act(async () => click('Retirar confirmación'));
    expect(mocks.edit.mock.calls[1][0].set.otherTasks).toEqual([source]);
    expect(container.textContent).toContain('Pendientes de interpretación');
    expect(container.textContent).not.toContain('Descripciones confirmadas por el usuario');
    expect(container.textContent).toContain(source.description);
  });

  it.each(['VALIDATION_ERROR', 'UNAUTHORIZED', 'EXTERNAL_DEPENDENCY_ERROR', 'CONFLICT', 'throw'])(
    'preserves baseline and edited text on %s without false confirmation',
    async (code) => {
      setup();
      click('Preparar descripción para CV');
      text('No perder este borrador');
      if (code === 'throw') mocks.edit.mockRejectedValue(new Error('network'));
      else mocks.edit.mockResolvedValue({ ok: false, error: { code, message: 'Error de prueba' } });
      await act(async () => click('Confirmar descripción'));
      expect(container.querySelector('textarea')!.value).toBe('No perder este borrador');
      expect(container.querySelector('[role="alert"]')!.textContent).toContain(
        'borrador se conserva',
      );
      expect(container.textContent).not.toContain('Descripción confirmada por ti');
      await act(async () => click('Confirmar descripción'));
      expect(mocks.edit.mock.calls[1][0].expectedExperience).toEqual(initial);
    },
  );

  it('rejects empty text locally and resets drafts on a reordered server snapshot', () => {
    setup();
    click('Preparar descripción para CV');
    text('   ');
    click('Confirmar descripción');
    expect(mocks.edit).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')!.textContent).toContain('1 y 500');
    text('Texto que no pertenece a otra tarea');
    const reordered = { ...initial, otherTasks: [...initial.otherTasks!].reverse() };
    act(() => root.render(<OtherTaskDescriptions experiences={[reordered]} />));
    expect(container.querySelector('textarea')).toBeNull();
    click('Preparar descripción para CV');
    expect(container.querySelector('textarea')!.value).toBe('Ordenaba (Material)');
  });
});
