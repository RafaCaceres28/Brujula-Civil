import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CivilianTargetForm,
  type CivilianTargetFormErrors,
  type CivilianTargetFormProps,
} from './civilian-target-form';

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

function renderForm({
  onChangeSpy = () => undefined,
  errors = { targetSector: 'El sector es obligatorio' },
  disabled = false,
}: {
  onChangeSpy?: (event: unknown) => void;
  errors?: CivilianTargetFormErrors;
  disabled?: boolean;
} = {}) {
  container = document.createElement('div');
  document.body.appendChild(container);

  root = createRoot(container);
  const onChange: CivilianTargetFormProps['onChange'] = (event) => {
    onChangeSpy(event);
  };
  act(() => {
    root?.render(
      <CivilianTargetForm
        values={{
          targetRole: '',
          targetSector: '',
          locationPreference: '',
        }}
        errors={errors}
        disabled={disabled}
        onChange={onChange}
      />,
    );
  });

  return { onChangeSpy };
}

async function changeInput(name: string, value: string) {
  const input = container?.querySelector<HTMLInputElement>(`[name="${name}"]`);
  if (!input) {
    throw new Error(`Input ${name} not found`);
  }

  const valueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;

  await act(async () => {
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

describe('CivilianTargetForm', () => {
  it('renders field errors with accessibility bindings', () => {
    renderForm();

    const sectorInput = container?.querySelector<HTMLInputElement>(
      '[name="civilianTarget.targetSector"]',
    );
    const errorNode = document.getElementById('civilianTarget.targetSector-error');

    expect(sectorInput?.getAttribute('aria-invalid')).toBe('true');
    expect(sectorInput?.getAttribute('aria-describedby')).toBe('civilianTarget.targetSector-error');
    expect(errorNode?.textContent).toBe('El sector es obligatorio');
  });

  it('emits field-scoped change events for civilian target fields', async () => {
    const onChangeSpy = vi.fn();
    renderForm({ onChangeSpy, errors: {} });

    await changeInput('civilianTarget.targetRole', 'Analista');
    await changeInput('civilianTarget.targetSector', 'Tecnologia');
    await changeInput('civilianTarget.locationPreference', 'Remoto');

    expect(onChangeSpy).toHaveBeenNthCalledWith(1, {
      field: 'targetRole',
      value: 'Analista',
    });
    expect(onChangeSpy).toHaveBeenNthCalledWith(2, {
      field: 'targetSector',
      value: 'Tecnologia',
    });
    expect(onChangeSpy).toHaveBeenNthCalledWith(3, {
      field: 'locationPreference',
      value: 'Remoto',
    });
  });

  it('removes aria-describedby and stale error node when field error is cleared', () => {
    renderForm({ errors: { targetRole: 'El rol es obligatorio' } });

    const roleInput = container?.querySelector<HTMLInputElement>(
      '[name="civilianTarget.targetRole"]',
    );
    expect(roleInput?.getAttribute('aria-describedby')).toBe('civilianTarget.targetRole-error');
    expect(document.getElementById('civilianTarget.targetRole-error')).not.toBeNull();

    act(() => {
      const onChange: CivilianTargetFormProps['onChange'] = () => undefined;
      root?.render(
        <CivilianTargetForm
          values={{
            targetRole: 'Analista',
            targetSector: '',
            locationPreference: '',
          }}
          errors={{}}
          onChange={onChange}
        />,
      );
    });

    const updatedRoleInput = container?.querySelector<HTMLInputElement>(
      '[name="civilianTarget.targetRole"]',
    );
    expect(updatedRoleInput?.getAttribute('aria-describedby')).toBeNull();
    expect(document.getElementById('civilianTarget.targetRole-error')).toBeNull();
  });

  it('disables controls when form is pending', () => {
    renderForm({ errors: {}, disabled: true });

    const fieldset = container?.querySelector('fieldset');
    expect(fieldset?.disabled).toBe(true);
  });
});
