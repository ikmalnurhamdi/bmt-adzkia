import Image from "next/image"
import { redirect } from "next/navigation"
import { ShieldAlert } from "lucide-react"
import { getSessionUser } from "@/lib/auth/server"
import { PLATFORM_NAME } from "@/lib/brand"
import LogoutButton from "@/components/auth/LogoutButton"

export const metadata = { title: "Akses Ditolak" }

export default async function AksesDitolakPage() {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  // Sudah punya peran -> tidak perlu di sini
  if (user.role) redirect("/")

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-sky-50 flex items-center justify-center p-4">
      <div className="bg-white shadow-xl rounded-3xl p-8 w-full max-w-md border border-white text-center fade-up">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-4 border border-amber-100">
          <ShieldAlert size={30} />
        </div>
        <Image src="/logo.png" alt="Logo" width={32} height={32} className="mx-auto mb-3 object-contain" />
        <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight">Akses Belum Diberikan</h1>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          Akun <span className="font-bold text-slate-700">{user.email}</span> berhasil masuk, tetapi belum ditetapkan
          sebagai pengurus <b>BMT ADZKIA</b> atau <b>MTs ADZKIA MOBILE</b>.
        </p>
        <p className="text-xs text-slate-400 mt-3">
          Hubungi administrator {PLATFORM_NAME} untuk meminta akses, lalu keluar dan masuk kembali.
        </p>
        <div className="mt-6 flex justify-center">
          <LogoutButton />
        </div>
      </div>
    </div>
  )
}
