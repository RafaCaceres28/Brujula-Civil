//redirect si ya hay usuario

import { redirect } from 'next/navigation';
import { getCurrentUser } from './get-current-user';

export async function redirectIfAuthenticated() {
  const user = await getCurrentUser();

  if (user) {
    redirect('/dashboard');
  }
}
