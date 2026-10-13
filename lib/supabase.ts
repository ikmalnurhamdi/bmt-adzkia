import { createBrowserClient } from "@supabase/ssr"

let client: ReturnType<typeof createBrowserClient> | null = null

/**
 * Satu instance Supabase browser client untuk seluruh aplikasi.
 * Cookie sesi dikelola otomatis agar middleware bisa membaca status login.
 */
export const getSupabase = () => {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) console.error("Supabase URL / Anon Key belum diisi di .env.local")
    client = createBrowserClient(url!, key!)
  }
  return client
}