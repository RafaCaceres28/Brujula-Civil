import { beforeEach, describe, expect, it, vi } from 'vitest';
import { submitProfileAction } from './submit-profile-action';

const { submitProfileMock } = vi.hoisted(() => ({
  submitProfileMock: vi.fn(),
}));

vi.mock('../server/submit-profile', () => ({
  submitProfile: submitProfileMock,
}));

describe('submitProfileAction contract', () => {
  const validSubmitPayload = {
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates only to submitProfile with validated submit payload', async () => {
    submitProfileMock.mockResolvedValueOnce({ status: 'submitted' });

    await expect(submitProfileAction(validSubmitPayload)).resolves.toEqual({ status: 'submitted' });

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
    ).rejects.toMatchObject({
      kind: 'validation',
      name: 'ProfileActionError',
      message: 'Invalid profile submit input',
    });

    expect(submitProfileMock).not.toHaveBeenCalled();
  });

  it('preserves domain error message when server throws a typed domain error', async () => {
    submitProfileMock.mockRejectedValueOnce({
      code: 'EXTERNAL_DEPENDENCY_ERROR',
      message: 'Translation provider unavailable',
      retryable: true,
    });

    await expect(submitProfileAction(validSubmitPayload)).rejects.toMatchObject({
      kind: 'domain',
      name: 'ProfileActionError',
      message: 'Translation provider unavailable',
    });
  });
});
