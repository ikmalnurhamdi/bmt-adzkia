import { getSupabase } from "@/lib/supabase"
import { konfirmasi } from "@/lib/alert"

/** Konfirmasi lalu keluar. Muat penuh agar cookie sesi terhapus dan proxy membaca ulang. */
export async function logout(): Promise<void> {
  if (!(await konfirmasi("Keluar Aplikasi?", "Sesi Anda akan berakhir.", "Ya, Keluar"))) return
  await getSupabase().auth.signOut()
  window.location.href = "/login"
}
