"use client"

import { useEffect } from "react"
import { Inbox, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Kategori, TahunAjaran } from "@/modules/mts/lib/types"

/** Kelas Tailwind yang dipakai bersama agar tampilan konsisten. */
export const ui = {
  input:
    "w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition",
  label: "block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1",
  btnPrimary:
    "inline-flex items-center justify-center gap-2 bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white text-[10px] font-black uppercase px-4 py-2.5 rounded-xl shadow-sm transition active:scale-95",
  btnGhost:
    "inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-black uppercase px-4 py-2.5 rounded-xl transition active:scale-95 disabled:opacity-50",
  btnDanger:
    "inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase px-4 py-2.5 rounded-xl transition active:scale-95",
  card: "bg-white border border-slate-200 rounded-2xl shadow-sm",
  th: "px-4 py-3 text-[9px] font-black uppercase tracking-widest whitespace-nowrap",
}

export function PageHeader({ icon, title, subtitle, actions }: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  return (
    <div className={cn(ui.card, "p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3")}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="bg-sky-50 text-sky-700 p-2.5 rounded-xl border border-sky-100 shrink-0">{icon}</div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight leading-none">{title}</h1>
          {subtitle && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function StatCard({ title, value, sub, icon, tone = "sky" }: {
  title: string
  value: React.ReactNode
  sub?: string
  icon: React.ReactNode
  tone?: "sky" | "emerald" | "orange" | "red" | "slate"
}) {
  const tones = {
    sky: "bg-sky-50 text-sky-600 border-sky-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    red: "bg-red-50 text-red-600 border-red-100",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
  }
  return (
    <div className={cn(ui.card, "p-4 sm:p-5 flex items-center gap-4")}>
      <div className={cn("p-3 rounded-2xl border shrink-0", tones[tone])}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <p className="text-lg font-black text-slate-900 leading-tight mt-0.5 truncate">{value}</p>
        {sub && <p className="text-[9px] font-bold text-slate-300 uppercase mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export function Modal({ title, onClose, children, maxWidth = "max-w-2xl", footer }: {
  title: string
  onClose: () => void
  children: React.ReactNode
  maxWidth?: string
  footer?: React.ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/60" onClick={onClose} />
      <div className={cn("relative z-10 w-full bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] fade-up", maxWidth)}>
        <div className="bg-sky-800 px-5 py-3.5 text-white flex items-center justify-between rounded-t-2xl shrink-0">
          <h2 className="text-xs font-black uppercase tracking-widest">{title}</h2>
          <button aria-label="Tutup" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto custom-scrollbar flex-1 p-5">{children}</div>
        {footer && <div className="border-t border-slate-100 p-4 shrink-0">{footer}</div>}
      </div>
    </div>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
      <Loader2 className="animate-spin text-sky-600" size={24} />
      {label && <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>}
    </div>
  )
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-300">
      <Inbox size={40} />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{text}</p>
    </div>
  )
}

export function SkeletonRows({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="px-4 py-3.5">
              <div className="skeleton h-3.5 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function TahunSelect({ value, onChange, tahunAjaran, className }: {
  value: number
  onChange: (v: number) => void
  tahunAjaran: TahunAjaran[]
  className?: string
}) {
  const list = tahunAjaran.some((t) => t.tahun === value) ? tahunAjaran : [{ id: "x", tahun: value, nama: String(value), aktif: false }, ...tahunAjaran]
  return (
    <select
      aria-label="Tahun ajaran"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn(ui.input, "w-auto py-1.5", className)}
    >
      {list.map((t) => (
        <option key={t.tahun} value={t.tahun}>
          {t.nama}{t.aktif ? " (aktif)" : ""}
        </option>
      ))}
    </select>
  )
}

export function KategoriSelect({ value, onChange, kategori, allLabel = "Semua kategori", className }: {
  value: string
  onChange: (v: string) => void
  kategori: Kategori[]
  allLabel?: string
  className?: string
}) {
  return (
    <select aria-label="Kategori" value={value} onChange={(e) => onChange(e.target.value)} className={cn(ui.input, "w-auto py-1.5", className)}>
      <option value="">{allLabel}</option>
      {kategori.map((k) => (
        <option key={k.id} value={k.id}>{k.nama}</option>
      ))}
    </select>
  )
}

export function Pagination({ page, total, size, onPage }: { page: number; total: number; size: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size))
  if (total <= size) return null
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
      <span>{total} data · Hal {page + 1}/{pages}</span>
      <div className="flex gap-2">
        <button className={ui.btnGhost} disabled={page === 0} onClick={() => onPage(page - 1)}>Sebelumnya</button>
        <button className={ui.btnGhost} disabled={page + 1 >= pages} onClick={() => onPage(page + 1)}>Berikutnya</button>
      </div>
    </div>
  )
}

export function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "sky" | "emerald" | "orange" | "red" | "amber" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-600 border-slate-200",
    sky: "bg-sky-50 text-sky-700 border-sky-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    red: "bg-red-50 text-red-700 border-red-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  }
  return <span className={cn("inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full border", tones[tone])}>{children}</span>
}
