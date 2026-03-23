import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import {
  TranslationPreview,
  type TranslationPreviewProps,
} from '../../../features/translation/components/translation-preview';

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

function renderContent(props: TranslationPreviewProps) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root?.render(<TranslationPreview {...props} />);
  });
}

describe('/traduccion page UI states', () => {
  it('renders loading state with user-facing progress message', () => {
    renderContent({ state: 'loading' });

    const status = container?.querySelector<HTMLElement>('[role="status"]');

    expect(status?.textContent).toContain(
      'Estamos preparando la traduccion y el primer preview del CV.',
    );
  });

  it('renders empty state with actionable profile completion link', () => {
    renderContent({ state: 'empty', retryHref: '/perfil' });

    const link = container?.querySelector<HTMLAnchorElement>('a[href="/perfil"]');

    expect(container?.textContent).toContain('No hay datos suficientes');
    expect(link?.textContent).toContain('Reintentar');
  });

  it('renders safe error state without internal details and with retry action', () => {
    renderContent({
      state: 'error',
      retryHref: '/traduccion',
      error: {
        code: 'INTERNAL_ERROR',
        message: 'supabase timeout with stack trace',
      },
    });

    const alert = container?.querySelector<HTMLElement>('[role="alert"]');
    const retryLink = container?.querySelector<HTMLAnchorElement>('a[href="/traduccion"]');

    expect(alert?.textContent).toContain(
      'No pudimos completar la traduccion por ahora. Intenta nuevamente.',
    );
    expect(alert?.textContent).not.toContain('supabase timeout with stack trace');
    expect(retryLink?.textContent).toContain('Reintentar');
  });
});
