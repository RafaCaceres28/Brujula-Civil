// redirect si no hay usuario

import { routes } from '../../../lib/constants/routes';
import { redirect } from 'next/navigation';
import { getCurrentUser } from './get-current-user';

export async function requireUser(redirectedFrom?: string) {
  const user = await getCurrentUser();

  if (!user) {
    const loginUrl = new URL(routes.auth.login, 'http://localhost');

    if (redirectedFrom) {
      loginUrl.searchParams.set('redirectedFrom', redirectedFrom);
    }

    redirect(`${loginUrl.pathname}${loginUrl.search}`);
  }

  return user;
}
