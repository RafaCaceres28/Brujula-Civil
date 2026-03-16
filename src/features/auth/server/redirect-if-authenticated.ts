// redirect si ya hay usuario

import { routes } from '../../../lib/constants/routes';
import { redirect } from 'next/navigation';
import { getCurrentUser } from './get-current-user';

export async function redirectIfAuthenticated() {
  const user = await getCurrentUser();

  if (user) {
    redirect(routes.app.dashboard);
  }
}
