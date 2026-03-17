import { describe, expect, it } from 'vitest';
import { submitProfileAction } from './submit-profile-action';

describe('submitProfileAction -> submitProfile integration', () => {
  it('transitions draft payload to submitted through real server use case', async () => {
    await expect(
      submitProfileAction({
        userId: 'user-1',
        profile: {
          fullName: 'Ada Lovelace',
          email: 'ada@example.com',
          phone: '+34123456789',
          city: 'Madrid',
        },
        militaryBackground: {
          rank: 'Captain',
          area: 'Signals',
          yearsOfService: 7,
          summary: 'Led teams',
        },
        civilianTarget: {
          targetRole: 'Operations Manager',
          targetSector: 'Logistics',
          locationPreference: 'Remote',
        },
      }),
    ).resolves.toEqual({ status: 'submitted' });
  });

  it('returns validation classification and never reaches transition on invalid submit fields', async () => {
    await expect(
      submitProfileAction({
        userId: 'user-1',
        profile: {
          fullName: 'Ada Lovelace',
          email: 'ada@example.com',
          phone: '+34123456789',
          city: 'Madrid',
        },
        militaryBackground: {
          rank: null,
          area: 'Signals',
          yearsOfService: 7,
          summary: 'Led teams',
        },
        civilianTarget: {
          targetRole: null,
          targetSector: 'Logistics',
          locationPreference: 'Remote',
        },
      }),
    ).rejects.toMatchObject({
      kind: 'validation',
      name: 'ProfileActionError',
    });
  });
});
