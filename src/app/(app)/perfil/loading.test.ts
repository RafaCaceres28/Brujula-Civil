import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import Loading from './loading';

vi.mock('@/components/layout/page-shell', () => ({
  PageShell: (props: { children: ReactNode }) => createElement('div', null, props.children),
}));

vi.mock('@/components/layout/section-header', () => ({
  SectionHeader: (props: { title: string; description?: string }) =>
    createElement('header', null, `${props.title}:${props.description ?? ''}`),
}));

describe('perfil/loading.tsx', () => {
  it('renders segment loading fallback with accessible status semantics', () => {
    const html = renderToStaticMarkup(createElement(Loading));

    expect(html).toContain('Cargando perfil...');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });
});
