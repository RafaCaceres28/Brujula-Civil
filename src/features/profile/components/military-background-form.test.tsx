import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MilitaryBackgroundForm } from './military-background-form';

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
      <MilitaryBackgroundForm
        values={{
          rank: '',
          area: '',
          yearsOfService: '',
          summary: '',
        }}
        errors={{ rank: 'El rango es obligatorio' }}
        onChange={onChange}
      />,
    );
  });

  return { onChange };
}

describe('MilitaryBackgroundForm', () => {
  it('renders field errors with accessibility bindings', () => {
    renderForm();

    const rankInput = container?.querySelector<HTMLInputElement>(
      '[name="militaryBackground.rank"]',
    );
    const errorNode = document.getElementById('militaryBackground.rank-error');

    expect(rankInput?.getAttribute('aria-invalid')).toBe('true');
    expect(rankInput?.getAttribute('aria-describedby')).toBe('militaryBackground.rank-error');
    expect(errorNode?.textContent).toBe('El rango es obligatorio');
  });

  it('disables controls when form is pending', () => {
    container = document.createElement('div');
    document.body.appendChild(container);

    root = createRoot(container);
    act(() => {
      root?.render(
        <MilitaryBackgroundForm
          values={{
            rank: '',
            area: '',
            yearsOfService: '',
            summary: '',
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
