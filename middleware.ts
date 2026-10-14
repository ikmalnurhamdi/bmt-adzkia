import type { NextRequest } from "next/server"
import { appFromPath, canAccess, homeFor } from "@/lib/auth/roles"
import { readSession, redirectWith } from "@/lib/auth/proxy-session"

/**
 * Gerbang akses terpusat AMANAH.
 *
 *  - Belum login            -> /login
 *  - Sudah login di /login  -> halaman awal sesuai peran
 *  - /bmt/**                -> hanya peran bmt & admin
 *  - /mts/**                -> hanya peran mts & admin
 *  - Login tanpa peran      -> /akses-ditolak
 *
 * Data tetap dilindungi Row Level Security di database; ini lapisan UX + pertahanan awal.
 */
export async function middleware(request: NextRequest) {
  const { response, authenticated, role } = await readSession(request)
  const path = request.nextUrl.pathname

  if (!authenticated) {
    return path === "/login" ? response : redirectWith(request, "/login", response)
  }

  if (path === "/login") {
    return redirectWith(request, homeFor(role), response)
  }

  const app = appFromPath(path)
  if (app && !canAccess(role, app)) {
    return redirectWith(request, homeFor(role), response)
  }

  // Pengguna tanpa peran hanya boleh melihat halaman "akses ditolak".
  if (!role && path !== "/akses-ditolak") {
    return redirectWith(request, "/akses-ditolak", response)
  }

  return response
}

export const config = {
  matcher: [
    // Kecualikan aset statis agar tidak membebani middleware
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|webmanifest)$).*)",
  ],
}
