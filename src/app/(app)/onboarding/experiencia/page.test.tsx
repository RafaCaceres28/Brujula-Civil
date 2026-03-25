import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('/onboarding/experiencia guided controls', () => {
  it('uses catalog controls for structured fields and keeps textarea for narratives', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/app/(app)/onboarding/experiencia/page.tsx'),
      'utf8',
    );

    expect(source).toContain('CatalogMultiSelect');
    expect(source).toContain('name="responsibilityAreas"');
    expect(source).toContain('name="missionTypes"');
    expect(source).toContain('name="functionTypes"');
    expect(source).toContain('name="tools"');
    expect(source).toContain('name="leadershipScopes"');
    expect(source).toContain('name="achievements"');
    expect(source).toContain('name="additionalContext"');
    expect(source).not.toContain('<Textarea id="responsibilityAreas"');
    expect(source).not.toContain('<Textarea id="missionTypes"');
    expect(source).not.toContain('<Textarea id="functionTypes"');
  });

  it('keeps free text only in achievements and additionalContext', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/app/(app)/onboarding/experiencia/page.tsx'),
      'utf8',
    );

    expect(source).toContain('id="achievements"');
    expect(source).toContain('id="additionalContext"');

    expect(source).not.toContain('<Textarea id="responsibilityAreas"');
    expect(source).not.toContain('<Textarea id="missionTypes"');
    expect(source).not.toContain('<Textarea id="functionTypes"');
    expect(source).not.toContain('<Textarea id="tools"');
    expect(source).not.toContain('<Textarea id="leadershipScopes"');

    expect(source).toContain('CatalogMultiSelect');
    expect(source).toContain('name="responsibilityAreas"');
    expect(source).toContain('name="missionTypes"');
    expect(source).toContain('name="functionTypes"');
    expect(source).toContain('name="tools"');
    expect(source).toContain('name="leadershipScopes"');
  });
});
