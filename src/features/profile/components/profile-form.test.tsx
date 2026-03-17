import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { ProfileActionError } from '../types/profile.types';
import { type ProfileFormPayload, ProfileForm, serializeProfilePayload } from './profile-form';

let container: HTMLDivElement | null = null;
let root: Root | null = null;

const VALID_INITIAL_VALUES = {
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

function setupForm(options?: {
  saveDraft?: (input: ProfileFormPayload) => Promise<{ status: 'draft' }>;
  submitProfile?: (input: ProfileFormPayload) => Promise<{ status: 'draft' | 'submitted' }>;
  initialValues?: typeof VALID_INITIAL_VALUES;
  withDefaultInitialValues?: boolean;
}) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root?.render(
      <ProfileForm
        userId="user-1"
        initialValues={
          options?.withDefaultInitialValues === false
            ? options.initialValues
            : (options?.initialValues ?? VALID_INITIAL_VALUES)
        }
        saveDraft={options?.saveDraft}
        submitProfile={options?.submitProfile}
      />,
    );
  });

  return {
    fullName: queryInput('profile.fullName'),
    rank: queryInput('militaryBackground.rank'),
    targetRole: queryInput('civilianTarget.targetRole'),
    saveDraftButton: queryButton('save-draft'),
    submitButton: queryButton('submit-profile'),
  };
}

function queryInput(name: string): HTMLInputElement {
  const input = container?.querySelector<HTMLInputElement>(`[name="${name}"]`);
  if (!input) {
    throw new Error(`Input ${name} not found`);
  }

  return input;
}

function queryButton(action: string): HTMLButtonElement {
  const button = container?.querySelector<HTMLButtonElement>(`[data-action="${action}"]`);
  if (!button) {
    throw new Error(`Button ${action} not found`);
  }

  return button;
}

