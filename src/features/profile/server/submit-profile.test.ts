import { describe, expect, it } from 'vitest';
import { submitProfile } from './submit-profile';

const validSubmitInput = {
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

describe('submitProfile transition', () => {
  it('allows explicit draft to submitted transition', async () => {
    await expect(submitProfile(validSubmitInput, 'draft')).resolves.toEqual({
      status: 'submitted',
    });
  });

  it('rejects invalid transition when origin is not draft', async () => {
    await expect(submitProfile(validSubmitInput, 'submitted')).rejects.toThrow(
      'Invalid profile status transition',
    );
  });
});
