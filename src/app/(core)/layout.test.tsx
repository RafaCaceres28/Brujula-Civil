// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppLayout from '../(app)/layout';
import CoreLayout from './layout';

const mocks = vi.hoisted(() => ({ user: vi.fn(), bootstrap: vi.fn() }));
vi.mock('@/features/auth/server/get-required-user', () => ({ getRequiredUser: mocks.user }));
vi.mock('@/features/profile/server/ensure-user-bootstrap', () => ({
  ensureUserBootstrap: mocks.bootstrap,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ id: 'user-001' });
  mocks.bootstrap.mockResolvedValue(undefined);
});

describe('layouts protegidos conservan shell y separan bootstrap', () => {
  it('la ruta tiene un solo page y sus ancestros/helpers no acceden al wizard', () => {
    expect(existsSync(resolve('src/app/(app)/traduccion/page.tsx'))).toBe(false);
    expect(existsSync(resolve('src/app/(core)/traduccion/page.tsx'))).toBe(true);
    for (const path of [
      'src/app/layout.tsx',
      'src/app/(core)/layout.tsx',
      'src/app/(core)/traduccion/page.tsx',
      'src/app/(core)/traduccion/loading.tsx',
      'src/components/layout/app-shell.tsx',
      'src/components/layout/app-header.tsx',
      'src/components/layout/app-sidebar.tsx',
      'src/components/layout/page-shell.tsx',
      'src/components/layout/section-header.tsx',
      'src/features/auth/server/get-required-user.ts',
      'src/features/auth/server/require-user.ts',
      'src/features/auth/server/get-current-user.ts',
      'src/proxy.ts',
    ]) {
      const source = readFileSync(resolve(path), 'utf8');
      expect(source, path).not.toMatch(
        /ensureUserBootstrap|user_wizard_state|\.from\(|getProfile|getOnboardingOverview|resolveRecommendationState|generateTranslation|generateCv|TranslationPreview|CareerRouteShortlist/,
      );
    }
  });

  it('core autentica y renderiza shell real sin bootstrap', async () => {
    const html = renderToStaticMarkup(await CoreLayout({ children: 'core content' }));
    expect(mocks.user).toHaveBeenCalledExactlyOnceWith('/traduccion');
    expect(mocks.bootstrap).not.toHaveBeenCalled();
    expect(html).toContain('core content');
    expect(html).toContain('href="/traduccion"');
    expect(html.match(/<main/g)).toHaveLength(1);
    expect(html.match(/<aside/g)).toHaveLength(1);
    expect(html.match(/<header/g)).toHaveLength(1);
  });

  it('app conserva auth antes del bootstrap y el mismo shell visual', async () => {
    const app = renderToStaticMarkup(await AppLayout({ children: 'content' }));
    expect(mocks.user).toHaveBeenCalledExactlyOnceWith();
    expect(mocks.bootstrap).toHaveBeenCalledExactlyOnceWith('user-001');
    expect(mocks.user.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.bootstrap.mock.invocationCallOrder[0],
    );
    const core = renderToStaticMarkup(await CoreLayout({ children: 'content' }));
    expect(app).toBe(core);
    expect(mocks.bootstrap).toHaveBeenCalledTimes(1);
  });

  it.each(['core', 'app'])('%s no renderiza ni inicia bootstrap si falla auth', async (group) => {
    const signal = new Error('NEXT_REDIRECT');
    mocks.user.mockRejectedValue(signal);
    await expect((group === 'core' ? CoreLayout : AppLayout)({ children: 'secret' })).rejects.toBe(
      signal,
    );
    expect(mocks.bootstrap).not.toHaveBeenCalled();
  });

  it('app sigue propagando fallos de bootstrap', async () => {
    mocks.bootstrap.mockRejectedValue(new Error('bootstrap failed'));
    await expect(AppLayout({ children: 'secret' })).rejects.toThrow('bootstrap failed');
  });
});
