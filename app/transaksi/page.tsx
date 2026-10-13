"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { FileText, Loader2, Plus, Receipt, Search, Trash2 } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { useMaster } from "@/lib/master"
import { useDebounce } from "@/hooks/useDebounce"
import { fail, konfirmasi, toast } from "@/lib/alert"
import { PAGE_SIZE, UNIT } from "@/lib/config"
import { BULAN_NAMES, labelPeriode } from "@/lib/constants"
import { rentangTanggal, rupiah, tanggal } from "@/lib/format"
import { cetakKwitansi } from "@/lib/kwitansi"
import { cn } from "@/lib/utils"
import type { RekapKategori, TransaksiRow } from "@/lib/types"
import { Empty, KategoriSelect, PageHeader, Pagination, SkeletonRows, TahunSelect, ui } from "@/components/ui"
import PaymentModal from "@/components/transaksi/PaymentModal"

export default function TransaksiPage() {
  const { tahunAjaran, kategori, tahunDefault } = useMaster()
  const [tahunPilih, setTahunPilih] = useState<number | null>(null)
  const tahun = tahunPilih ?? tahunDefault
  const [bulan, setBulan] = useState<number>(new Date().getMonth() + 1) // 0 = setahun
  const [kat, setKat] = useState("")
  const [search, setSearch] = useState("")
  const q = useDebounce(search.trim())
  const [page, setPage] = useState(0)

  const [rows, setRows] = useState<TransaksiRow[]>([])
  const [total, setTotal] = useState(0)
  const [rekap, setRekap] = useState<RekapKategori[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [printing, setPrinting] = useState<string | null>(null)
  const reqId = useRef(0)

  const muat = useCallback(async () => {
    const id = ++reqId.current
    setLoading(true)
    const sb = getSupabase()
    const { awal, akhir } = rentangTanggal(tahun, bulan || null)

    let query = sb
      .from("transaksi_pembayaran")
      .select(
        "id,siswa_id,kategori_id,tahun_ajaran_id,periode,jumlah_bayar,tanggal_bayar,metode,no_kwitansi,keterangan,created_at,siswa!inner(nama_lengkap,nis,kelas,tingkat,unit),kategori:kategori_pembayaran(nama,tipe_tagihan)",
        { count: "exact" }
      )
      .eq("siswa.unit", UNIT)
      .gte("tanggal_bayar", awal)
      .lt("tanggal_bayar", akhir)
      .order("tanggal_bayar", { ascending: false })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

    if (kat) query = query.eq("kategori_id", kat)
    if (q) query = query.ilike("siswa.nama_lengkap", `%${q.replace(/[%*]/g, " ")}%`)

    const [res, rk] = await Promise.all([query, sb.rpc("fn_rekap_kategori", { p_tahun: tahun, p_bulan: bulan || null })])
    if (id !== reqId.current) return
    setLoading(false)
    if (res.error) return fail(res.error)
    setRows((res.data ?? []) as unknown as TransaksiRow[])
    setTotal(res.count ?? 0)
    setRekap((rk.data ?? []) as RekapKategori[])
  }, [tahun, bulan, kat, q, page])

  useEffect(() => {
    muat()
  }, [muat])
  useEffect(() => setPage(0), [tahun, bulan, kat, q])

  const hapus = async (t: TransaksiRow) => {
    if (!(await konfirmasi("Hapus transaksi ini?", `${t.siswa?.nama_lengkap} · ${rupiah(t.jumlah_bayar)}`, "Ya, Hapus", true))) return
    const { error } = await getSupabase().from("transaksi_pembayaran").delete().eq("id", t.id)
    if (error) return fail(error)
    toast("Transaksi dihapus")
    muat()
  }

  const cetak = async (t: TransaksiRow) => {
    setPrinting(t.id)
    try {
      await cetakKwitansi(t)
    } catch (e) {
      fail(e)
    } finally {
      setPrinting(null)
    }
  }

  const totalPeriode = rekap.reduce((a, r) => a + r.total, 0)

  return (
    <div className="p-4 lg:p-6 space-y-4 fade-up">
      <PageHeader
        icon={<Receipt size={22} />}
        title="Transaksi"
        subtitle={`Pembayaran diterima · ${bulan ? BULAN_NAMES[bulan - 1] : "Setahun"} ${tahun}`}
        actions={<button className={ui.btnPrimary} onClick={() => setOpen(true)}><Plus size={14} strokeWidth={3} /> Input Pembayaran</button>}
      />

      {/* Ringkasan periode per kategori */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
        <div className="col-span-2 md:col-span-1 bg-sky-700 text-white rounded-2xl p-4 shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-widest text-sky-200">Total Periode</p>
          <p className="text-lg font-black mt-1 leading-tight">{rupiah(totalPeriode)}</p>
        </div>
        {rekap.map((r) => (
          <div key={r.kategori_id} className={cn(ui.card, "p-4")}>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 truncate">{r.nama}</p>
            <p className="text-sm font-black text-slate-800 mt-1">{rupiah(r.total)}</p>
            <p className="text-[9px] font-bold text-slate-300 uppercase">{r.jumlah} transaksi</p>
          </div>
        ))}
      </div>

      <div className={cn(ui.card, "overflow-hidden")}>
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-100">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input type="search" placeholder="Cari nama siswa..." value={search} onChange={(e) => setSearch(e.target.value)} className={cn(ui.input, "pl-9 py-2")} />
          </div>
          <select aria-label="Bulan" value={bulan} onChange={(e) => setBulan(Number(e.target.value))} className={cn(ui.input, "w-auto py-1.5")}>
            <option value={0}>Setahun penuh</option>
            {BULAN_NAMES.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}
          </select>
          <TahunSelect value={tahun} onChange={setTahunPilih} tahunAjaran={tahunAjaran} />
          <KategoriSelect value={kat} onChange={setKat} kategori={kategori} />
          {loading && <Loader2 size={16} className="animate-spin text-sky-600" />}
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className={ui.th}>Tanggal</th>
                <th className={ui.th}>Siswa</th>
                <th className={ui.th}>Pembayaran</th>
                <th className={`${ui.th} text-right`}>Jumlah</th>
                <th className={ui.th}>Keterangan</th>
                <th className={`${ui.th} text-center`}>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading && rows.length === 0 ? (
                <SkeletonRows cols={6} />
              ) : rows.length === 0 ? (
                <tr><td colSpan={6}><Empty text="Belum ada transaksi pada periode ini" /></td></tr>
              ) : (
                rows.map((t) => (
                  <tr key={t.id} className={cn("hover:bg-slate-50/70", loading && "opacity-60")}>
                    <td className="px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">{tanggal(t.tanggal_bayar)}</td>
                    <td className="px-4 py-3">
                      <div className="font-black uppercase text-slate-800 leading-tight">{t.siswa?.nama_lengkap}</div>
                      <div className="text-[10px] font-bold text-sky-600">NIS {t.siswa?.nis || "-"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-700">{t.kategori?.nama}</div>
                      {t.kategori && labelPeriode(t.kategori.tipe_tagihan, t.periode) !== "-" && (
                        <div className="text-[10px] text-slate-400">{labelPeriode(t.kategori.tipe_tagihan, t.periode)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-emerald-700 whitespace-nowrap">{rupiah(t.jumlah_bayar)}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{t.keterangan || <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-1">
                        <button title="Cetak kwitansi" aria-label="Cetak kwitansi" disabled={printing === t.id} onClick={() => cetak(t)} className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg">
                          {printing === t.id ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
                        </button>
                        <button title="Hapus" aria-label="Hapus" onClick={() => hapus(t)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
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

      {open && <PaymentModal onClose={() => setOpen(false)} onSaved={muat} />}
    </div>
  )
}