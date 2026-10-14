import { ShieldCheck } from "lucide-react"
import { APP_NAME } from "@/modules/mts/lib/config"

export default function Footer() {
  return (
    <footer className="mt-auto py-4 px-6 lg:px-8 border-t border-slate-200 bg-white">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <p className="flex items-center gap-2 text-slate-600">
          <ShieldCheck size={14} className="text-sky-600" />
          © {new Date().getFullYear()} {APP_NAME}
        </p>
        <p>
          Developed by <span className="text-sky-700">NurhaDev</span>
        </p>
      </div>
    </footer>
  )
}