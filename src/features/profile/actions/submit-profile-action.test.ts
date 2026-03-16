import { describe, expect, it, vi } from 'vitest';
import { submitProfileAction } from './submit-profile-action';

const { submitProfileMock } = vi.hoisted(() => ({
  submitProfileMock: vi.fn(),
}));

vi.mock('@/features/profile/server/submit-profile', () => ({
  submitProfile: submitProfileMock,
}));

describe('submitProfileAction contract', () => {
  it('delegates only to submitProfile with validated submit payload', async () => {
    await submitProfileAction({
      userId: 'user-1',
      profile: {
        fullName: '  Ada Lovelace  ',
        email: '  ADA@EXAMPLE.COM  ',
        phone: '  +34123456789  ',
        city: ' Madrid ',
      },
      militaryBackground: {
        rank: ' Captain ',
        area: ' Signals ',
        yearsOfService: 7,
        summary: 'Led teams',
      },
      civilianTarget: {
        targetRole: ' Operations Manager ',
        targetSector: ' Logistics ',
        locationPreference: ' Remote ',
      },
    });

    expect(submitProfileMock).toHaveBeenCalledTimes(1);
    expect(submitProfileMock).toHaveBeenCalledWith({
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
    });
  });

  it('fails fast on invalid submit payload', async () => {
    await expect(
      submitProfileAction({
        userId: 'user-1',
        profile: {
          fullName: 'Ada Lovelace',
          email: 'ada@example.com',
          phone: '+34 123-456-789',
          city: 'Madrid',
        },
        militaryBackground: {
          rank: null,
          area: 'Signals',
          yearsOfService: 7,
          summary: null,
        },
        civilianTarget: {
          targetRole: null,
          targetSector: 'Logistics',
          locationPreference: 'Remote',
        },
      }),
    ).rejects.toThrowError();

    expect(submitProfileMock).not.toHaveBeenCalled();
  });
});
