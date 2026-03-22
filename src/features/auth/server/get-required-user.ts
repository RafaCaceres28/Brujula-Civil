import { cache } from 'react';
import { requireUser } from './require-user';

export const getRequiredUser = cache(async (redirectedFrom?: string) => {
  return requireUser(redirectedFrom);
});
