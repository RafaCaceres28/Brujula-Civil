import { createServerClient } from '@supabase/ssr';
import { getSupabasePublicEnv } from './lib/supabase/env';
import { sanitizeNext } from './lib/supabase/auth';
import { routes } from './lib/constants/routes';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_ROUTES: readonly string[] = [
  routes.marketing.home,
  routes.marketing.howItWorks,
  routes.marketing.pricing,
  routes.marketing.contact,
];

const AUTH_ROUTES: readonly string[] = [
  routes.auth.login,
  routes.auth.register,
  routes.auth.forgotPassword,
  routes.auth.callback,
];

const PRIVATE_ROUTE_PREFIXES: readonly string[] = [
  routes.app.dashboard,
  routes.app.profile,
  routes.app.settings,
  routes.app.onboarding,
  routes.app.cv,
  routes.app.linkedin,
  routes.app.translation,
];

export type ProxyDecision = 'allow' | 'redirect-login' | 'redirect-dashboard';

export function getSafeRedirectedFrom(pathname: string, search: string): string {
  return sanitizeNext(`${pathname}${search}`, routes.app.dashboard);
}

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.includes(pathname);
}

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.includes(pathname);
}

function isPrivateRoute(pathname: string) {
  return PRIVATE_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function resolveProxyDecision(pathname: string, isAuthenticated: boolean): ProxyDecision {
  if (isPublicRoute(pathname)) {
    return 'allow';
  }

  if (isPrivateRoute(pathname) && !isAuthenticated) {
    return 'redirect-login';
  }

  if (isAuthRoute(pathname) && isAuthenticated) {
    return 'redirect-dashboard';
  }

  return 'allow';
}

export async function proxy(request: NextRequest) {
  const { url, anonKey } = getSupabasePublicEnv();
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // No metas lógica entre createServerClient y getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const decision = resolveProxyDecision(pathname, Boolean(user));

  if (decision === 'redirect-login') {
    const url = request.nextUrl.clone();
    url.pathname = routes.auth.login;
    const redirectedFrom = getSafeRedirectedFrom(pathname, request.nextUrl.search);
    if (redirectedFrom !== routes.app.dashboard) {
      url.searchParams.set('redirectedFrom', redirectedFrom);
    }
    return NextResponse.redirect(url);
  }

  if (decision === 'redirect-dashboard') {
    const url = request.nextUrl.clone();
    url.pathname = routes.app.dashboard;
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Aplica proxy a todo excepto:
     * - api
     * - _next/static
     * - _next/image
     * - favicon.ico
     * - archivos comunes estáticos
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)',
  ],
};
