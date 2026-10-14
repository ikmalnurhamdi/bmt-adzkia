import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { parseRole, type Role } from "./roles"

export interface ProxySession {
  response: NextResponse
  authenticated: boolean
  role: Role | null
}

/**
 * Menyegarkan sesi Supabase di setiap request dan membaca peran dari JWT.
 *
 * Memakai `getClaims()`: tanda tangan JWT diverifikasi (bukan sekadar membaca cookie),
 * namun tanpa round-trip ke server Auth bila project memakai signing key asimetris.
 */
export async function readSession(request: NextRequest): Promise<ProxySession> {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims ?? null

  return {
    response,
    authenticated: !!claims,
    role: parseRole(claims?.app_metadata?.role),
  }
}

/** Redirect yang tetap membawa cookie sesi yang baru disegarkan. */
export function redirectWith(request: NextRequest, path: string, source: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(new URL(path, request.url))
  source.cookies.getAll().forEach((c) => redirect.cookies.set(c))
  return redirect
}
