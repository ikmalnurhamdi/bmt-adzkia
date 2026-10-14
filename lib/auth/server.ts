import { cache } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { canAccess, homeFor, parseRole, type AppKey, type Role } from "./roles"

export interface SessionUser {
  id: string
  email: string
  role: Role | null
}

/** Pengguna yang sudah lolos pengecekan akses (role pasti ada). */
export type AuthorizedUser = SessionUser & { role: Role }

/**
 * Pengguna aktif di sisi server (dipakai layout / server component).
 * `cache` membuat pemanggilan berulang pada satu request hanya diverifikasi sekali.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        // Server Component tidak boleh menulis cookie; penyegaran sesi sudah dilakukan proxy.
        setAll: () => {},
      },
    }
  )

  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims) return null

  return {
    id: claims.sub,
    email: claims.email ?? "",
    role: parseRole(claims.app_metadata?.role),
  }
})

/**
 * Lapisan pertahanan kedua setelah proxy: layout tiap aplikasi memanggil ini,
 * sehingga akses tetap terblokir walau proxy terlewati.
 */
export async function requireApp(app: AppKey): Promise<AuthorizedUser> {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  if (!user.role || !canAccess(user.role, app)) redirect(homeFor(user.role))
  return { ...user, role: user.role }
}
