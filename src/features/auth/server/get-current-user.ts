// Devuelve el usuario autenticado actual o null.

import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}
