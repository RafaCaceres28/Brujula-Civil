import { routes } from '../../../lib/constants/routes';
import { createClient } from '@/lib/supabase/server';
import { resolveSafeOrigin, sanitizeNext } from '../../../lib/supabase/auth';
import { NextResponse } from 'next/server';

const CALLBACK_ERROR_PARAM = 'authError';

function buildLoginErrorUrl(request: Request, errorCode: string): URL {
  const origin = resolveSafeOrigin(request);
  const loginUrl = new URL(routes.auth.login, origin);
  loginUrl.searchParams.set(CALLBACK_ERROR_PARAM, errorCode);
  return loginUrl;
}

export async function GET(request: Request) {
  const origin = resolveSafeOrigin(request);
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const destinationPath = sanitizeNext(requestUrl.searchParams.get('next'), routes.app.dashboard);

  if (!code) {
    return NextResponse.redirect(buildLoginErrorUrl(request, 'missing_code'));
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(buildLoginErrorUrl(request, 'auth_callback_failed'));
    }

    return NextResponse.redirect(new URL(destinationPath, origin));
  } catch {
    return NextResponse.redirect(buildLoginErrorUrl(request, 'auth_callback_failed'));
  }
}
