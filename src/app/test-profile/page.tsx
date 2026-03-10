// TEMP TEST PAGE

import { createClient } from '@/lib/supabase/server';

export default async function TestProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return <pre>No hay usuario autenticado</pre>;
  }

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from('app_user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingProfileError) {
    return (
      <pre>{JSON.stringify({ step: 'buscar perfil', error: existingProfileError }, null, 2)}</pre>
    );
  }

  if (!existingProfile) {
    const { data: insertedProfile, error: insertError } = await supabase
      .from('app_user_profiles')
      .insert({
        user_id: user.id,
        email: user.email,
        display_name: user.email ?? 'Usuario',
      })
      .select()
      .single();

    return (
      <pre>
        {JSON.stringify(
          {
            step: 'perfil creado',
            user,
            insertedProfile,
            insertError,
          },
          null,
          2,
        )}
      </pre>
    );
  }

  return (
    <pre>
      {JSON.stringify(
        {
          step: 'perfil ya existía',
          user,
          existingProfile,
        },
        null,
        2,
      )}
    </pre>
  );
}
