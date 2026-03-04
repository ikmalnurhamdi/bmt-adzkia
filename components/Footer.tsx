"use client"

import { ShieldCheck, Code2 } from "lucide-react"

export default function Footer() {
  // Logika untuk mengambil tahun secara otomatis (2026, 2027, dst)
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-auto py-5 px-8 border-t border-slate-100 bg-white/80 backdrop-blur-md">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* SISI KIRI: Copyright & Lembaga */}
        <div className="flex items-center gap-3">
          <div className="bg-sky-100 p-2 rounded-lg">
            <ShieldCheck size={16} className="text-sky-600" />
          </div>
          <div className="flex flex-col">
            <p className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
              © {currentYear} BMT ADZKIA
            </p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
              Seluruh Hak Cipta Dilindungi
            </p>
          </div>
        </div>

        {/* SISI TENGAH: Tagline Profesional */}
                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
          <Code2 size={14} className="text-slate-400" />
          <div className="flex flex-col items-start">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
              Developed By
            </p>
            <p className="text-[10px] font-black text-sky-700  tracking-tighter">
              NurhaDev
            </p>
          </div>
        </div>

        {/* SISI KANAN: Developer Identity */}


      </div>
    </footer>
  )
}