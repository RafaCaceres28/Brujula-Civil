import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ComponentProps, MouseEvent, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onboardingDraftSchema } from '../schemas/wizard.schema';
import { OnboardingExperienceStep } from './onboarding-experience-step';

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  create: vi.fn(),
  edit: vi.fn(),
  read: vi.fn(),
  push: vi.fn(),
}));
vi.mock('../actions/save-experiencia-step-action', () => ({
  saveExperienciaStepAction: mocks.save,
}));
vi.mock('@/features/profile/actions/save-experience-action', () => ({
  createExperienceAction: mocks.create,
  editExperienceAction: mocks.edit,
}));
vi.mock('@/features/profile/actions/read-experiences-action', () => ({
  readExperiencesAction: mocks.read,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('next/link', () => ({
  default: ({
    href,
    onNavigate,
    children,
    ...props
  }: {
    href: string;
    onNavigate?: (event: { preventDefault: () => void }) => void;
    children: ReactNode;
  }) => (
    <a
      {...props}
      href={href}
      onClick={(event: MouseEvent) => {
        event.preventDefault();
        let blocked = false;
        onNavigate?.({
          preventDefault: () => {
            blocked = true;
          },
        });
        if (!blocked) mocks.push(href);
      }}
    >
      {children}
    </a>
  ),
}));

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.resetAllMocks();
  mocks.save.mockResolvedValue({ ok: true, data: { nextHref: '/onboarding/competencias' } });
});
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  vi.restoreAllMocks();
});
function setup(props: Partial<ComponentProps<typeof OnboardingExperienceStep>> = {}) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root.render(
      <OnboardingExperienceStep
        values={onboardingDraftSchema.parse({}).experiencia}
        initialExperiences={[]}
        completed={false}
        {...props}
      />,
    ),
  );
}
function button(text: string) {
  return [...container.querySelectorAll('button')].find((item) => item.textContent === text)!;
}
async function click(text: string) {
  await act(async () => button(text).click());
}
function dirtyEditor() {
  act(() => button('Añadir experiencia').click());
  act(() => {
    const input = container.querySelector<HTMLSelectElement>('[name="activity"]')!;
    input.value = 'analysis';
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
function dirtyComplement() {
  act(() => container.querySelector<HTMLInputElement>('[name="tools"]')!.click());
}

describe('OnboardingExperienceStep', () => {
  it('continua sin historial, sin crear ni copiar experiencias y con complementarios montados', async () => {
    setup();
    expect(container.querySelector('form form')).toBeNull();
    expect(container.querySelector('[name="functionTypes"]')).toBeNull();
    expect(container.querySelectorAll('details input[name="_experienceFields"]')).toHaveLength(6);
    expect(mocks.save).not.toHaveBeenCalled();
    await click('Continuar');
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(mocks.push).toHaveBeenCalledWith('/onboarding/competencias');
    expect(button('Continuar').disabled).toBe(true);
    expect([...mocks.save.mock.calls[0][0].keys()]).not.toContain('careerHistory');
  });
  it('confirma descarte canonico, cancelar no escribe; aceptar no guarda experiencia', async () => {
    setup();
    dirtyEditor();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await click('Continuar');
    expect(confirm).toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    await click('Continuar');
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('bloquea mientras guarda canonico, fallo conserva dirty y requiere confirmacion', async () => {
    setup();
    dirtyEditor();
    let resolve!: (value: unknown) => void;
    mocks.create.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    await click('Guardar experiencia');
    expect(button('Continuar').disabled).toBe(true);
    await click('Continuar');
    expect(mocks.save).not.toHaveBeenCalled();
    await act(async () =>
      resolve({ ok: false, error: { code: 'CONFLICT', message: 'Conflicto' } }),
    );
    expect(button('Continuar').disabled).toBe(false);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await click('Continuar');
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('solo confirmacion del servidor limpia dirty canonico y no confunde formularios', async () => {
    setup();
    dirtyEditor();
    mocks.create.mockImplementation(async (command) => ({
      ok: true,
      data: { experience: command.experience },
    }));
    await click('Guardar experiencia');
    expect(container.textContent).toContain('Experiencia guardada en tu perfil');
    expect(container.querySelectorAll('form')).toHaveLength(2);
    const confirm = vi.spyOn(window, 'confirm');
    await click('Continuar');
    expect(confirm).not.toHaveBeenCalled();
  });
  it('lectura fallida bloquea hasta reintento correcto, sin tratar error como vacio', async () => {
    setup({ initialError: 'No se pudo cargar el historial' });
    expect(button('Continuar').disabled).toBe(true);
    expect(container.textContent).not.toContain('Todavía no tienes');
    mocks.read.mockResolvedValueOnce({ ok: false, error: { message: 'Fallo lectura' } });
    await click('Reintentar lectura');
    expect(button('Continuar').disabled).toBe(true);
    mocks.read.mockResolvedValueOnce({ ok: true, data: { experiences: [] } });
    await click('Reintentar lectura');
    expect(button('Continuar').disabled).toBe(false);
  });
  it('no autosave; volver y beforeunload protegen borrador complementario local', async () => {
    setup();
    dirtyComplement();
    expect(mocks.save).not.toHaveBeenCalled();
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await act(async () => container.querySelector<HTMLAnchorElement>('a')!.click());
    expect(mocks.push).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    await act(async () => container.querySelector<HTMLAnchorElement>('a')!.click());
    expect(mocks.push).toHaveBeenCalledWith('/onboarding/militar');
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('fallo de complemento conserva respuestas y borrador, permite reintentar sin exito falso', async () => {
    setup();
    dirtyComplement();
    const checked = container.querySelector<HTMLInputElement>('[name="tools"]')!;
    mocks.save.mockResolvedValueOnce({
      ok: false,
      error: { message: 'No se pudo guardar el paso.' },
    });
    await click('Continuar');
    expect(container.textContent).toContain('No se pudo guardar el paso');
    expect(checked.checked).toBe(true);
    expect(mocks.push).not.toHaveBeenCalled();
    await click('Continuar');
    expect(mocks.push).toHaveBeenCalledTimes(1);
  });
  it('pendiente complementario impide doble envio, edicion y regreso; rechazo permite recuperar', async () => {
    setup();
    let reject!: (reason: Error) => void;
    mocks.save.mockReturnValue(
      new Promise((_, fail) => {
        reject = fail;
      }),
    );
    await click('Continuar');
    expect(button('Continuar').disabled).toBe(true);
    expect(
      button('Añadir experiencia').disabled ||
        button('Añadir experiencia').closest('fieldset')?.disabled,
    ).toBe(true);
    await act(async () => container.querySelector<HTMLAnchorElement>('a')!.click());
    expect(mocks.push).not.toHaveBeenCalled();
    await click('Continuar');
    expect(mocks.save).toHaveBeenCalledTimes(1);
    await act(async () => reject(new Error('private transport')));
    expect(container.textContent).not.toContain('private transport');
    expect(container.textContent).toContain('Tu borrador se conserva');
    expect(button('Continuar').disabled).toBe(false);
  });
  it('completados vuelven al perfil, no a militar, y guardan complementarios por separado', async () => {
    setup({ completed: true });
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/perfil');
    expect(button('Continuar')).toBeUndefined();
    await click('Guardar información complementaria');
    expect(mocks.save).toHaveBeenCalledTimes(1);
  });
});
