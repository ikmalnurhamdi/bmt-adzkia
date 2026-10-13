"use client"

import { useState } from "react"
import Image from "next/image"
import { Lock, Mail, Eye, EyeOff, Loader2 } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { fail } from "@/lib/alert"
import { APP_NAME } from "@/lib/config"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const { data, error } = await getSupabase().auth.signInWithPassword({ email, password })
      if (error) {
        await fail("Email atau password salah. Silakan periksa kembali.", "Login Gagal")
        setIsLoading(false)
      } else if (data.session) {
        // Muat penuh agar cookie sesi terbaca middleware
        window.location.href = "/"
      }
    } catch {
      await fail("Terjadi gangguan koneksi. Coba lagi nanti.", "Kesalahan Sistem")
      setIsLoading(false)
    }
  }

  const fieldIcon = "absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-sky-500 transition-colors z-10"
  const fieldInput =
    "w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-sky-50 focus:bg-white focus:border-sky-500 transition-all text-sm text-slate-900 font-medium"

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-sky-50 flex items-center justify-center p-4">
      <div className="bg-white shadow-xl rounded-3xl p-8 w-full max-w-md border border-white fade-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-sky-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-sky-200 border-4 border-white">
            <Image src="/logo.png" alt="Logo" width={48} height={48} className="object-contain" priority />
          </div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase text-center">{APP_NAME}</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Rekap Keuangan Sekolah</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email</label>
            <div className="relative group">
              <Mail size={16} className={fieldIcon} />
              <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required className={fieldInput} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Kata Sandi</label>
            <div className="relative group">
              <Lock size={16} className={fieldIcon} />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`${fieldInput} pr-12`}
              />
              <button
                type="button"
                aria-label={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-sky-600 transition-colors z-20 p-1"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300 text-white font-bold py-3 rounded-2xl shadow-lg shadow-sky-100 transition-all active:scale-[0.98] flex justify-center items-center gap-2 text-sm tracking-wide"
          >
            {isLoading ? (<><Loader2 className="animate-spin" size={18} /><span>Verifikasi...</span></>) : "Masuk"}
          </button>
        </form>

        <p className="mt-8 pt-6 border-t border-slate-50 text-center text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">
          Digitalisasi {APP_NAME}
        </p>
      </div>
    </div>
  )
}