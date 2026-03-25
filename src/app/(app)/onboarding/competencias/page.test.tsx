import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('/onboarding/competencias guided controls', () => {
  it('replaces structured textareas with catalog controls including languages compound values', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/app/(app)/onboarding/competencias/page.tsx'),
      'utf8',
    );

    expect(source).toContain('CatalogMultiSelect');
    expect(source).toContain('name="technicalSkills"');
    expect(source).toContain('name="softSkills"');
    expect(source).toContain('name="certifications"');
    expect(source).toContain('name="drivingLicenses"');
    expect(source).toContain('name="officeTools"');
    expect(source).toContain('name="languages"');
    expect(source).toContain('LANGUAGE_COMPOUND_OPTIONS');
    expect(source).not.toContain('<Textarea id="technicalSkills"');
    expect(source).not.toContain('<Textarea id="languages"');
    expect(source).toContain('name="extraTraining"');
  });
});
