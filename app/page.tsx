import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, Building2, GraduationCap } from "lucide-react"
import { getSessionUser } from "@/lib/auth/server"
import { homeFor } from "@/lib/auth/roles"
import { APP_META, PLATFORM_NAME, PLATFORM_TAGLINE } from "@/lib/brand"
import LogoutButton from "@/components/auth/LogoutButton"

export const metadata = { title: "Pilih Aplikasi" }

/**
 * Pintu masuk platform.
 *  - Belum login  -> /login
 *  - bmt / mts    -> langsung ke aplikasinya
 *  - admin        -> pemilih aplikasi
 *  - tanpa peran  -> /akses-ditolak
 */
export default async function HomePage() {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  if (user.role !== "admin") redirect(homeFor(user.role))

  const apps = [
    { ...APP_META.bmt, icon: Building2, tone: "from-sky-600 to-sky-700" },
    { ...APP_META.mts, icon: GraduationCap, tone: "from-sky-700 to-sky-900" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-sky-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl fade-up">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-20 h-20 bg-sky-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-sky-200 border-4 border-white">
            <Image src="/logo.png" alt="Logo" width={48} height={48} className="object-contain" priority />
          </div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase">{PLATFORM_NAME}</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{PLATFORM_TAGLINE}</p>
          <p className="text-xs text-slate-500 mt-3">Masuk sebagai <span className="font-bold text-slate-700">{user.email}</span> · Administrator</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {apps.map(({ name, desc, href, icon: Icon, tone }) => (
            <Link
              key={href}
              href={href}
              className="group bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:border-sky-500 hover:-translate-y-0.5 transition-all"
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tone} text-white flex items-center justify-center mb-4 shadow-lg shadow-sky-200`}>
                <Icon size={22} />
              </div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">{name}</h2>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed min-h-[2.75rem]">{desc}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-sky-600 group-hover:gap-2.5 transition-all">
                Buka aplikasi <ArrowRight size={13} />
              </span>
            </Link>
          ))}
        </div>

        <div className="flex justify-center mt-6">
          <LogoutButton />
        </div>
      </div>
    </div>
  )
}
