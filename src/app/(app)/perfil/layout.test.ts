import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const PERFIL_LAYOUT_FILE_URL = new URL('./layout.tsx', import.meta.url);
const APP_LAYOUT_FILE_URL = new URL('../layout.tsx', import.meta.url);
const DASHBOARD_PAGE_FILE_URL = new URL('../dashboard/page.tsx', import.meta.url);

describe('perfil segment dynamic contract', () => {
  it('defines dynamic force-dynamic only at perfil segment', async () => {
    const [perfilLayoutSource, appLayoutSource, dashboardPageSource] = await Promise.all([
      readFile(PERFIL_LAYOUT_FILE_URL, 'utf8'),
      readFile(APP_LAYOUT_FILE_URL, 'utf8'),
      readFile(DASHBOARD_PAGE_FILE_URL, 'utf8'),
    ]);

    expect(perfilLayoutSource).toContain("export const dynamic = 'force-dynamic';");
    expect(appLayoutSource).not.toContain("export const dynamic = 'force-dynamic';");
    expect(dashboardPageSource).not.toContain("export const dynamic = 'force-dynamic';");
  });
});
