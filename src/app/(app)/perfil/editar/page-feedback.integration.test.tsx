import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileForm } from '../../../../features/profile/components/profile-form';

function PageShell(props: { children: ReactNode }) {
  return <div>{props.children}</div>;
}

function SectionHeader(props: { title: string; description: string }) {
  return (
    <header>
      <h1>{props.title}</h1>
      <p>{props.description}</p>
    </header>
  );
}

const { saveDraftActionMock, submitProfileActionMock } = vi.hoisted(() => ({
  saveDraftActionMock: vi.fn(),
  submitProfileActionMock: vi.fn(),
}));

const INITIAL_VALUES = {
  profile: {
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '+34123456789',
    city: 'Madrid',
  },
  militaryBackground: {
    rank: 'Capitan',
    area: 'Comunicaciones',
    yearsOfService: '7',
    summary: '',
  },
  civilianTarget: {
    targetRole: 'Gestora',
    targetSector: 'Logistica',
    locationPreference: '',
  },
};

let container: HTMLDivElement | null = null;
let root: Root | null = null;

afterEach(() => {
  if (!container) {
    return;
  }

  act(() => {
    root?.unmount();
    container?.remove();
  });

  container = null;
  root = null;
});

async function renderRouteContext() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(
      <PageShell>
        <SectionHeader
          title="Editar perfil"
          description="Actualiza tus datos personales, experiencia militar y objetivo profesional."
        />
        <a href="/perfil">Volver a perfil</a>
        <ProfileForm
          userId="user-1"
          initialValues={INITIAL_VALUES}
          saveDraft={saveDraftActionMock}
          submitProfile={submitProfileActionMock}
        />
      </PageShell>,
    );
  });
}

async function clickSaveDraft() {
  const button = container?.querySelector<HTMLButtonElement>('[data-action="save-draft"]');
  if (!button) {
    throw new Error('save draft button not found in /perfil/editar context');
  }

  await act(async () => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

async function clickSubmitProfile() {
  const button = container?.querySelector<HTMLButtonElement>('[data-action="submit-profile"]');
  if (!button) {
    throw new Error('submit profile button not found in /perfil/editar context');
  }

  await act(async () => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('/perfil/editar route context integration with ProfileForm feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveDraftActionMock.mockResolvedValue({ status: 'draft' });
    submitProfileActionMock.mockResolvedValue({ status: 'submitted' });
  });

  it('shows success feedback in route context when save draft succeeds', async () => {
    await renderRouteContext();
    await clickSaveDraft();

    expect(saveDraftActionMock).toHaveBeenCalledTimes(1);
    expect(container?.textContent).toContain('Borrador guardado correctamente.');
  });

  it('shows error feedback in route context when save draft fails', async () => {
    saveDraftActionMock.mockRejectedValueOnce(
      new Error('No se pudo guardar el borrador de perfil'),
    );

    await renderRouteContext();
    await clickSaveDraft();

    expect(saveDraftActionMock).toHaveBeenCalledTimes(1);
    expect(container?.textContent).toContain('Ocurrio un error inesperado. Intenta nuevamente.');
    expect(container?.textContent).not.toContain('Borrador guardado correctamente.');
  });

  it('shows success feedback in route context when submit succeeds', async () => {
    await renderRouteContext();
    await clickSubmitProfile();

    expect(submitProfileActionMock).toHaveBeenCalledTimes(1);
    expect(container?.textContent).toContain('Perfil enviado correctamente.');
  });

  it('shows error feedback in route context when submit fails', async () => {
    submitProfileActionMock.mockRejectedValueOnce(
      new Error('No se pudo enviar el perfil para validacion final'),
    );

    await renderRouteContext();
    await clickSubmitProfile();

    expect(submitProfileActionMock).toHaveBeenCalledTimes(1);
    expect(container?.textContent).toContain('Ocurrio un error inesperado. Intenta nuevamente.');
    expect(container?.textContent).not.toContain('Perfil enviado correctamente.');
  });
});
