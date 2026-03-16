import { describe, expect, it } from 'vitest';
import {
  profileReadOutputSchema,
  saveDraftInputSchema,
  submitProfileInputSchema,
} from './profile.schema';

describe('profile.schema boundaries', () => {
  it('normalizes and accepts full save payload for base, military and civilian sections', () => {
    const parsed = saveDraftInputSchema.parse({
      userId: 'user-1',
      profile: {
        fullName: '  Ada Lovelace  ',
        email: '  ADA@EXAMPLE.COM  ',
        phone: '  +34123456789  ',
        city: '  Madrid  ',
      },
      militaryBackground: {
        rank: '  Captain  ',
        area: '  Signals  ',
        yearsOfService: 10,
        summary: '  Experience in operations  ',
      },
      civilianTarget: {
        targetRole: '  Operations Manager  ',
        targetSector: '  Logistics  ',
        locationPreference: '  Hybrid  ',
      },
    });

    expect(parsed).toEqual({
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
        yearsOfService: 10,
        summary: 'Experience in operations',
      },
      civilianTarget: {
        targetRole: 'Operations Manager',
        targetSector: 'Logistics',
        locationPreference: 'Hybrid',
      },
    });
  });

  it('excludes mixed-boundary persistence fields from save payload', () => {
    const parsed = saveDraftInputSchema.parse({
      userId: 'user-1',
      profile: {
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: '+34123456789',
        city: 'Madrid',
        military_profile_id: 'mil-1',
        version_no: 2,
      },
      status: 'draft',
      militaryBackground: {
        rank: 'Captain',
        area: 'Signals',
        yearsOfService: 8,
        summary: 'Leadership',
        raw_profile_jsonb: { ignored: true },
      },
      civilianTarget: {
        targetRole: 'Operations Manager',
        targetSector: 'Logistics',
        locationPreference: 'Remote',
        version_no: 3,
      },
    });

    expect(parsed).toEqual({
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
        yearsOfService: 8,
        summary: 'Leadership',
      },
      civilianTarget: {
        targetRole: 'Operations Manager',
        targetSector: 'Logistics',
        locationPreference: 'Remote',
      },
    });
  });

  it('normalizes optional empty strings to null', () => {
    const parsed = saveDraftInputSchema.parse({
      userId: 'user-1',
      profile: {
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: '   ',
        city: '',
      },
      militaryBackground: {
        rank: '',
        area: '   ',
        yearsOfService: null,
        summary: '',
      },
      civilianTarget: {
        targetRole: '',
        targetSector: '',
        locationPreference: ' ',
      },
    });

    expect(parsed.profile.phone).toBeNull();
    expect(parsed.profile.city).toBeNull();
    expect(parsed.militaryBackground.rank).toBeNull();
    expect(parsed.militaryBackground.area).toBeNull();
    expect(parsed.militaryBackground.summary).toBeNull();
    expect(parsed.civilianTarget.targetRole).toBeNull();
    expect(parsed.civilianTarget.targetSector).toBeNull();
    expect(parsed.civilianTarget.locationPreference).toBeNull();
  });

  it('rejects empty required fields after normalization', () => {
    expect(() =>
      saveDraftInputSchema.parse({
        userId: 'user-1',
        profile: {
          fullName: '   ',
          email: '   ',
          phone: null,
          city: null,
        },
      }),
    ).toThrowError();
  });

  it('rejects yearsOfService outside 0..60 range', () => {
    expect(() =>
      saveDraftInputSchema.parse({
        userId: 'user-1',
        profile: {
          fullName: 'Ada Lovelace',
          email: 'ada@example.com',
          phone: null,
          city: null,
        },
        militaryBackground: {
          rank: null,
          area: null,
          yearsOfService: 61,
          summary: null,
        },
      }),
    ).toThrowError();
  });

  it('accepts backward-compatible payload omitting military and civilian sections', () => {
    const parsed = saveDraftInputSchema.parse({
      userId: 'user-1',
      profile: {
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: '+34123456789',
        city: 'Madrid',
      },
    });

    expect(parsed.militaryBackground).toEqual({
      rank: null,
      area: null,
      yearsOfService: null,
      summary: null,
    });
    expect(parsed.civilianTarget).toEqual({
      targetRole: null,
      targetSector: null,
      locationPreference: null,
    });
  });

  it('parses read contract and fills missing optional values with nulls', () => {
    const parsed = profileReadOutputSchema.parse({
      userId: 'user-1',
      profile: {
        fullName: ' Ada Lovelace ',
        email: ' ADA@EXAMPLE.COM ',
      },
      militaryBackground: {},
      civilianTarget: {},
    });

    expect(parsed).toEqual({
      userId: 'user-1',
      profile: {
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: null,
        city: null,
      },
      militaryBackground: {
        rank: null,
        area: null,
        yearsOfService: null,
        summary: null,
      },
      civilianTarget: {
        targetRole: null,
        targetSector: null,
        locationPreference: null,
      },
    });
  });

  it('rejects phone values with visual separators', () => {
    expect(() =>
      saveDraftInputSchema.parse({
        userId: 'user-1',
        profile: {
          fullName: 'Ada Lovelace',
          email: 'ada@example.com',
          phone: '+34 123-456-789',
          city: 'Madrid',
        },
      }),
    ).toThrowError();
  });

  it('rejects phone values without plus prefix', () => {
    expect(() =>
      saveDraftInputSchema.parse({
        userId: 'user-1',
        profile: {
          fullName: 'Ada Lovelace',
          email: 'ada@example.com',
          phone: '34123456789',
          city: 'Madrid',
        },
      }),
    ).toThrowError();
  });

  it('rejects submit payload when required completion fields are missing', () => {
    expect(() =>
      submitProfileInputSchema.parse({
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
          yearsOfService: 8,
          summary: 'Leadership',
        },
        civilianTarget: {
          targetRole: null,
          targetSector: 'Logistics',
          locationPreference: 'Remote',
        },
      }),
    ).toThrowError();
  });
});
