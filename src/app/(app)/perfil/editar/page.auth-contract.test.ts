import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const PAGE_FILE_URL = new URL('./page.tsx', import.meta.url);

describe('perfil/editar auth architecture contract', () => {
  it('keeps auth authority centralized in (app)/layout and blocks local guard duplication', async () => {
    const pageSource = await readFile(PAGE_FILE_URL, 'utf8');

    expect(pageSource).toContain('getRequiredUser');
    expect(pageSource).not.toContain('getCurrentUser');
    expect(pageSource).not.toContain('layout guard');
    expect(pageSource).not.toMatch(/\brequireUser\s*\(/);
    expect(pageSource).not.toMatch(/\bthrow\s+new\s+Error\s*\(/);
    expect(pageSource).not.toMatch(/\bredirect\s*\(/);
    expect(pageSource).not.toMatch(/\bcreateServerClient\s*\(/);
  });
});
