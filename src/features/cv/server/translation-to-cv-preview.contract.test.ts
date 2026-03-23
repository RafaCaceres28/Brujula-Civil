import { describe, expect, it } from 'vitest';
import { translationOutputFixture } from '../../translation/server/__fixtures__/contract-fixtures';
import { mapTranslationOutputToCvInput } from '../services/cv.mapper';
import { generateCv } from './generate-cv';

describe('translation -> cv preview contract', () => {
  it('composes cv sections preserving source block references', async () => {
    const cvInput = mapTranslationOutputToCvInput({
      userId: 'user-001',
      profileSnapshotId: 'profile-snapshot-user-001',
      translatedContent: translationOutputFixture,
      templateKey: 'single-column',
    });

    const result = await generateCv(cvInput);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected CV generation success');
    }

    expect(result.data.sections.length).toBeGreaterThan(0);
    expect(result.data.sections[0]?.sourceBlockIds).toContain('translation-block-1');
    expect(result.data.layout.templateKey).toBe('single-column');
  });
});
