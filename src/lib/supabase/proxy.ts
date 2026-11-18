import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/env";

/** Rutas que se pueden ver sin iniciar sesión. */
const PUBLIC_PATHS = ["/", "/login", "/registro", "/privacidad"];
const AUTH_PAGES = ["/login", "/registro"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/auth/");
}

/**
 * Renueva la sesión en cada petición y protege las rutas privadas.
 * La seguridad de los datos no depende de esto: RLS la aplica la base.
 */
export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // No poner código entre createServerClient y getClaims: renueva el token.
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    if (path === "/login") url.searchParams.set("next", pathname + search);
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (!isLoggedIn && !isPublicPath(pathname)) return redirectTo("/login");
  if (isLoggedIn && AUTH_PAGES.includes(pathname)) return redirectTo("/dashboard");

  return response;
}
