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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses and normalizes payload before delegating to server layer', async () => {
    await saveDraftAction({
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
    });

    expect(saveProfileMock).not.toHaveBeenCalled();
  });

  it('propagates server/domain failures without reclassifying as validation', async () => {
    saveProfileMock.mockRejectedValueOnce(new Error('db write failed'));

    await expect(
      saveDraftAction({
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
    ).rejects.toMatchObject({
      kind: 'domain',
      name: 'ProfileActionError',
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
