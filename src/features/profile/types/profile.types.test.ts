import type {
  ProfileActionErrorKind,
  AppUserProfileInsert,
  CivilProfileInsert,
  CivilProfileUpdate,
  SaveDraftActionResult,
  MilitaryProfileInsert,
  MilitaryProfileUpdate,
  ProfileReadOutput,
  ProfileFormValues,
  ProfileLifecycleStatus,
  ProfileSummaryCardProps,
  ProfileSummaryViewModel,
  ProfileSummaryVisualState,
  ProfileRow,
  ProfileSupabaseShape,
  SaveDraftInput,
  SaveProfileInput,
  SubmitProfileActionResult,
  SubmitProfileInput,
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
    expectTypeOf<ProfileRow>().toMatchTypeOf<{ userId: string; profile: ProfileFormValues }>();
    expectTypeOf<ProfileRow>().toEqualTypeOf<ProfileReadOutput>();
  });

  it('keeps form and use-case boundaries aligned', () => {
    expectTypeOf<SaveProfileInput['profile']>().toEqualTypeOf<ProfileFormValues>();
    expectTypeOf<SaveDraftInput>().toEqualTypeOf<SaveProfileInput>();
    expectTypeOf<SubmitProfileInput['profile']>().toEqualTypeOf<ProfileFormValues>();
    expectTypeOf<SaveProfileInput>().toMatchTypeOf<{ militaryBackground: object }>();
    expectTypeOf<ProfileSupabaseShape>().not.toEqualTypeOf<SaveProfileInput>();
  });

  it('exposes lifecycle status union for explicit transitions', () => {
    expectTypeOf<ProfileLifecycleStatus>().toEqualTypeOf<'draft' | 'submitted'>();
  });

  it('keeps summary card contract aligned with summary view model', () => {
    expectTypeOf<ProfileSummaryVisualState>().toEqualTypeOf<'completo' | 'parcial' | 'vacio'>();
    expectTypeOf<ProfileSummaryCardProps['summary']>().toEqualTypeOf<ProfileSummaryViewModel>();
    expectTypeOf<ProfileSummaryCardProps['state']>().toEqualTypeOf<
      ProfileSummaryVisualState | undefined
    >();
  });

  it('defines explicit action result and error contracts', () => {
    expectTypeOf<SaveDraftActionResult>().toEqualTypeOf<{
      status: 'draft';
      militaryProfileId: string;
      civilProfileId: string;
      operationMode: 'created' | 'updated' | 'mixed';
    }>();
    expectTypeOf<SubmitProfileActionResult>().toEqualTypeOf<{
      status: 'draft' | 'submitted';
    }>();
    expectTypeOf<ProfileActionErrorKind>().toEqualTypeOf<'validation' | 'domain'>();
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
    };

    const row: ProfileRow = {
      userId: 'user-1',
      profile: {
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: '+34123456789',
        city: 'Madrid',
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
    };

    const persistenceShape: ProfileSupabaseShape = {
      app: null,
      military: null,
      civil: null,
    };

    expectTypeOf(input.userId).toEqualTypeOf<string>();
    expectTypeOf(row.profile.email).toEqualTypeOf<string>();
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
