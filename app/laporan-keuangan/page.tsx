"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  FileSpreadsheet, FileText, Loader2, Plus, Receipt, Save,
  Search, Trash2, TrendingDown, TrendingUp, Wallet
} from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { useMaster } from "@/lib/master"
import { useDebounce } from "@/hooks/useDebounce"
import { fail, konfirmasi, toast } from "@/lib/alert"
import { BULAN_NAMES } from "@/lib/constants"
import { exportExcel, exportPdf } from "@/lib/export"
import { hariIni, rentangTanggal, rupiah, tanggal } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Kas } from "@/lib/types"
import {
  Badge, Empty, Modal, PageHeader, SkeletonRows, StatCard, TahunSelect, ui
} from "@/components/ui"

export default function LaporanKeuanganPage() {
  const { tahunAjaran, tahunDefault } = useMaster()
  const [tahunPilih, setTahunPilih] = useState<number | null>(null)
  const tahun = tahunPilih ?? tahunDefault
  const [bulan, setBulan] = useState<number>(new Date().getMonth() + 1) // 0 = setahun

  const [search, setSearch] = useState("")
  const q = useDebounce(search.trim())

  const [list, setList] = useState<Kas[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    jenis: "pemasukan" as "pemasukan" | "pengeluaran",
    nominal: "",
    keterangan: "",
    tanggal: hariIni(),
  })

  const muat = useCallback(async () => {
    setLoading(true)
    const { awal, akhir } = rentangTanggal(tahun, bulan || null)
    let query = getSupabase()
      .from("kas_operasional")
      .select("*")
      .gte("tanggal", awal)
      .lt("tanggal", akhir)
      .order("tanggal", { ascending: false })
      .order("created_at", { ascending: false })

    if (q) {
      query = query.ilike("keterangan", `%${q.replace(/[%*]/g, " ")}%`)
    }

    const { data, error } = await query
    setLoading(false)
    if (error) return fail(error)
    setList((data ?? []) as Kas[])
  }, [tahun, bulan, q])

  useEffect(() => {
    muat()
  }, [muat])

  const stats = useMemo(() => {
    const masuk = list.filter((t) => t.jenis === "pemasukan").reduce((a, b) => a + Number(b.nominal), 0)
    const keluar = list.filter((t) => t.jenis === "pengeluaran").reduce((a, b) => a + Number(b.nominal), 0)
    return { masuk, keluar, saldo: masuk - keluar }
  }, [list])

  const handleSimpan = async (e: React.FormEvent) => {
    e.preventDefault()
    const nominal = Number(formData.nominal)
    if (!(nominal > 0)) return
    const ket = formData.keterangan.trim()
    if (!ket) return

    setIsSubmitting(true)
    const { error } = await getSupabase().from("kas_operasional").insert({
      jenis: formData.jenis,
      nominal,
      keterangan: ket.toUpperCase(),
      tanggal: formData.tanggal,
    })
    setIsSubmitting(false)

    if (error) return fail(error)
    toast("Catatan kas disimpan")
    setIsModalOpen(false)
    setFormData({ jenis: "pemasukan", nominal: "", keterangan: "", tanggal: hariIni() })
    muat()
  }

  const handleHapus = async (item: Kas) => {
    const ok = await konfirmasi(
      "Hapus transaksi kas ini?",
      `${item.keterangan} · ${rupiah(item.nominal)}`,
      "Ya, Hapus",
      true
    )
    if (!ok) return

    const { error } = await getSupabase().from("kas_operasional").delete().eq("id", item.id)
    if (error) return fail(error)
    toast("Catatan kas dihapus")
    muat()
  }

  const head = ["No", "Tanggal", "Keterangan", "Jenis", "Pemasukan", "Pengeluaran"]
  const baris = () =>
    list.map((t, i) => [
      i + 1,
      tanggal(t.tanggal),
      t.keterangan,
      t.jenis === "pemasukan" ? "Debit" : "Kredit",
      t.jenis === "pemasukan" ? t.nominal : 0,
      t.jenis === "pengeluaran" ? t.nominal : 0,
    ])

  const periodeLabel = bulan ? `${BULAN_NAMES[bulan - 1]} ${tahun}` : `Tahun ${tahun}`

  return (
    <div className="p-4 lg:p-6 space-y-4 fade-up max-w-7xl mx-auto">
      <PageHeader
        icon={<Receipt size={22} />}
        title="Laporan Keuangan"
        subtitle={`Buku kas operasional sekolah · ${periodeLabel}`}
        actions={
          <>
            <button
              className={ui.btnGhost}
              disabled={!list.length}
              onClick={() => exportExcel(`Kas_Operasional_${periodeLabel.replace(/\s+/g, "_")}`, "Mutasi Kas", head, baris())}
            >
              <FileSpreadsheet size={14} /> Excel
            </button>
            <button
              className={ui.btnGhost}
              disabled={!list.length}
              onClick={() =>
                exportPdf({
                  filename: `Kas_Operasional_${periodeLabel.replace(/\s+/g, "_")}`,
                  title: "MUTASI KAS OPERASIONAL SEKOLAH",
                  subtitle: `Periode: ${periodeLabel}`,
                  head,
                  body: baris(),
                  foot: [["", "", "TOTAL", "", stats.masuk, stats.keluar]],
                  rightAlignCols: [4, 5],
                })
              }
            >
              <FileText size={14} className="text-red-500" /> Cetak PDF
            </button>
            <button className={ui.btnPrimary} onClick={() => setIsModalOpen(true)}>
              <Plus size={14} strokeWidth={3} /> Catat Kas
            </button>
          </>
        }
      />

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Pemasukan Kas"
          value={rupiah(stats.masuk)}
          icon={<TrendingUp size={22} />}
          tone="emerald"
        />
        <StatCard
          title="Pengeluaran Kas"
          value={rupiah(stats.keluar)}
          icon={<TrendingDown size={22} />}
          tone="red"
        />
        <StatCard
          title="Saldo Kas Periode"
          value={rupiah(stats.saldo)}
          icon={<Wallet size={22} />}
          tone={stats.saldo >= 0 ? "sky" : "red"}
        />
      </div>

      {/* TABEL MUTASI */}
      <div className={cn(ui.card, "overflow-hidden")}>
        <div className="p-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="search"
                placeholder="Cari keterangan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(ui.input, "pl-9 py-2")}
              />
            </div>
            <select
              aria-label="Filter bulan"
              value={bulan}
              onChange={(e) => setBulan(Number(e.target.value))}
              className={cn(ui.input, "w-auto py-1.5")}
            >
              <option value={0}>Setahun penuh</option>
              {BULAN_NAMES.map((b, i) => (
                <option key={b} value={i + 1}>
                  {b}
                </option>
              ))}
            </select>
            <TahunSelect value={tahun} onChange={setTahunPilih} tahunAjaran={tahunAjaran} />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase">{list.length} catatan</span>
        </div>

        <div className="overflow-x-auto custom-scrollbar max-h-[560px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800 text-white sticky top-0 z-10">
              <tr>
                <th className={ui.th}>Tanggal</th>
                <th className={ui.th}>Keterangan</th>
                <th className={`${ui.th} text-center`}>Jenis</th>
                <th className={`${ui.th} text-right`}>Nominal</th>
                <th className={`${ui.th} text-center`}>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && list.length === 0 ? (
                <SkeletonRows cols={5} />
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <Empty text="Belum ada transaksi kas pada periode ini" />
                  </td>
                </tr>
              ) : (
                list.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">
                      {tanggal(t.tanggal)}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {t.keterangan}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge tone={t.jenis === "pemasukan" ? "emerald" : "red"}>
                        {t.jenis}
                      </Badge>
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right font-black whitespace-nowrap",
                        t.jenis === "pemasukan" ? "text-emerald-700 bg-emerald-50/20" : "text-red-600 bg-red-50/20"
                      )}
                    >
                      {t.jenis === "pemasukan" ? "+" : "-"} {rupiah(t.nominal)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        aria-label={`Hapus ${t.keterangan}`}
                        onClick={() => handleHapus(t)}
                        className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL INPUT KAS */}
      {isModalOpen && (
        <Modal
          title="Catatan Kas Operasional"
          onClose={() => setIsModalOpen(false)}
          maxWidth="max-w-md"
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={ui.btnGhost}
                onClick={() => setIsModalOpen(false)}
              >
                Batal
              </button>
              <button
                form="form-kas"
                disabled={isSubmitting}
                className={ui.btnPrimary}
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan
              </button>
            </div>
          }
        >
          <form id="form-kas" onSubmit={handleSimpan} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, jenis: "pemasukan" })}
                className={cn(
                  "py-2 rounded-lg text-[10px] font-black uppercase transition",
                  formData.jenis === "pemasukan"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                Pemasukan (+)
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, jenis: "pengeluaran" })}
                className={cn(
                  "py-2 rounded-lg text-[10px] font-black uppercase transition",
                  formData.jenis === "pengeluaran"
                    ? "bg-white text-red-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                Pengeluaran (-)
              </button>
            </div>

            <div>
              <label className={ui.label} htmlFor="kas-tgl">Tanggal</label>
              <input
                id="kas-tgl"
                type="date"
                required
                className={ui.input}
                value={formData.tanggal}
                onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
              />
            </div>

            <div>
              <label className={ui.label} htmlFor="kas-nominal">Nominal (Rp)</label>
              <input
                id="kas-nominal"
                type="number"
                min={1}
                required
                autoFocus
                className={ui.input}
                value={formData.nominal}
                onChange={(e) => setFormData({ ...formData, nominal: e.target.value })}
                placeholder="mis. 500000"
              />
            </div>

            <div>
              <label className={ui.label} htmlFor="kas-ket">Keterangan / Keperluan</label>
              <textarea
                id="kas-ket"
                rows={3}
                required
                className={cn(ui.input, "resize-none uppercase")}
                value={formData.keterangan}
                onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                placeholder="mis. Pembelian spidol & ATK kantor"
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}