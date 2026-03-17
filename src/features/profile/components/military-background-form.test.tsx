import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MilitaryBackgroundForm,
  type MilitaryBackgroundFormErrors,
  type MilitaryBackgroundFormProps,
} from './military-background-form';

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
  errors = { rank: 'El rango es obligatorio' },
  disabled = false,
}: {
  onChangeSpy?: (event: unknown) => void;
  errors?: MilitaryBackgroundFormErrors;
  disabled?: boolean;
} = {}) {
  container = document.createElement('div');
  document.body.appendChild(container);

  root = createRoot(container);
  const onChange: MilitaryBackgroundFormProps['onChange'] = (event) => {
    onChangeSpy(event);
  };
  act(() => {
    root?.render(
      <MilitaryBackgroundForm
        values={{
          rank: '',
          area: '',
          yearsOfService: '',
          summary: '',
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

  it('emits field-scoped change events for military fields', async () => {
    const onChangeSpy = vi.fn();
    renderForm({ onChangeSpy, errors: {} });

    await changeInput('militaryBackground.rank', 'Capitan');
    await changeInput('militaryBackground.yearsOfService', '12');

    expect(onChangeSpy).toHaveBeenNthCalledWith(1, { field: 'rank', value: 'Capitan' });
    expect(onChangeSpy).toHaveBeenNthCalledWith(2, {
      field: 'yearsOfService',
      value: '12',
    });
  });

  it('removes aria-describedby and stale error nodes after correction', () => {
    renderForm({ errors: { rank: 'El rango es obligatorio' } });

    const rankInput = container?.querySelector<HTMLInputElement>(
      '[name="militaryBackground.rank"]',
    );
    expect(rankInput?.getAttribute('aria-describedby')).toBe('militaryBackground.rank-error');
    expect(document.getElementById('militaryBackground.rank-error')).not.toBeNull();

    act(() => {
      const onChange: MilitaryBackgroundFormProps['onChange'] = () => undefined;
      root?.render(
        <MilitaryBackgroundForm
          values={{
            rank: 'Capitan',
            area: '',
            yearsOfService: '',
            summary: '',
          }}
          errors={{}}
          onChange={onChange}
        />,
      );
    });

    const updatedRankInput = container?.querySelector<HTMLInputElement>(
      '[name="militaryBackground.rank"]',
    );
    expect(updatedRankInput?.getAttribute('aria-describedby')).toBeNull();
    expect(document.getElementById('militaryBackground.rank-error')).toBeNull();
  });

  it('disables controls when form is pending', () => {
    renderForm({ errors: {}, disabled: true });

    const fieldset = container?.querySelector('fieldset');
    expect(fieldset?.disabled).toBe(true);
  });
});
