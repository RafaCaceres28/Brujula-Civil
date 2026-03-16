import { describe, expect, it } from 'vitest';
import { saveProfileInputSchema } from './profile.schema';

describe('profile.schema boundaries', () => {
  it('excludes mixed-boundary persistence fields from form payload', () => {
    const parsed = saveProfileInputSchema.parse({
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
    });

    expect(parsed).toEqual({
      userId: 'user-1',
      profile: {
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: '+34123456789',
        city: 'Madrid',
      },
    });
  });
});
