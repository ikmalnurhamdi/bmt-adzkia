"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { BadgePercent, FileSpreadsheet, Pencil, Plus, Search, Trash2, UserCheck, Users } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { useDebounce } from "@/hooks/useDebounce"
import { fail, konfirmasi, toast } from "@/lib/alert"
import { PAGE_SIZE, UNIT } from "@/modules/mts/lib/config"
import { tingkatLabel } from "@/modules/mts/lib/constants"
import { tanggal } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Siswa, StatusSiswa } from "@/modules/mts/lib/types"
import { Badge, Empty, PageHeader, Pagination, SkeletonRows, ui } from "@/modules/mts/components/ui"
import FormSiswa from "@/modules/mts/components/siswa/FormSiswa"
import DiskonModal from "@/modules/mts/components/siswa/DiskonModal"
import ImportSiswa from "@/modules/mts/components/siswa/ImportSiswa"

type Tab = "aktif" | "calon" | "lainnya"
const TABS: { id: Tab; label: string }[] = [
  { id: "aktif", label: "Siswa Aktif" },
  { id: "calon", label: "Calon Siswa (PPDB)" },
  { id: "lainnya", label: "Lulus / Keluar" },
]

const statusTone = { aktif: "emerald", calon: "amber", lulus: "sky", keluar: "slate" } as const

export default function DataSiswaPage() {
  const [tab, setTab] = useState<Tab>("aktif")
  const [search, setSearch] = useState("")
  const q = useDebounce(search.trim())
  const [page, setPage] = useState(0)
  const [rows, setRows] = useState<Siswa[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<{ siswa: Siswa | null } | null>(null)
  const [diskonUntuk, setDiskonUntuk] = useState<Siswa | null>(null)
  const [showImport, setShowImport] = useState(false)
  const reqId = useRef(0)

  const muat = useCallback(async () => {
    const id = ++reqId.current
    setLoading(true)
    let query = getSupabase()
      .from("siswa")
      .select("*", { count: "exact" })
      .eq("unit", UNIT)
      .order("nama_lengkap")
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

    query = tab === "lainnya" ? query.in("status", ["lulus", "keluar"]) : query.eq("status", tab)
    if (q) {
      const s = q.replace(/[,()%*]/g, " ")
      query = query.or(`nama_lengkap.ilike.%${s}%,nis.ilike.%${s}%,nisn.ilike.%${s}%`)
    }
    const { data, count, error } = await query
    if (id !== reqId.current) return // abaikan respons usang
    setLoading(false)
    if (error) return fail(error)
    setRows((data ?? []) as Siswa[])
    setTotal(count ?? 0)
  }, [tab, q, page])

  useEffect(() => {
    muat()
  }, [muat])

  // Kembali ke halaman pertama saat filter berubah
  useEffect(() => setPage(0), [tab, q])

  const terima = async (s: Siswa) => {
    if (!(await konfirmasi(`Terima ${s.nama_lengkap}?`, "Status berubah menjadi Siswa Aktif dan tagihan bulanan mulai dihitung.", "Ya, Terima"))) return
    const { error } = await getSupabase().from("siswa").update({ status: "aktif" satisfies StatusSiswa }).eq("id", s.id)
    if (error) return fail(error)
    toast("Calon siswa diterima")
    muat()
  }

  const hapus = async (s: Siswa) => {
    const ok = await konfirmasi(
      `Hapus ${s.nama_lengkap}?`,
      "Seluruh transaksi & diskon siswa ini ikut terhapus permanen. Bila hanya berhenti, ubah status menjadi Keluar.",
      "Ya, Hapus Permanen",
      true
    )
    if (!ok) return
    const { error } = await getSupabase().from("siswa").delete().eq("id", s.id)
    if (error) return fail(error)
    toast("Terhapus")
    muat()
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 fade-up">
      <PageHeader
        icon={<Users size={22} />}
        title="Data Siswa"
        subtitle="Siswa aktif, calon siswa PPDB & alumni"
        actions={
          <>
            <button className={ui.btnGhost} onClick={() => setShowImport(true)}><FileSpreadsheet size={14} /> Impor Excel</button>
            <button className={ui.btnPrimary} onClick={() => setForm({ siswa: null })}>
              <Plus size={14} strokeWidth={3} /> {tab === "calon" ? "Calon Siswa" : "Siswa Baru"}
            </button>
          </>
        }
      />

      <div className={cn(ui.card, "overflow-hidden")}>
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-slate-100">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-colors",
                  tab === t.id ? "bg-sky-700 text-white" : "text-slate-500 hover:bg-slate-100"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="search"
              placeholder="Cari nama / NIS / NISN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(ui.input, "pl-9 py-2")}
            />
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className={ui.th}>Siswa</th>
                <th className={`${ui.th} text-center`}>Kelas</th>
                <th className={ui.th}>Wali</th>
                <th className={`${ui.th} text-center`}>{tab === "calon" ? "Tgl Daftar" : "Tgl Masuk"}</th>
                <th className={`${ui.th} text-center`}>Status</th>
                <th className={`${ui.th} text-right`}>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading && rows.length === 0 ? (
                <SkeletonRows cols={6} />
              ) : rows.length === 0 ? (
                <tr><td colSpan={6}><Empty text="Belum ada data" /></td></tr>
              ) : (
                rows.map((s) => (
                  <tr key={s.id} className={cn("hover:bg-slate-50/70", loading && "opacity-60")}>
                    <td className="px-4 py-3">
                      <div className="font-black uppercase text-slate-900 leading-tight">{s.nama_lengkap}</div>
                      <div className="text-[10px] font-bold text-sky-600 mt-0.5">
                        NIS: {s.nis || "-"} {s.jenis_kelamin && <span className="text-slate-400">· {s.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-black text-slate-600 uppercase">
                      {tingkatLabel(s.tingkat)}{s.kelas ? ` · ${s.kelas}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-700 uppercase">{s.nama_wali || "-"}</div>
                      <div className="text-[10px] text-emerald-600 font-bold">{s.hp_wali || "-"}</div>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600 font-semibold">{tanggal(s.tanggal_masuk)}</td>
                    <td className="px-4 py-3 text-center"><Badge tone={statusTone[s.status]}>{s.status}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {s.status === "calon" && (
                          <button title="Terima jadi siswa" aria-label="Terima" onClick={() => terima(s)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><UserCheck size={15} /></button>
                        )}
                        <button title="Diskon / beasiswa" aria-label="Diskon" onClick={() => setDiskonUntuk(s)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg"><BadgePercent size={15} /></button>
                        <button title="Ubah" aria-label="Ubah" onClick={() => setForm({ siswa: s })} className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg"><Pencil size={15} /></button>
                        <button title="Hapus" aria-label="Hapus" onClick={() => hapus(s)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} size={PAGE_SIZE} onPage={setPage} />
      </div>

      {form && (
        <FormSiswa
          siswa={form.siswa}
          defaultStatus={tab === "calon" ? "calon" : "aktif"}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); muat() }}
        />
      )}
      {diskonUntuk && <DiskonModal siswa={diskonUntuk} onClose={() => setDiskonUntuk(null)} />}
      {showImport && (
        <ImportSiswa
          defaultStatus={tab === "calon" ? "calon" : "aktif"}
          onClose={() => setShowImport(false)}
          onDone={() => { setShowImport(false); muat() }}
        />
      )}
    </div>
  )
}
