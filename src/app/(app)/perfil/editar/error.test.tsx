import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PerfilEditarErrorBoundary from './error';

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
    root?.render(
      <PerfilEditarErrorBoundary error={new Error('profile edit read failed')} reset={reset} />,
    );
  });

  return {
    reset,
    retryButton: container.querySelector('button'),
  };
}

describe('perfil/editar/error.tsx', () => {
  it('renders controlled fallback content for runtime errors', () => {
    renderErrorComponent();

    expect(container?.textContent).toContain('No pudimos cargar el editor de perfil');
    expect(container?.textContent).toContain(
      'Ocurrio un error al preparar la pantalla de edicion. Intenta nuevamente en unos segundos.',
    );
    expect(container?.textContent).toContain('Referencia: profile edit read failed');
  });

  it('calls reset when user clicks retry', () => {
    const { reset, retryButton } = renderErrorComponent();

    act(() => {
      retryButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
