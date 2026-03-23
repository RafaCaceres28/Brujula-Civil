import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileActionError } from '../types/profile.types';
import { saveDraftAction, saveProfileAction } from './save-profile-action';

const { saveProfileMock } = vi.hoisted(() => ({
  saveProfileMock: vi.fn(),
}));

vi.mock('../server/save-profile', () => ({
  saveProfile: saveProfileMock,
}));

describe('saveDraftAction contract', () => {
  const validDraftPayload = {
    userId: 'user-1',
    profile: {
      fullName: '  Ada Lovelace  ',
      email: '  ADA@EXAMPLE.COM  ',
      phone: '  ',
      city: ' Madrid ',
      version_no: 3,
    },
    militaryBackground: {
      rank: '  Captain ',
      area: '  Signals ',
      yearsOfService: 7,
      summary: '  Led teams ',
      raw_profile_jsonb: { keepOut: true },
    },
    civilianTarget: {
      targetRole: '  Operations Manager  ',
      targetSector: '  Logistics  ',
      locationPreference: '  Remote  ',
    },
    status: 'draft',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses and normalizes payload before delegating to server layer', async () => {
    saveProfileMock.mockResolvedValueOnce({
      status: 'draft',
      militaryProfileId: 'mil-1',
      civilProfileId: 'civ-1',
      operationMode: 'created',
    });

    await expect(saveDraftAction(validDraftPayload)).resolves.toEqual({
      status: 'draft',
      militaryProfileId: 'mil-1',
      civilProfileId: 'civ-1',
      operationMode: 'created',
    });

    expect(saveProfileMock).toHaveBeenCalledTimes(1);
    expect(saveProfileMock).toHaveBeenCalledWith({
      userId: 'user-1',
      profile: {
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: null,
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

  it('fails fast with validation error and does not delegate invalid payload', async () => {
    await expect(
      saveDraftAction({
        userId: '',
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
    ).rejects.toMatchObject({
      kind: 'validation',
      name: 'ProfileActionError',
      message: 'Invalid profile draft input',
    });

    expect(saveProfileMock).not.toHaveBeenCalled();
  });

  it('preserves domain error message when server throws a typed domain error', async () => {
    saveProfileMock.mockRejectedValueOnce({
      code: 'CONFLICT',
      message: 'Profile draft already exists',
      retryable: false,
    });

    await expect(saveDraftAction(validDraftPayload)).rejects.toMatchObject({
      kind: 'domain',
      name: 'ProfileActionError',
      message: 'Profile draft already exists',
    });
  });

  it('keeps legacy alias saveProfileAction mapped to saveDraftAction', () => {
    expect(saveProfileAction).toBe(saveDraftAction);
  });

  it('exposes action error type for callers', () => {
    const error = new ProfileActionError('validation', 'Invalid profile draft input');

    expect(error.kind).toBe('validation');
    expect(error.name).toBe('ProfileActionError');
  });
});
