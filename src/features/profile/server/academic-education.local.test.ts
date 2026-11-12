import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createClient } from '@/lib/supabase/server';
import { readAcademicEducation, saveAcademicEducation } from './academic-education';
import { saveContactDetails } from './contact-details';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

describe.skipIf(process.env.ACADEMIC_EDUCATION_LOCAL_TEST !== '1')(
  '007.5g real Supabase LOCAL',
  () => {
    let admin: SupabaseClient;
    let owner: SupabaseClient;
    let other: SupabaseClient;
    let anon: SupabaseClient;
    let ownerId: string;
    let otherId: string;
    let anonKey: string;
    let ownerEmail: string;
    let ownerPassword: string;
    const createdIds: string[] = [];
    const options = {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    };
    const first = {
      id: 'study-1',
      title: 'Primero',
      institution: 'Centro',
      year: 2020,
      status: 'completed' as const,
    };
    const second = {
      id: 'study-2',
      title: 'Segundo',
      institution: null,
      year: 2030,
      status: 'in_progress' as const,
    };
    const contacts = {
      display_name: 'Persona local',
      phone: '+34 600 100 200',
      contact_email: 'trabajo@example.test',
      locality_province: 'Sevilla',
    };

    beforeAll(async () => {
      // Credentials stay in memory and come only from the existing localhost stack.
      const status = JSON.parse(
        execFileSync('pnpm', ['exec', 'supabase', 'status', '--output', 'json'], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        }),
      ) as Record<string, string>;
      if (
        status.API_URL !== 'http://127.0.0.1:54321' ||
        !status.ANON_KEY ||
        !status.SERVICE_ROLE_KEY
      )
        throw new Error('Only configured local Supabase is allowed');
      anonKey = status.ANON_KEY;
      admin = createSupabaseClient(status.API_URL, status.SERVICE_ROLE_KEY, options);
      anon = createSupabaseClient(status.API_URL, anonKey, options);
      const clients: SupabaseClient[] = [];
      for (let index = 0; index < 2; index++) {
        const email = `0075g-${randomUUID()}@example.test`;
        const password = randomUUID();
        const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
        if (created.error || !created.data.user)
          throw new Error('Could not create synthetic local user');
        createdIds.push(created.data.user.id);
        const client = createSupabaseClient(status.API_URL, anonKey, options);
        if ((await client.auth.signInWithPassword({ email, password })).error)
          throw new Error('Could not authenticate synthetic local user');
        clients.push(client);
        if (index === 0) {
          ownerEmail = email;
          ownerPassword = password;
        }
      }
      [owner, other] = clients;
      [ownerId, otherId] = createdIds;
      vi.mocked(createClient).mockResolvedValue(owner as never);
    }, 30000);

    afterAll(async () => {
      for (const id of createdIds) {
        if ((await admin.auth.admin.deleteUser(id)).error)
          throw new Error('Could not delete synthetic local user');
        const remaining = await admin.from('app_user_profiles').select('user_id').eq('user_id', id);
        if (remaining.error || remaining.data?.length !== 0)
          throw new Error('Synthetic profile cleanup failed');
        const remainingUser = await admin.auth.admin.getUserById(id);
        if (remainingUser.data.user) throw new Error('Synthetic auth cleanup failed');
      }
    });

    it('records only the nullable JSONB addition without default and keeps the four RLS policies', () => {
      const sql =
        "SELECT column_name || ':' || data_type || ':' || is_nullable || ':' || coalesce(column_default, '<none>') FROM information_schema.columns WHERE table_schema='public' AND table_name='app_user_profiles' AND column_name='academic_education_jsonb'; SELECT version || ':' || name FROM supabase_migrations.schema_migrations WHERE version='20261101211847'; SELECT relrowsecurity FROM pg_class WHERE oid='public.app_user_profiles'::regclass; SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='app_user_profiles';";
      const output = execFileSync(
        'docker',
        [
          'exec',
          'supabase_db_brujula-civil',
          'psql',
          '-U',
          'postgres',
          '-d',
          'postgres',
          '-XAt',
          '-v',
          'ON_ERROR_STOP=1',
          '-c',
          sql,
        ],
        { encoding: 'utf8' },
      );
      expect(output.trim().split('\n')).toEqual([
        'academic_education_jsonb:jsonb:YES:<none>',
        '20261101211847:academic_education',
        't',
        '4',
      ]);
    });

    it('preserves an old null collection, performs CRUD across a fresh login and leaves contacts byte-exact', async () => {
      expect(await readAcademicEducation(ownerId)).toEqual({ ok: true, data: null });
      // A contact save wins the missing-row race; education must not overwrite that row.
      vi.mocked(createClient).mockResolvedValueOnce({
        from: (table: string) => {
          const builder = owner.from(table);
          return {
            select: (columns: string) => ({
              eq: (column: string, value: string) => ({
                maybeSingle: async () => {
                  const result = await builder.select(columns).eq(column, value).maybeSingle();
                  expect(result.data).toBeNull();
                  expect(
                    await saveContactDetails(ownerId, { expected: null, set: contacts }),
                  ).toEqual({ ok: true, data: contacts });
                  return result;
                },
              }),
            }),
            insert: builder.insert.bind(builder),
          };
        },
      } as never);
      expect(
        await saveAcademicEducation(ownerId, { expected: null, academicEducation: [first] }),
      ).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
      const before = await owner
        .from('app_user_profiles')
        .select('*')
        .eq('user_id', ownerId)
        .single();
      expect(before.error).toBeNull();
      expect(before.data?.academic_education_jsonb).toBeNull();
      expect(await readAcademicEducation(ownerId)).toEqual({ ok: true, data: null });
      expect(
        await saveAcademicEducation(ownerId, {
          expected: null,
          academicEducation: [first, second],
        }),
      ).toEqual({ ok: true, data: [first, second] });
      const fresh = createSupabaseClient('http://127.0.0.1:54321', anonKey, options);
      if (
        (await fresh.auth.signInWithPassword({ email: ownerEmail, password: ownerPassword })).error
      )
        throw new Error('Fresh login failed');
      expect((await fresh.auth.getUser()).data.user?.id).toBe(ownerId);
      owner = fresh;
      vi.mocked(createClient).mockResolvedValue(owner as never);
      expect(await readAcademicEducation(ownerId)).toEqual({ ok: true, data: [first, second] });
      const edited = { ...first, title: 'Primero editado', institution: null, year: null };
      expect(
        await saveAcademicEducation(ownerId, {
          expected: [first, second],
          academicEducation: [edited, second],
        }),
      ).toEqual({ ok: true, data: [edited, second] });
      expect(
        await saveAcademicEducation(ownerId, {
          expected: [edited, second],
          academicEducation: [second],
        }),
      ).toEqual({ ok: true, data: [second] });
      expect(
        await saveAcademicEducation(ownerId, { expected: [second], academicEducation: [] }),
      ).toEqual({ ok: true, data: [] });
      expect(await readAcademicEducation(ownerId)).toEqual({ ok: true, data: [] });
      const after = await owner
        .from('app_user_profiles')
        .select('*')
        .eq('user_id', ownerId)
        .single();
      expect(after.error).toBeNull();
      for (const [key, value] of Object.entries(before.data ?? {})) {
        if (key !== 'academic_education_jsonb' && key !== 'updated_at')
          expect(after.data?.[key]).toEqual(value);
      }
      for (const table of ['user_wizard_state', 'user_military_profiles', 'user_civil_profiles']) {
        const result = await admin.from(table).select('user_id').eq('user_id', ownerId);
        expect(result.error).toBeNull();
        expect(result.data).toEqual([]);
      }
    });

    it('serializes concurrent same-baseline saves with a read barrier: one winner, one conflict', async () => {
      const competingClient = createSupabaseClient('http://127.0.0.1:54321', anonKey, options);
      if (
        (
          await competingClient.auth.signInWithPassword({
            email: ownerEmail,
            password: ownerPassword,
          })
        ).error
      )
        throw new Error('Competing login failed');
      let arrived = 0;
      let release!: () => void;
      const barrier = new Promise<void>((resolve) => {
        release = resolve;
      });
      // Only the read is delayed; updates run through the actual PostgREST/RLS client.
      for (const client of [owner, competingClient])
        vi.mocked(createClient).mockResolvedValueOnce({
          from: (table: string) => {
            const builder = client.from(table);
            return {
              select: (columns: string) => ({
                eq: (column: string, value: string) => ({
                  maybeSingle: async () => {
                    const result = await builder.select(columns).eq(column, value).maybeSingle();
                    if (++arrived === 2) release();
                    await barrier;
                    return result;
                  },
                }),
              }),
              update: builder.update.bind(builder),
            };
          },
        } as never);
      try {
        const results = await Promise.all([
          saveAcademicEducation(ownerId, { expected: [], academicEducation: [first] }),
          saveAcademicEducation(ownerId, { expected: [], academicEducation: [second] }),
        ]);
        expect(results.filter((result) => result.ok)).toHaveLength(1);
        expect(
          results.filter((result) => !result.ok && result.error.code === 'CONFLICT'),
        ).toHaveLength(1);
        vi.mocked(createClient).mockResolvedValue(owner as never);
        const winner = results.find((result) => result.ok)!;
        expect(await readAcademicEducation(ownerId)).toEqual(winner);
        expect(
          await saveAcademicEducation(ownerId, { expected: [], academicEducation: [] }),
        ).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
        const preserved = await owner
          .from('app_user_profiles')
          .select('display_name, phone, contact_email, locality_province')
          .eq('user_id', ownerId)
          .single();
        expect(preserved.error).toBeNull();
        expect(preserved.data).toEqual(contacts);
      } finally {
        vi.mocked(createClient).mockResolvedValue(owner as never);
      }
    });

    it('blocks corrupt storage without writes or silent empty fallback', async () => {
      expect(
        (
          await owner
            .from('app_user_profiles')
            .update({ academic_education_jsonb: [{ unknown: true }] })
            .eq('user_id', ownerId)
        ).error,
      ).toBeNull();
      expect(await readAcademicEducation(ownerId)).toMatchObject({
        ok: false,
        error: { code: 'INTERNAL_ERROR' },
      });
      expect(
        await saveAcademicEducation(ownerId, { expected: null, academicEducation: [] }),
      ).toMatchObject({ ok: false, error: { code: 'INTERNAL_ERROR' } });
      const stillCorrupt = await owner
        .from('app_user_profiles')
        .select('academic_education_jsonb')
        .eq('user_id', ownerId)
        .single();
      expect(stillCorrupt.data?.academic_education_jsonb).toEqual([{ unknown: true }]);
      expect(
        (
          await owner
            .from('app_user_profiles')
            .update({ academic_education_jsonb: null })
            .eq('user_id', ownerId)
        ).error,
      ).toBeNull();
    });

    it('enforces owner and anonymous RLS and creates only the missing academic base', async () => {
      vi.mocked(createClient).mockResolvedValue(other as never);
      expect(await readAcademicEducation(ownerId)).toEqual({ ok: true, data: null });
      const illegalUpdate = await other
        .from('app_user_profiles')
        .update({ academic_education_jsonb: [] })
        .eq('user_id', ownerId)
        .select('user_id');
      expect(illegalUpdate.error).toBeNull();
      expect(illegalUpdate.data).toEqual([]);
      expect(
        (
          await other
            .from('app_user_profiles')
            .insert({ user_id: ownerId, academic_education_jsonb: [] })
        ).error,
      ).not.toBeNull();
      const anonymousRead = await anon
        .from('app_user_profiles')
        .select('user_id')
        .eq('user_id', ownerId);
      expect(anonymousRead.data ?? []).toEqual([]);
      const anonymousUpdate = await anon
        .from('app_user_profiles')
        .update({ academic_education_jsonb: [] })
        .eq('user_id', ownerId)
        .select('user_id');
      expect(anonymousUpdate.data ?? []).toEqual([]);
      expect(
        (
          await anon
            .from('app_user_profiles')
            .insert({ user_id: otherId, academic_education_jsonb: [] })
        ).error,
      ).not.toBeNull();
      expect(
        await saveAcademicEducation(otherId, { expected: null, academicEducation: [second] }),
      ).toEqual({ ok: true, data: [second] });
      const created = await other
        .from('app_user_profiles')
        .select(
          'email, display_name, phone, contact_email, locality_province, onboarding_completed',
        )
        .eq('user_id', otherId)
        .single();
      expect(created.error).toBeNull();
      expect(created.data).toEqual({
        email: null,
        display_name: null,
        phone: null,
        contact_email: null,
        locality_province: null,
        onboarding_completed: false,
      });
      vi.mocked(createClient).mockResolvedValue(owner as never);
      expect(await readAcademicEducation(ownerId)).toEqual({ ok: true, data: null });
    });
  },
);
