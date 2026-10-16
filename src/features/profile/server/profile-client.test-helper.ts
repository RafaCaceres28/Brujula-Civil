import { isDeepStrictEqual } from 'node:util';

type Row = Record<string, unknown>;
type Operation = 'select' | 'update' | 'insert' | 'upsert';

export function profileClientFixture(raw: unknown = {}) {
  const rows: Record<string, Row[]> = {
    user_military_profiles:
      raw === undefined
        ? []
        : [{ id: 'mil-1', user_id: 'user-1', is_current: true, raw_profile_jsonb: raw }],
    user_civil_profiles: [],
    app_user_profiles: [],
    user_wizard_state: [{ user_id: 'user-1', aggregated_draft_jsonb: {} }],
  };
  const calls: Array<{ table: string; operation: Operation; filters: Row; payload?: Row }> = [];
  const control = {
    beforeUpdate: undefined as (() => Promise<void>) | undefined,
    beforeInsert: undefined as (() => Promise<void>) | undefined,
    error: undefined as { table: string; operation: Operation; code?: string } | undefined,
    zeroRows: false,
  };
  let sequence = 0;
  const client = {
    from(table: string) {
      const build = (operation: Operation, payload?: Row) => {
        const filters: Row = {};
        let rawFilter: unknown;
        const execute = async () => {
          calls.push({ table, operation, filters: { ...filters }, payload });
          if (control.error?.table === table && control.error.operation === operation) {
            return {
              data: null,
              error: { code: control.error.code ?? 'XX000', message: 'private provider details' },
            };
          }
          const matches = (row: Row) =>
            Object.entries(filters).every(
              ([key, value]) => key === 'rawGuard' || row[key] === value,
            ) &&
            (rawFilter === undefined || isDeepStrictEqual(row.raw_profile_jsonb, rawFilter));
          if (operation === 'select') {
            return { data: structuredClone(rows[table].filter(matches)), error: null };
          }
          if (operation === 'update') {
            const hook = control.beforeUpdate;
            control.beforeUpdate = undefined;
            await hook?.();
            const matched = control.zeroRows ? [] : rows[table].filter(matches);
            matched.forEach((row) => Object.assign(row, structuredClone(payload)));
            return { data: matched.map((row) => ({ id: row.id })), error: null };
          }
          if (operation === 'insert') {
            const hook = control.beforeInsert;
            control.beforeInsert = undefined;
            await hook?.();
            if (rows[table].some((row) => row.user_id === payload?.user_id && row.is_current)) {
              return { data: null, error: { code: '23505', message: 'unique' } };
            }
            const row = { id: `new-${++sequence}`, ...structuredClone(payload) };
            rows[table].push(row);
            return { data: [row], error: null };
          }
          rows[table].push(structuredClone(payload!));
          return { data: [], error: null };
        };
        const builder = {
          eq(key: string, value: unknown) {
            filters[key] = value;
            return builder;
          },
          filter(key: string, operator: string, value: string) {
            if (key !== 'raw_profile_jsonb' || operator !== 'eq')
              throw new Error('Unexpected filter');
            rawFilter = JSON.parse(value);
            filters.rawGuard = structuredClone(rawFilter);
            return builder;
          },
          select() {
            return builder;
          },
          order() {
            return builder;
          },
          async limit() {
            return execute();
          },
          async maybeSingle() {
            const result = await execute();
            return { ...result, data: result.data?.[0] ?? null };
          },
          async single() {
            return builder.maybeSingle();
          },
          then(
            resolve: (value: Awaited<ReturnType<typeof execute>>) => unknown,
            reject?: (error: unknown) => unknown,
          ) {
            return execute().then(resolve, reject);
          },
        };
        return builder;
      };
      return {
        select: () => build('select'),
        update: (payload: Row) => build('update', payload),
        insert: (payload: Row) => build('insert', payload),
        upsert: (payload: Row) => build('upsert', payload),
      };
    },
  };
  return { client, rows, calls, control };
}
