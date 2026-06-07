import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";

const PUBLIC_PATHS = ["/", "/login", "/auth"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Refreshes the Supabase auth session on every request and gates private routes.
 * Must run in middleware so cookies are written before the response is sent.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run code between createServerClient and the auth check.
  //
  // Fast path: verify the access token's claims locally (no Auth-server round
  // trip when the project uses asymmetric JWT signing keys). Only fall back to
  // getUser() — which contacts the Auth server AND refreshes the session,
  // writing rotated cookies — when the token is missing or close to expiring.
  // This removes a network hop from the vast majority of requests at scale.
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const expMs = typeof claims?.exp === "number" ? claims.exp * 1000 : 0;
  const tokenHealthy = !!claims?.sub && expMs - Date.now() > 60_000;

  let userId: string | null = tokenHealthy ? (claims!.sub as string) : null;
  if (!tokenHealthy) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  }

  const { pathname } = request.nextUrl;

  if (!userId && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
