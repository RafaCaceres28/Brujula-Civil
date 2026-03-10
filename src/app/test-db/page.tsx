// TEMP TEST PAGE

import { createClient } from '@/lib/supabase/server';

export default async function TestDbPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return <pre>No hay usuario autenticado</pre>;
  }

  const { data, error } = await supabase
    .from('app_user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <pre>
      {JSON.stringify(
        {
          user,
          profile: data,
          error,
        },
        null,
        2,
      )}
    </pre>
  );
}