async function click(button: HTMLButtonElement) {
  await act(async () => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

async function changeInput(input: HTMLInputElement, nextValue: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;

  await act(async () => {
    valueSetter?.call(input, nextValue);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

describe('ProfileForm', () => {
  it('serializes nullable and numeric fields for payload contract', () => {
    const payload = serializeProfilePayload('user-1', {
      profile: {
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: ' ',
        city: ' Madrid ',
      },
      militaryBackground: {
        rank: ' Captain ',
        area: '',
        yearsOfService: '12',
        summary: ' ',
      },
      civilianTarget: {
        targetRole: 'Analista',
        targetSector: ' ',
        locationPreference: 'Remoto',
      },
    });

    expect(payload).toEqual({
      userId: 'user-1',
      profile: {
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: null,
        city: 'Madrid',
      },
      militaryBackground: {
        rank: 'Captain',
        area: null,
        yearsOfService: 12,
        summary: null,
      },
      civilianTarget: {
        targetRole: 'Analista',
        targetSector: null,
        locationPreference: 'Remoto',
      },
    });
  });

  it('runs save draft flow and calls saveDraftAction with normalized payload', async () => {
    const saveDraft = vi.fn().mockResolvedValue({ status: 'draft' as const });
    const form = setupForm({ saveDraft });

    await click(form.saveDraftButton);

    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(saveDraft).toHaveBeenCalledWith({
      userId: 'user-1',
      profile: {
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: '+34123456789',
        city: 'Madrid',
      },
      militaryBackground: {
        rank: 'Capitan',
        area: 'Comunicaciones',
        yearsOfService: 7,
        summary: null,
      },
      civilianTarget: {
        targetRole: 'Gestora',
        targetSector: 'Logistica',
        locationPreference: null,
      },
    });
    expect(container?.textContent).toContain('Borrador guardado correctamente.');
  });

  it('allows draft with empty military rank/area and serializes both as null', async () => {
    const saveDraft = vi.fn().mockResolvedValue({ status: 'draft' as const });
    setupForm({
      saveDraft,
      initialValues: {
        ...VALID_INITIAL_VALUES,
        militaryBackground: {
          ...VALID_INITIAL_VALUES.militaryBackground,
          rank: '',
          area: '',
        },
      },
    });

    await click(queryButton('save-draft'));

    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(saveDraft).toHaveBeenCalledWith({
      userId: 'user-1',
      profile: {
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: '+34123456789',
        city: 'Madrid',
      },
      militaryBackground: {
        rank: null,
        area: null,
        yearsOfService: 7,
        summary: null,
      },
      civilianTarget: {
        targetRole: 'Gestora',
        targetSector: 'Logistica',
        locationPreference: null,
      },
    });
    expect(container?.textContent).toContain('Borrador guardado correctamente.');
  });

  it('updates only military branch field on edit before serialization', async () => {
    const saveDraft = vi.fn().mockResolvedValue({ status: 'draft' as const });
    setupForm({ saveDraft });

    await changeInput(queryInput('militaryBackground.rank'), 'Mayor');
    await click(queryButton('save-draft'));

    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(saveDraft).toHaveBeenCalledWith({
      userId: 'user-1',
      profile: {
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: '+34123456789',
        city: 'Madrid',
      },
      militaryBackground: {
        rank: 'Mayor',
        area: 'Comunicaciones',
        yearsOfService: 7,
        summary: null,
      },
      civilianTarget: {
        targetRole: 'Gestora',
        targetSector: 'Logistica',
        locationPreference: null,
      },
    });
  });

  it('starts with empty state when initialValues is missing or empty', () => {
    setupForm({ withDefaultInitialValues: false });

    expect(queryInput('profile.fullName').value).toBe('');
    expect(queryInput('profile.email').value).toBe('');
    expect(queryInput('profile.phone').value).toBe('');
    expect(queryInput('profile.city').value).toBe('');
    expect(queryInput('militaryBackground.rank').value).toBe('');
    expect(queryInput('civilianTarget.targetRole').value).toBe('');

    act(() => {
      root?.unmount();
      container?.remove();
      container = document.createElement('div');
      document.body.appendChild(container);
      root = createRoot(container);
      root.render(
        <ProfileForm
          userId="user-1"
          initialValues={{}}
          saveDraft={vi.fn().mockResolvedValue({ status: 'draft' as const })}
          submitProfile={vi.fn().mockResolvedValue({ status: 'submitted' as const })}
        />,
      );
    });

    expect(queryInput('profile.fullName').value).toBe('');
    expect(queryInput('profile.email').value).toBe('');
    expect(queryInput('militaryBackground.rank').value).toBe('');
    expect(queryInput('civilianTarget.targetRole').value).toBe('');
  });

  it('completes full ui flow draft to submitted after filling required fields', async () => {
    const saveDraft = vi.fn().mockResolvedValue({ status: 'draft' as const });
    const submitProfile = vi.fn().mockResolvedValue({ status: 'submitted' as const });
    setupForm({
      saveDraft,
      submitProfile,
      initialValues: {
        ...VALID_INITIAL_VALUES,
        militaryBackground: {
          ...VALID_INITIAL_VALUES.militaryBackground,
          rank: '',
        },
        civilianTarget: {
          ...VALID_INITIAL_VALUES.civilianTarget,
          targetRole: '',
          targetSector: '',
        },
      },
    });

    await click(queryButton('save-draft'));
    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(container?.textContent).toContain('Borrador guardado correctamente.');

    await changeInput(queryInput('militaryBackground.rank'), 'Capitan');
    await changeInput(queryInput('civilianTarget.targetRole'), 'Gestora');
    await changeInput(queryInput('civilianTarget.targetSector'), 'Logistica');

    await click(queryButton('submit-profile'));

    expect(submitProfile).toHaveBeenCalledTimes(1);
    expect(container?.textContent).toContain('Perfil enviado correctamente.');
  });

  it('shows field errors and focuses accessible summary on invalid submit', async () => {
    const submitProfile = vi.fn();
    const form = setupForm({
      submitProfile,
      initialValues: {
        ...VALID_INITIAL_VALUES,
        militaryBackground: {
          ...VALID_INITIAL_VALUES.militaryBackground,
          rank: '',
          area: '',
        },
        civilianTarget: {
          ...VALID_INITIAL_VALUES.civilianTarget,
          targetRole: '',
          targetSector: '',
        },
      },
    });

    await click(form.submitButton);

    const summary = container?.querySelector<HTMLElement>('#profile-form-error-summary');
    const rankInput = queryInput('militaryBackground.rank');
    const areaInput = queryInput('militaryBackground.area');
    const targetRoleInput = queryInput('civilianTarget.targetRole');
    const targetSectorInput = queryInput('civilianTarget.targetSector');

    expect(submitProfile).not.toHaveBeenCalled();
    expect(summary?.getAttribute('role')).toBe('alert');
    expect(document.activeElement).toBe(summary);
    expect(rankInput.getAttribute('aria-invalid')).toBe('true');
    expect(areaInput.getAttribute('aria-invalid')).toBe('true');
    expect(targetRoleInput.getAttribute('aria-invalid')).toBe('true');
    expect(targetSectorInput.getAttribute('aria-invalid')).toBe('true');
    expect(container?.textContent).toContain('militaryBackground.rank is required for submit');
    expect(container?.textContent).toContain('militaryBackground.area is required for submit');
    expect(container?.textContent).toContain('civilianTarget.targetRole is required for submit');
    expect(container?.textContent).toContain('civilianTarget.targetSector is required for submit');
  });

  it('submits after correcting civilian required fields from invalid state', async () => {
    const submitProfile = vi.fn().mockResolvedValue({ status: 'submitted' as const });
    setupForm({
      submitProfile,
      initialValues: {
        ...VALID_INITIAL_VALUES,
        civilianTarget: {
          targetRole: '',
          targetSector: '',
          locationPreference: '',
        },
      },
    });

    await click(queryButton('submit-profile'));
    expect(submitProfile).not.toHaveBeenCalled();

    await changeInput(queryInput('civilianTarget.targetRole'), 'Analista');
    await changeInput(queryInput('civilianTarget.targetSector'), 'Tecnologia');
    await click(queryButton('submit-profile'));

    expect(submitProfile).toHaveBeenCalledTimes(1);
    expect(submitProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        civilianTarget: {
          targetRole: 'Analista',
          targetSector: 'Tecnologia',
          locationPreference: null,
        },
      }),
    );
    expect(container?.textContent).toContain('Perfil enviado correctamente.');
  });

  it('maps domain errors to global banner and preserves user input', async () => {
    const submitProfile = vi
      .fn()
      .mockRejectedValue(new ProfileActionError('domain', 'Fallo de negocio al enviar perfil'));
    const form = setupForm({ submitProfile });

    await click(form.submitButton);

    expect(container?.textContent).toContain('Fallo de negocio al enviar perfil');
    expect(form.fullName.value).toBe('Ada Lovelace');
    expect(form.rank.value).toBe('Capitan');
  });

  it('handles failed submit, correction and successful retry', async () => {
    const submitProfile = vi
      .fn()
      .mockRejectedValueOnce(new ProfileActionError('domain', 'Error temporal en submit'))
      .mockResolvedValueOnce({ status: 'submitted' as const });
    setupForm({ submitProfile });

    await click(queryButton('submit-profile'));
    expect(container?.textContent).toContain('Error temporal en submit');

    await changeInput(queryInput('profile.city'), 'Barcelona');
    await click(queryButton('submit-profile'));

    expect(submitProfile).toHaveBeenCalledTimes(2);
    expect(container?.textContent).toContain('Perfil enviado correctamente.');
    expect(queryInput('profile.city').value).toBe('Barcelona');
  });

  it('prevents double submit while pending', async () => {
    let resolver: (() => void) | null = null;
    const saveDraft = vi.fn(
      () =>
        new Promise<{ status: 'draft' }>((resolve) => {
          resolver = () => resolve({ status: 'draft' });
        }),
    );
    const form = setupForm({ saveDraft });

    act(() => {
      form.saveDraftButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      form.saveDraftButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await act(async () => {
      resolver?.();
      await Promise.resolve();
    });

    expect(saveDraft).toHaveBeenCalledTimes(1);
  });

  it('keeps military fields stable when edit is attempted during pending', async () => {
    let resolver: (() => void) | null = null;
    const saveDraft = vi
      .fn<() => Promise<{ status: 'draft' }>>()
      .mockImplementationOnce(
        () =>
          new Promise<{ status: 'draft' }>((resolve) => {
            resolver = () => resolve({ status: 'draft' });
          }),
      )
      .mockResolvedValue({ status: 'draft' as const });

    const form = setupForm({ saveDraft });
    const areaInput = queryInput('militaryBackground.area');

    await click(form.saveDraftButton);

    expect(form.saveDraftButton.disabled).toBe(true);
    expect(areaInput.closest('fieldset')?.disabled).toBe(true);

    const previousArea = areaInput.value;
    await act(async () => {
      areaInput.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'X' }));
      areaInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(areaInput.value).toBe(previousArea);

    await act(async () => {
      resolver?.();
      await Promise.resolve();
    });

    await click(form.saveDraftButton);

    expect(saveDraft).toHaveBeenCalledTimes(2);
    expect(saveDraft).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        militaryBackground: expect.objectContaining({ area: 'Comunicaciones' }),
      }),
    );
  });

  it('keeps civilian fields stable when edit is attempted during pending', async () => {
    let resolver: (() => void) | null = null;
    const saveDraft = vi
      .fn<() => Promise<{ status: 'draft' }>>()
      .mockImplementationOnce(
        () =>
          new Promise<{ status: 'draft' }>((resolve) => {
            resolver = () => resolve({ status: 'draft' });
          }),
      )
      .mockResolvedValue({ status: 'draft' as const });

    const form = setupForm({ saveDraft });
    const targetRoleInput = queryInput('civilianTarget.targetRole');

    await click(form.saveDraftButton);

    expect(form.saveDraftButton.disabled).toBe(true);
    expect(targetRoleInput.closest('fieldset')?.disabled).toBe(true);

    const previousTargetRole = targetRoleInput.value;
    await act(async () => {
      targetRoleInput.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'X' }));
      targetRoleInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(targetRoleInput.value).toBe(previousTargetRole);

    await act(async () => {
      resolver?.();
      await Promise.resolve();
    });

    await click(form.saveDraftButton);

    expect(saveDraft).toHaveBeenCalledTimes(2);
    expect(saveDraft).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        civilianTarget: expect.objectContaining({ targetRole: 'Gestora' }),
      }),
    );
  });

  it('maps validation action errors to field errors when cause is ZodError', async () => {
    const submitProfile = vi.fn().mockRejectedValue(
      new ProfileActionError('validation', 'Invalid profile submit input', {
        cause: new ZodError([
          {
            code: 'custom',
            path: ['civilianTarget', 'targetSector'],
            message: 'sector faltante',
          },
        ]),
      }),
    );
    setupForm({ submitProfile });

    await click(queryButton('submit-profile'));

    expect(container?.textContent).toContain('sector faltante');
    expect(queryInput('civilianTarget.targetSector').getAttribute('aria-invalid')).toBe('true');
  });
});
