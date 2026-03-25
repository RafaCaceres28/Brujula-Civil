import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('/onboarding/objetivos guided controls', () => {
  it('uses catalog controls for structured preferences and keeps notes as narrative textarea', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/app/(app)/onboarding/objetivos/page.tsx'),
      'utf8',
    );

    expect(source).toContain('CatalogMultiSelect');
    expect(source).toContain('CatalogSingleSelect');
    expect(source).toContain('name="targetRoles"');
    expect(source).toContain('name="targetSectors"');
    expect(source).toContain('name="preferredLocations"');
    expect(source).toContain('name="workModel"');
    expect(source).toContain('name="seniority"');
    expect(source).not.toContain('<Textarea id="targetRoles"');
    expect(source).not.toContain('<Textarea id="targetSectors"');
    expect(source).not.toContain('<Textarea id="preferredLocations"');
    expect(source).toContain('name="preferencesNotes"');
  });

  it('keeps free text only in preferencesNotes', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/app/(app)/onboarding/objetivos/page.tsx'),
      'utf8',
    );

    expect(source).toContain('id="preferencesNotes"');

    expect(source).not.toContain('<Textarea id="targetRoles"');
    expect(source).not.toContain('<Textarea id="targetSectors"');
    expect(source).not.toContain('<Textarea id="preferredLocations"');
    expect(source).not.toContain('<Textarea id="workModel"');
    expect(source).not.toContain('<Textarea id="seniority"');

    expect(source).not.toContain('<Input id="targetRoles"');
    expect(source).not.toContain('<Input id="targetSectors"');
    expect(source).not.toContain('<Input id="preferredLocations"');
    expect(source).not.toContain('<Input id="workModel"');
    expect(source).not.toContain('<Input id="seniority"');
  });
});
