import { describe, expect, it, vi } from 'vitest';
import { saveDraftAction } from './save-profile-action';

const { saveProfileMock } = vi.hoisted(() => ({
  saveProfileMock: vi.fn(),
}));

vi.mock('@/features/profile/server/save-profile', () => ({
  saveProfile: saveProfileMock,
}));

describe('saveDraftAction contract', () => {
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
});
