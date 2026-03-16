import type {
  AppUserProfileInsert,
  CivilProfileInsert,
  CivilProfileUpdate,
  MilitaryProfileInsert,
  MilitaryProfileUpdate,
  ProfileFormValues,
  ProfileRow,
  ProfileSupabaseShape,
  SaveProfileInput,
} from './profile.types';
import type {
  AppUserProfileRow,
  UserCivilProfileRow,
  UserMilitaryProfileRow,
} from '@/types/database.types';
import { describe, expectTypeOf, it } from 'vitest';

type IsAny<T> = 0 extends 1 & T ? true : false;
type IsUnknown<T> =
  IsAny<T> extends true
    ? false
    : unknown extends T
      ? [T] extends [unknown]
        ? true
        : false
      : false;

describe('profile.types contracts', () => {
  it('keeps ProfileRow as a structured contract', () => {
    const profileRowCannotBeUnknown: IsUnknown<ProfileRow> = false;

    expectTypeOf(profileRowCannotBeUnknown).toEqualTypeOf<false>();
    expectTypeOf<ProfileRow>().toMatchTypeOf<{ userId: string }>();
  });

  it('keeps form and use-case boundaries aligned', () => {
    expectTypeOf<SaveProfileInput['profile']>().toEqualTypeOf<ProfileFormValues>();
    expectTypeOf<ProfileSupabaseShape>().not.toEqualTypeOf<SaveProfileInput>();
  });

  it('detects schema drift by enforcing DB-derived persistence aliases', () => {
    expectTypeOf<MilitaryProfileInsert>().toEqualTypeOf<
      Omit<UserMilitaryProfileRow, 'id' | 'created_at' | 'updated_at'>
    >();

    expectTypeOf<MilitaryProfileUpdate>().toEqualTypeOf<
      Partial<
        Omit<UserMilitaryProfileRow, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'is_current'>
      >
    >();

    expectTypeOf<CivilProfileInsert>().toEqualTypeOf<
      Omit<UserCivilProfileRow, 'id' | 'created_at' | 'updated_at'>
    >();

    expectTypeOf<CivilProfileUpdate>().toEqualTypeOf<
      Partial<
        Omit<
          UserCivilProfileRow,
          'id' | 'created_at' | 'updated_at' | 'user_id' | 'version_no' | 'is_current'
        >
      >
    >();

    expectTypeOf<AppUserProfileInsert>().toEqualTypeOf<
      Omit<
        AppUserProfileRow,
        | 'id'
        | 'created_at'
        | 'updated_at'
        | 'locale'
        | 'timezone'
        | 'onboarding_completed'
        | 'marketing_opt_in'
      > &
        Partial<
          Pick<
            AppUserProfileRow,
            'locale' | 'timezone' | 'onboarding_completed' | 'marketing_opt_in'
          >
        >
    >();
  });

  it('keeps the public profile type API stable for migration', () => {
    const input: SaveProfileInput = {
      userId: 'user-1',
      profile: {
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: '+34123456789',
        city: 'Madrid',
      },
    };

    const row: ProfileRow = {
      userId: 'user-1',
      email: 'ada@example.com',
      fullName: 'Ada Lovelace',
      phone: '+34123456789',
      city: 'Madrid',
      locale: 'es-ES',
      timezone: 'Europe/Madrid',
      military: {
        rank: null,
        area: null,
        yearsOfService: null,
        summary: null,
      },
      civil: {
        targetRole: null,
        targetSector: null,
        headline: null,
        summary: null,
        status: null,
      },
    };

    const persistenceShape: ProfileSupabaseShape = {
      app: null,
      military: null,
      civil: null,
    };

    expectTypeOf(input.userId).toEqualTypeOf<string>();
    expectTypeOf(row.civil.status).toEqualTypeOf<UserCivilProfileRow['status'] | null>();
    expectTypeOf(persistenceShape).toMatchTypeOf<ProfileSupabaseShape>();
  });

  it('supports partial migration without breaking profile facade contracts', () => {
    type GeneratedMilitaryRow = UserMilitaryProfileRow & { generator_meta?: string | null };

    const partiallyMigrated = {
      app: null,
      military: null as GeneratedMilitaryRow | null,
      civil: null,
    } satisfies ProfileSupabaseShape;

    expectTypeOf(partiallyMigrated).toMatchTypeOf<ProfileSupabaseShape>();
  });
});
