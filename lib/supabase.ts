import { createBrowserClient } from '@supabase/ssr'

// 1. Ambil kredensial dari environment variables (.env.local)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 2. Validasi sederhana untuk memastikan .env.local sudah terisi
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Peringatan: Supabase URL atau Anon Key belum disetting di .env.local")
}

/**
 * Fungsi getSupabase
 * Menggunakan createBrowserClient agar Supabase otomatis mengelola
 * cookie di browser, sehingga Middleware bisa mendeteksi status login.
 */
let supabaseClient: any = null

export const getSupabase = () => {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient(
      supabaseUrl!,
      supabaseAnonKey!
    )
  }
  return supabaseClient
}