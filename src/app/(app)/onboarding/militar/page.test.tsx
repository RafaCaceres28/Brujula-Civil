import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('/onboarding/militar guided controls', () => {
  it('renders catalog-based controls for structured fields and keeps narrative fields available', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/app/(app)/onboarding/militar/page.tsx'),
      'utf8',
    );

    expect(source).toContain('CatalogSingleSelect');
    expect(source).toContain('name="branch"');
    expect(source).toContain('name="corps"');
    expect(source).toContain('name="rankCode"');
    expect(source).toContain('name="specialtyCode"');
    expect(source).toContain('name="destinationContext"');
    expect(source).toContain('name="leadershipLevel"');
    expect(source).toContain('name="teamSize"');
    expect(source).not.toContain('<Input id="branch"');
    expect(source).toContain('name="unitName"');
    expect(source).toContain('name="notes"');
  });
});
