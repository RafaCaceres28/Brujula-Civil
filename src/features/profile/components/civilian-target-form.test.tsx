import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CivilianTargetForm } from './civilian-target-form';

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

function renderForm(onChange = vi.fn()) {
  container = document.createElement('div');
  document.body.appendChild(container);

  root = createRoot(container);
  act(() => {
    root?.render(
      <CivilianTargetForm
        values={{
          targetRole: '',
          targetSector: '',
          locationPreference: '',
        }}
        errors={{ targetSector: 'El sector es obligatorio' }}
        onChange={onChange}
      />,
    );
  });

  return { onChange };
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

  it('disables controls when form is pending', () => {
    container = document.createElement('div');
    document.body.appendChild(container);

    root = createRoot(container);
    act(() => {
      root?.render(
        <CivilianTargetForm
          values={{
            targetRole: '',
            targetSector: '',
            locationPreference: '',
          }}
          errors={{}}
          disabled
          onChange={vi.fn()}
        />,
      );
    });

    const fieldset = container?.querySelector('fieldset');
    expect(fieldset?.disabled).toBe(true);
  });
});
