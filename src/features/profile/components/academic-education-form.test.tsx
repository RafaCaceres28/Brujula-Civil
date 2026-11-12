import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveAcademicEducationAction } from '../actions/save-academic-education-action';
import { AcademicEducationForm } from './academic-education-form';

vi.mock('../actions/save-academic-education-action', () => ({
  saveAcademicEducationAction: vi.fn(),
}));
let container: HTMLDivElement;
let root: Root;
const first = {
  id: 'study-1',
  title: 'Primero',
  institution: 'Centro',
  year: 2020,
  status: 'completed' as const,
};
const second = {
  id: 'study-2',
  title: 'Segundo',
  institution: null,
  year: null,
  status: 'in_progress' as const,
};
beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});
const field = (name: string) =>
  container.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)!;
function fill(name: string, value: string) {
  act(() => {
    const input = field(name);
    const prototype =
      input.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(
      new Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }),
    );
  });
}
async function click(label: string) {
  await act(async () => {
    const button = [...container.querySelectorAll('button')].find(
      (node) => (node.getAttribute('aria-label') ?? node.textContent) === label,
    )!;
    button.click();
  });
}
async function submit() {
  await act(async () => {
    container
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}

describe('AcademicEducationForm', () => {
  it('does not invent a study, status or year and focuses invalid fields', async () => {
    act(() => root.render(<AcademicEducationForm initial={null} />));
    expect(container.querySelector('form')).toBeNull();
    await click('Añadir estudios');
    expect(field('title').value).toBe('');
    expect(field('status').value).toBe('');
    expect(field('year').value).toBe('');
    await submit();
    expect(document.activeElement).toBe(field('title'));
    expect(field('title').getAttribute('aria-invalid')).toBe('true');
    fill('title', 'Curso');
    await submit();
    expect(document.activeElement).toBe(field('status'));
    expect(saveAcademicEducationAction).not.toHaveBeenCalled();
  });
  it('adds with a stable ID across failures, keeps the draft and accepts only authoritative success', async () => {
    act(() => root.render(<AcademicEducationForm initial={null} />));
    await click('Añadir estudios');
    fill('title', ' Curso ');
    fill('status', 'in_progress');
    expect(container.querySelector('label[for="year"]')?.textContent).toBe(
      'Año previsto de finalización (opcional)',
    );
    vi.mocked(saveAcademicEducationAction).mockResolvedValue({
      ok: false,
      error: { code: 'CONFLICT', message: 'La formación ha cambiado. Recarga.' },
    });
    await submit();
    const sent = vi.mocked(saveAcademicEducationAction).mock.calls[0][0] as {
      expected: null;
      academicEducation: (typeof second)[];
    };
    expect(sent).toMatchObject({
      expected: null,
      academicEducation: [{ title: 'Curso', status: 'in_progress', year: null, institution: null }],
    });
    expect(sent.academicEducation[0].id).toMatch(/^[\da-f-]{36}$/);
    expect(field('title').value).toBe(' Curso ');
    expect(document.activeElement).toBe(container.querySelector('[role="alert"]'));
    expect(container.querySelector('[role="status"]')).toBeNull();
    vi.mocked(saveAcademicEducationAction).mockResolvedValue({
      ok: true,
      data: sent.academicEducation,
    });
    await submit();
    expect(saveAcademicEducationAction).toHaveBeenLastCalledWith(sent);
    expect(container.querySelector('form')).toBeNull();
    expect(container.textContent).toContain('Estudios guardados.');
  });
  it('edits and clears optional fields without changing IDs or other entries', async () => {
    act(() => root.render(<AcademicEducationForm initial={[first, second]} />));
    await click('Editar Primero');
    fill('title', 'Primero editado');
    fill('institution', '');
    fill('year', '');
    const changed = { ...first, title: 'Primero editado', institution: null, year: null };
    vi.mocked(saveAcademicEducationAction).mockResolvedValue({ ok: true, data: [changed, second] });
    await submit();
    expect(saveAcademicEducationAction).toHaveBeenCalledExactlyOnceWith({
      expected: [first, second],
      academicEducation: [changed, second],
    });
    expect(container.textContent).toContain('Segundo');
  });
  it('deletes only after explicit named confirmation and preserves remaining studies', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    act(() => root.render(<AcademicEducationForm initial={[first, second]} />));
    await click('Eliminar Primero');
    expect(confirm).toHaveBeenCalledWith('¿Eliminar el estudio «Primero»?');
    expect(saveAcademicEducationAction).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    vi.mocked(saveAcademicEducationAction).mockResolvedValue({ ok: true, data: [second] });
    await click('Eliminar Primero');
    expect(saveAcademicEducationAction).toHaveBeenCalledExactlyOnceWith({
      expected: [first, second],
      academicEducation: [second],
    });
    vi.mocked(saveAcademicEducationAction).mockResolvedValue({ ok: true, data: [] });
    await click('Eliminar Segundo');
    expect(saveAcademicEducationAction).toHaveBeenLastCalledWith({
      expected: [second],
      academicEducation: [],
    });
  });
  it('disables editing while pending and blocks duplicate submits', async () => {
    act(() => root.render(<AcademicEducationForm initial={[second]} />));
    await click('Editar Segundo');
    let resolve!: (value: Awaited<ReturnType<typeof saveAcademicEducationAction>>) => void;
    vi.mocked(saveAcademicEducationAction).mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await submit();
    await submit();
    expect(saveAcademicEducationAction).toHaveBeenCalledTimes(1);
    expect(container.querySelector('fieldset')?.disabled).toBe(true);
    await act(async () => resolve({ ok: true, data: [second] }));
    expect(container.querySelector('form')).toBeNull();
  });
  it('retains data on transport errors without leaking details or false success', async () => {
    act(() => root.render(<AcademicEducationForm initial={[first]} />));
    await click('Editar Primero');
    fill('title', 'Cambio');
    vi.mocked(saveAcademicEducationAction).mockRejectedValue(new Error('private detail'));
    await submit();
    expect(field('title').value).toBe('Cambio');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'Tus cambios se conservan',
    );
    expect(container.textContent).not.toContain('private detail');
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
});
