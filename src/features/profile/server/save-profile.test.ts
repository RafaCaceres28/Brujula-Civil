import { describe, expect, it } from 'vitest';
import { saveProfile } from './save-profile';

const validDraftInput = {
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
};

describe('saveProfile draft contract', () => {
  it('preserves draft status as observable server contract', async () => {
    await expect(saveProfile(validDraftInput)).resolves.toEqual({
      status: 'draft',
    });
  });
});
