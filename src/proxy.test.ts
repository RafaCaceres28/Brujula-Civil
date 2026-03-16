import { describe, expect, it } from 'vitest';
import { getSafeRedirectedFrom, resolveProxyDecision } from './proxy';

describe('proxy route matrix', () => {
  it('applies anonymous/authenticated policy for public, auth and private routes', () => {
    expect(resolveProxyDecision('/', false)).toBe('allow');
    expect(resolveProxyDecision('/', true)).toBe('allow');

    expect(resolveProxyDecision('/login', false)).toBe('allow');
    expect(resolveProxyDecision('/login', true)).toBe('redirect-dashboard');

    expect(resolveProxyDecision('/dashboard', false)).toBe('redirect-login');
    expect(resolveProxyDecision('/dashboard', true)).toBe('allow');
  });

  it('handles private route prefixes consistently', () => {
    expect(resolveProxyDecision('/perfil/editar', false)).toBe('redirect-login');
    expect(resolveProxyDecision('/traduccion/resultado', true)).toBe('allow');
  });

  it('redirects authenticated users on auth routes to avoid redirect loops', () => {
    expect(resolveProxyDecision('/login', true)).toBe('redirect-dashboard');
    expect(resolveProxyDecision('/registro', true)).toBe('redirect-dashboard');
    expect(resolveProxyDecision('/recuperar-password', true)).toBe('redirect-dashboard');
  });

  it('keeps redirectedFrom internal and canonical', () => {
    expect(getSafeRedirectedFrom('/dashboard', '?tab=overview')).toBe('/dashboard?tab=overview');
    expect(getSafeRedirectedFrom('//evil.com', '')).toBe('/dashboard');
  });
});
