import { describe, expect, it } from 'vitest';
import { mapProfileToTranslationSnapshot } from '../../profile/services/profile.mapper';
import { profileDomainFixture } from './__fixtures__/contract-fixtures';
import { generateTranslation } from './generate-translation';

describe('profile -> translation contract', () => {
  it('builds professional translation blocks with source traceability', async () => {
    const profileSnapshot = mapProfileToTranslationSnapshot(profileDomainFixture);

    const result = await generateTranslation({
      userId: profileDomainFixture.userId,
      sourceProfile: profileSnapshot,
      sourceLanguage: 'es-ES',
      targetLanguage: 'en-US',
      tone: 'formal',
      selectedRouteId: 'route-operations-coordinator-logistics-mid',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected translation generation success');
    }

    expect(result.data.blocks.length).toBeGreaterThan(0);
    expect(result.data.blocks[0]?.sourceRef).toBe(profileSnapshot.snapshotId);
    expect(result.data.sourceRefMap[result.data.blocks[0]!.id]).toBe(profileSnapshot.snapshotId);
    expect(result.data.selectedRouteId).toBe('route-operations-coordinator-logistics-mid');
  });
});
