"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { getSupabase } from "@/lib/supabase"
import { Lock, Mail, Eye, EyeOff, Loader2 } from "lucide-react"
import Swal from "sweetalert2"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()
  const supabase = getSupabase()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (supabaseError) {
        Swal.fire({
          icon: 'error',
          title: 'Login Gagal',
          text: 'Email atau password salah. Silakan periksa kembali.',
          confirmButtonColor: '#0284c7', // Sky-700
          heightAuto: false
        })
        setIsLoading(false)
      } else if (data.session) {
        window.location.href = "/"
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Kesalahan Sistem',
        text: 'Terjadi gangguan koneksi. Coba lagi nanti.',
        confirmButtonColor: '#0284c7',
        heightAuto: false
      })
      setIsLoading(false)
    }
  }

  return (
    // Background di luar card menjadi Biru Langit (Sky-100)
    <div className="min-h-screen bg-sky-100 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Ornamen Background (Opsional untuk estetika) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-sky-200 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white rounded-full blur-3xl opacity-40"></div>
      </div>

      {/* Card Wrapper */}
      <div className="bg-white shadow-xl rounded-3xl p-8 w-full max-w-md relative z-10 border border-white">
        
        {/* Header & Logo */}
        <div className="flex flex-col items-center mb-8">
          {/* Kotak Logo menjadi Biru Langit (Sky-500) */}
          <div className="w-20 h-20 bg-sky-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-sky-200 border-4 border-white">
            <Image src="/logo.png" alt="Logo" width={48} height={48} className="object-contain" />
          </div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase">LOGIN BMT ADZKIA</h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Email
            </label>
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-sky-500 transition-colors z-10">
                <Mail size={16} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-sky-50 focus:bg-white focus:border-sky-500 transition-all text-sm text-slate-900 font-medium"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Kata Sandi
            </label>
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-sky-500 transition-colors z-10">
                <Lock size={16} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-sky-50 focus:bg-white focus:border-sky-500 transition-all text-sm text-slate-900 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-sky-600 transition-colors z-20 p-1"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Login Button - Dibuat lebih ramping dan proporsional */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300 text-white font-bold py-3 rounded-2xl shadow-lg shadow-sky-100 transition-all active:scale-[0.98] flex justify-center items-center gap-2 text-sm tracking-wide"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Verifikasi...</span>
                </>
              ) : (
                "Masuk"
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-50 text-center">
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">
            Digitalisasi BMT ADZKIA
          </p>
        </div>
      </div>
    </div>
  )
}