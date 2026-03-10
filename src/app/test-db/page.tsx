import { createClient } from '@/lib/supabase/server';

export default async function TestDbPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.from('app_user_profiles').select('*').limit(5);

  return (
    <main className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Test DB</h1>
      <pre className="overflow-x-auto rounded border p-4 text-sm">
        {JSON.stringify({ data, error }, null, 2)}
      </pre>
    </main>
  );
}
