/**
 * Model hak akses AMANAH.
 *
 * Satu login, dua aplikasi. Peran disimpan di `app_metadata.role` pada JWT Supabase
 * (hanya bisa diubah lewat SQL / service role, TIDAK bisa diubah oleh user sendiri).
 *
 *   admin -> boleh membuka BMT ADZKIA dan MTs ADZKIA MOBILE
 *   bmt   -> hanya BMT ADZKIA
 *   mts   -> hanya MTs ADZKIA MOBILE
 *
 * Penegakan sebenarnya ada di database (Row Level Security, lihat script/001_roles_security.sql).
 * Pengecekan di proxy & layout hanya untuk pengalaman pengguna dan lapisan pertahanan tambahan.
 */
export const APPS = ["bmt", "mts"] as const
export type AppKey = (typeof APPS)[number]

export const ROLES = ["admin", "bmt", "mts"] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrator",
  bmt: "Pengurus BMT",
  mts: "Pengurus MTs",
}

export const ROLE_BADGE: Record<Role, string> = {
  admin: "AD",
  bmt: "PB",
  mts: "PM",
}

/** Validasi nilai mentah dari JWT agar tidak ada role "liar" yang lolos. */
export function parseRole(value: unknown): Role | null {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value) ? (value as Role) : null
}

export function canAccess(role: Role | null, app: AppKey): boolean {
  return role === "admin" || role === app
}

/** Halaman awal untuk tiap peran. */
export function homeFor(role: Role | null): string {
  switch (role) {
    case "bmt":
      return "/bmt"
    case "mts":
      return "/mts"
    case "admin":
      return "/"
    default:
      return "/akses-ditolak"
  }
}

/** Aplikasi mana yang sedang dibuka berdasarkan path URL. */
export function appFromPath(path: string): AppKey | null {
  if (path === "/bmt" || path.startsWith("/bmt/")) return "bmt"
  if (path === "/mts" || path.startsWith("/mts/")) return "mts"
  return null
}
