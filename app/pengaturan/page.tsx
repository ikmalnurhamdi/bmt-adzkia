"use client"

import { useState } from "react"
import { Settings, CalendarDays, Layers, Coins } from "lucide-react"
import { cn } from "@/lib/utils"
import { PageHeader, ui } from "@/components/ui"
import TahunAjaranTab from "@/components/pengaturan/TahunAjaranTab"
import KategoriTab from "@/components/pengaturan/KategoriTab"
import TarifTab from "@/components/pengaturan/TarifTab"

const TABS = [
  { id: "kategori", label: "Kategori Pembayaran", icon: Layers },
  { id: "tarif", label: "Tarif", icon: Coins },
  { id: "tahun", label: "Tahun Ajaran", icon: CalendarDays },
] as const

export default function PengaturanPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("kategori")

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-6xl mx-auto fade-up">
      <PageHeader icon={<Settings size={22} />} title="Pengaturan" subtitle="Kategori pembayaran, tarif & tahun ajaran" />

      <div className={cn(ui.card, "overflow-hidden")}>
        <div className="flex gap-1 border-b border-slate-100 px-3 pt-3 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-t-xl whitespace-nowrap transition-colors",
                tab === id ? "bg-sky-700 text-white" : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
        <div className="p-4 sm:p-5">
          {tab === "kategori" && <KategoriTab />}
          {tab === "tarif" && <TarifTab />}
          {tab === "tahun" && <TahunAjaranTab />}
        </div>
      </div>
    </div>
  )
}
