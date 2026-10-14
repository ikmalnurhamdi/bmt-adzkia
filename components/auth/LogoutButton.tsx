"use client"

import { LogOut } from "lucide-react"
import { getSupabase } from "@/lib/supabase"

/** Tombol keluar tanpa dialog konfirmasi (untuk halaman pemilih aplikasi & akses ditolak). */
export default function LogoutButton({ className }: { className?: string }) {
  const keluar = async () => {
    await getSupabase().auth.signOut()
    window.location.href = "/login"
  }

  return (
    <button
      onClick={keluar}
      className={
        className ??
        "inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
      }
    >
      <LogOut size={14} /> Keluar
    </button>
  )
}
