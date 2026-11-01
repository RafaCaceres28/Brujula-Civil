import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createClient } from '@/lib/supabase/server';
import { readContactDetails, saveContactDetails } from './contact-details';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

// Explicit opt-in: never read .env.local or connect to a linked/hosted project.
describe.skipIf(process.env.CONTACT_DETAILS_LOCAL_TEST !== '1')(
  '007.5f real Supabase LOCAL',
  () => {
    let admin: SupabaseClient;
    let owner: SupabaseClient;
    let other: SupabaseClient;
    let ownerId: string;
    let otherId: string;
    let anonKey: string;
    const createdIds: string[] = [];
    const options = {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    };

    beforeAll(async () => {
      const status = JSON.parse(
        execFileSync('pnpm', ['exec', 'supabase', 'status', '--output', 'json'], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        }),
      ) as Record<string, string>;
      if (status.API_URL !== 'http://127.0.0.1:54321')
        throw new Error('Only the configured localhost Supabase is allowed');
      if (!status.ANON_KEY || !status.SERVICE_ROLE_KEY)
        throw new Error('Missing local test credentials');
      anonKey = status.ANON_KEY;
      admin = createSupabaseClient(status.API_URL, status.SERVICE_ROLE_KEY, options);
      const clients: SupabaseClient[] = [];
      for (let index = 0; index < 2; index++) {
        const email = `contact-0075f-${randomUUID()}@example.test`;
        const password = randomUUID();
        const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
        if (created.error || !created.data.user)
          throw new Error('Could not create synthetic local user');
        createdIds.push(created.data.user.id);
        const client = createSupabaseClient(status.API_URL, status.ANON_KEY, options);
        const login = await client.auth.signInWithPassword({ email, password });
        if (login.error) throw new Error('Could not authenticate synthetic local user');
        clients.push(client);
      }
      [owner, other] = clients;
      [ownerId, otherId] = createdIds;
      vi.mocked(createClient).mockResolvedValue(owner as never);
    }, 30000);

    afterAll(async () => {
      for (const id of createdIds) {
        const result = await admin.auth.admin.deleteUser(id);
        if (result.error) throw new Error('Could not clean up synthetic local user');
      }
    });

    it('has exactly three nullable text additions without defaults, and a recorded CLI migration', () => {
      const sql =
        "SELECT column_name || ':' || data_type || ':' || is_nullable || ':' || coalesce(column_default, '<none>') FROM information_schema.columns WHERE table_schema='public' AND table_name='app_user_profiles' AND column_name IN ('phone','contact_email','locality_province') ORDER BY column_name; SELECT version || ':' || name FROM supabase_migrations.schema_migrations WHERE version='20261101195347'; SELECT relrowsecurity FROM pg_class WHERE oid='public.app_user_profiles'::regclass; SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='app_user_profiles';";
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
        'contact_email:text:YES:<none>',
        'locality_province:text:YES:<none>',
        'phone:text:YES:<none>',
        '20261101195347:contact_details',
        't',
        '4',
      ]);
    });

    it('creates only the canonical base, persists across clients, preserves unrelated fields and rejects stale writes', async () => {
      expect(await readContactDetails(ownerId)).toEqual({ ok: true, data: null });
      const first = await saveContactDetails(ownerId, {
        expected: null,
        set: {
          display_name: ' Persona de prueba ',
          phone: ' +34 (600) 100-200 ',
          contact_email: ' trabajo@example.test ',
          locality_province: ' Sevilla, Sevilla ',
        },
      });
      expect(first).toEqual({
        ok: true,
        data: {
          display_name: 'Persona de prueba',
          phone: '+34 (600) 100-200',
          contact_email: 'trabajo@example.test',
          locality_province: 'Sevilla, Sevilla',
        },
      });
      if (!first.ok) throw new Error('save failed');
      const before = await admin
        .from('app_user_profiles')
        .select('*')
        .eq('user_id', ownerId)
        .single();
      expect(before.error).toBeNull();
      expect(before.data?.email).toBeNull();
      const session = await owner.auth.getSession();
      const fresh = createSupabaseClient('http://127.0.0.1:54321', anonKey, options);
      if (!session.data.session) throw new Error('missing session');
      await fresh.auth.setSession(session.data.session);
      vi.mocked(createClient).mockResolvedValue(fresh as never);
      expect(await readContactDetails(ownerId)).toEqual(first);

      const competing = await Promise.all([
        saveContactDetails(ownerId, { expected: first.data, set: { phone: '111 222 333' } }),
        saveContactDetails(ownerId, { expected: first.data, set: { phone: '444 555 666' } }),
      ]);
      expect(competing.filter((result) => result.ok)).toHaveLength(1);
      expect(
        competing.filter((result) => !result.ok && result.error.code === 'CONFLICT'),
      ).toHaveLength(1);
      const current = await readContactDetails(ownerId);
      if (!current.ok || !current.data) throw new Error('read failed');
      expect(
        await saveContactDetails(ownerId, {
          expected: null,
          set: { display_name: 'Competing insert' },
        }),
      ).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
      expect(
        await saveContactDetails(ownerId, {
          expected: first.data,
          set: { contact_email: 'stale@example.test' },
        }),
      ).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });

      // A legacy name change invalidates even a phone-only contact edit.
      expect(
        (
          await admin
            .from('app_user_profiles')
            .update({ display_name: 'Nombre compartido' })
            .eq('user_id', ownerId)
        ).error,
      ).toBeNull();
      expect(
        await saveContactDetails(ownerId, { expected: current.data, set: { phone: '123' } }),
      ).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
      const renamed = await readContactDetails(ownerId);
      if (!renamed.ok || !renamed.data) throw new Error('read failed');
      expect(
        await saveContactDetails(ownerId, {
          expected: renamed.data,
          set: { phone: '', contact_email: ' ', locality_province: null },
        }),
      ).toEqual({
        ok: true,
        data: {
          display_name: 'Nombre compartido',
          phone: null,
          contact_email: null,
          locality_province: null,
        },
      });
      const after = await admin
        .from('app_user_profiles')
        .select('*')
        .eq('user_id', ownerId)
        .single();
      for (const key of [
        'user_id',
        'email',
        'locale',
        'timezone',
        'onboarding_completed',
        'marketing_opt_in',
        'created_at',
      ])
        expect(after.data?.[key]).toEqual(before.data?.[key]);
      for (const table of ['user_wizard_state', 'user_military_profiles', 'user_civil_profiles']) {
        const result = await admin.from(table).select('user_id').eq('user_id', ownerId);
        expect(result.error).toBeNull();
        expect(result.data).toEqual([]);
      }
    });

    it('enforces real owner RLS for reads, inserts and updates', async () => {
      vi.mocked(createClient).mockResolvedValue(other as never);
      expect(await readContactDetails(ownerId)).toEqual({ ok: true, data: null });
      expect(
        await saveContactDetails(ownerId, {
          expected: {
            display_name: 'Nombre compartido',
            phone: null,
            contact_email: null,
            locality_province: null,
          },
          set: { phone: '999' },
        }),
      ).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
      const illegalInsert = await other
        .from('app_user_profiles')
        .insert({ user_id: ownerId, phone: '999' });
      expect(illegalInsert.error).not.toBeNull();
      const own = await saveContactDetails(otherId, { expected: null, set: { phone: '777' } });
      expect(own).toMatchObject({ ok: true, data: { phone: '777', contact_email: null } });
      const original = await admin
        .from('app_user_profiles')
        .select('phone')
        .eq('user_id', ownerId)
        .single();
      expect(original.data?.phone).toBeNull();
    });
  },
);
