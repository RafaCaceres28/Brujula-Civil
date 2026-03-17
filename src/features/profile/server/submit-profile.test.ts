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
  it('rejects tampered payload before evaluating transition rules', async () => {
    await expect(
      submitProfile(
        {
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
        } as unknown as typeof validSubmitInput,
        'submitted',
      ),
    ).rejects.toThrow('militaryBackground.rank is required for submit');
  });

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
