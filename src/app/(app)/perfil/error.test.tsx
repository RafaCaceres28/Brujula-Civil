import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PerfilErrorBoundary from './error';

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

function renderErrorComponent(reset = vi.fn()) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root?.render(<PerfilErrorBoundary error={new Error('network timeout')} reset={reset} />);
  });

  return {
    reset,
    retryButton: container.querySelector('button'),
  };
}

describe('perfil/error.tsx', () => {
  it('renders controlled fallback content for runtime errors', () => {
    renderErrorComponent();

    expect(container?.textContent).toContain('No pudimos cargar tu perfil');
    expect(container?.textContent).toContain(
      'Ocurrio un error al recuperar los datos. Intenta nuevamente en unos segundos.',
    );
    expect(container?.textContent).toContain('Referencia: network timeout');
  });

  it('calls reset when user clicks retry', () => {
    const { reset, retryButton } = renderErrorComponent();

    act(() => {
      retryButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
