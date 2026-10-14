"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ClipboardList, FileSpreadsheet, FileText, Loader2, Search } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { useMaster } from "@/modules/mts/lib/master"
import { useDebounce } from "@/hooks/useDebounce"
import { fail } from "@/lib/alert"
import { UNIT } from "@/modules/mts/lib/config"
import { labelPeriode, tingkatLabel } from "@/modules/mts/lib/constants"
import { exportExcel, exportPdf } from "@/modules/mts/lib/export"
import { angka, rupiah, tanggal } from "@/lib/format"
import { cetakKwitansi } from "@/modules/mts/lib/kwitansi"
import { cn } from "@/lib/utils"
import type { Siswa, TagihanRow, TransaksiRow } from "@/modules/mts/lib/types"
import { Badge, Empty, PageHeader, Spinner, StatCard, TahunSelect, ui } from "@/modules/mts/components/ui"

type SiswaCari = Pick<Siswa, "id" | "nama_lengkap" | "nis" | "tingkat" | "kelas" | "status" | "tanggal_masuk" | "nama_wali" | "hp_wali">

export default function RekapSiswaPage() {
  const { tahunAjaran, kategori, tahunDefault } = useMaster()
  const [tahunPilih, setTahunPilih] = useState<number | null>(null)
  const tahun = tahunPilih ?? tahunDefault
  const ta = tahunAjaran.find((t) => t.tahun === tahun)

  const [cari, setCari] = useState("")
  const q = useDebounce(cari.trim(), 250)
  const [hasil, setHasil] = useState<SiswaCari[]>([])
  const [siswa, setSiswa] = useState<SiswaCari | null>(null)

  const [tagihan, setTagihan] = useState<TagihanRow[]>([])
  const [transaksi, setTransaksi] = useState<TransaksiRow[]>([])
  const [loading, setLoading] = useState(false)
  const [printing, setPrinting] = useState<string | null>(null)
  const reqId = useRef(0)

  useEffect(() => {
    if (siswa || q.length < 2) return setHasil([])
    const s = q.replace(/[,()%*]/g, " ")
    let batal = false
    getSupabase()
      .from("siswa")
      .select("id,nama_lengkap,nis,tingkat,kelas,status,tanggal_masuk,nama_wali,hp_wali")
      .eq("unit", UNIT)
      .or(`nama_lengkap.ilike.%${s}%,nis.ilike.%${s}%`)
      .order("nama_lengkap")
      .limit(6)
      .then(({ data }: { data: SiswaCari[] | null }) => !batal && setHasil(data ?? []))
    return () => {
      batal = true
    }
  }, [q, siswa])

  const muat = useCallback(async () => {
    if (!siswa || !ta) return
    const id = ++reqId.current
    setLoading(true)
    const sb = getSupabase()
    const [tg, tr] = await Promise.all([
      sb.rpc("fn_tagihan", { p_tahun: tahun, p_siswa: siswa.id }),
      sb
        .from("transaksi_pembayaran")
        .select("id,siswa_id,kategori_id,tahun_ajaran_id,periode,jumlah_bayar,tanggal_bayar,metode,no_kwitansi,keterangan,created_at,kategori:kategori_pembayaran(nama,tipe_tagihan)")
        .eq("siswa_id", siswa.id)
        .eq("tahun_ajaran_id", ta.id)
        .order("tanggal_bayar", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500),
    ])
    if (id !== reqId.current) return
    setLoading(false)
    if (tg.error || tr.error) return fail(tg.error || tr.error)
    setTagihan((tg.data ?? []) as TagihanRow[])
    setTransaksi((tr.data ?? []) as unknown as TransaksiRow[])
  }, [siswa, ta, tahun])

  useEffect(() => {
    muat()
  }, [muat])

  const ringkas = useMemo(() => {
    const due = tagihan.filter((t) => t.jatuh_tempo)
    return {
      tagihan: due.reduce((a, t) => a + t.target, 0),
      tunggakan: due.reduce((a, t) => a + t.sisa, 0),
      diskon: tagihan.reduce((a, t) => a + t.diskon, 0),
      terbayar: transaksi.reduce((a, t) => a + t.jumlah_bayar, 0),
    }
  }, [tagihan, transaksi])

  const grup = useMemo(
    () =>
      kategori
        .map((k) => ({ k, rows: tagihan.filter((t) => t.kategori_id === k.id).sort((a, b) => a.periode - b.periode) }))
        .filter((g) => g.rows.length > 0),
    [kategori, tagihan]
  )

  const labelTrx = (t: TransaksiRow) => {
    const p = t.kategori ? labelPeriode(t.kategori.tipe_tagihan, t.periode) : ""
    return `${t.kategori?.nama ?? "-"}${p && p !== "-" ? ` (${p})` : ""}`
  }
  const head = ["No", "Tanggal", "Pembayaran", "Metode", "Keterangan", "Jumlah"]
  const baris = () => transaksi.map((t, i) => [i + 1, tanggal(t.tanggal_bayar), labelTrx(t), t.metode, t.keterangan ?? "", t.jumlah_bayar])

  const cetak = async (t: TransaksiRow) => {
    setPrinting(t.id)
    try { await cetakKwitansi(t) } catch (e) { fail(e) } finally { setPrinting(null) }
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 fade-up">
      <PageHeader icon={<ClipboardList size={22} />} title="Rekap Siswa" subtitle="Status pembayaran per siswa per tahun ajaran" />

      <div className={cn(ui.card, "p-4 flex flex-wrap items-end gap-3")}>
        <div className="relative flex-1 min-w-[240px] max-w-lg">
          <label className={ui.label}>Cari siswa</label>
          {siswa ? (
            <div className="flex items-center justify-between bg-sky-50 border border-sky-200 rounded-xl px-4 py-2.5">
              <span className="text-xs font-black uppercase text-slate-800">{siswa.nama_lengkap}</span>
              <button className="text-xs font-bold text-red-500 hover:bg-red-50 px-2.5 py-1 rounded-lg" onClick={() => { setSiswa(null); setTagihan([]); setTransaksi([]) }}>Ganti</button>
            </div>
          ) : (
            <>
              <Search className="absolute left-3 bottom-3 text-slate-400 w-4 h-4" />
              <input className={cn(ui.input, "pl-9 py-2.5")} placeholder="Ketik nama atau NIS (min. 2 huruf)..." value={cari} onChange={(e) => setCari(e.target.value)} />
              {hasil.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-20 overflow-hidden">
                  {hasil.map((s) => (
                    <button key={s.id} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-sky-50 text-left border-b border-slate-50 last:border-0" onClick={() => { setSiswa(s); setCari("") }}>
                      <div>
                        <div className="text-xs font-bold uppercase text-slate-800">{s.nama_lengkap}</div>
                        <div className="text-[10px] text-slate-400">NIS: {s.nis || "—"}</div>
                      </div>
                      <Badge tone="sky">Kelas {tingkatLabel(s.tingkat)}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <div>
          <label className={ui.label}>Tahun ajaran</label>
          <TahunSelect value={tahun} onChange={setTahunPilih} tahunAjaran={tahunAjaran} />
        </div>
      </div>

      {!siswa ? (
        <div className={cn(ui.card, "border-dashed")}><Empty text="Pilih siswa untuk melihat rekap" /></div>
      ) : loading && tagihan.length === 0 && transaksi.length === 0 ? (
        <Spinner label="Memuat rekap..." />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard title="Tagihan jatuh tempo" value={rupiah(ringkas.tagihan)} icon={<ClipboardList size={20} />} tone="slate" sub={ringkas.diskon > 0 ? `Diskon ${rupiah(ringkas.diskon)}` : undefined} />
            <StatCard title="Terbayar" value={rupiah(ringkas.terbayar)} icon={<ClipboardList size={20} />} tone="emerald" />
            <StatCard title="Tunggakan" value={rupiah(ringkas.tunggakan)} icon={<ClipboardList size={20} />} tone={ringkas.tunggakan > 0 ? "red" : "emerald"} />
            <div className={cn(ui.card, "p-4 flex flex-col justify-center")}>
              <p className="text-xs font-black uppercase text-slate-800 leading-tight">{siswa.nama_lengkap}</p>
              <p className="text-[10px] text-slate-400 mt-1">Kelas {tingkatLabel(siswa.tingkat)}{siswa.kelas ? ` ${siswa.kelas}` : ""} · Masuk {tanggal(siswa.tanggal_masuk)}</p>
              <p className="text-[10px] text-slate-400">Wali: {siswa.nama_wali || "-"}</p>
            </div>
          </div>

          {/* Matriks status per kategori */}
          <div className={cn(ui.card, "p-4 space-y-4")}>
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status Tagihan {tahun}</h2>
            {grup.length === 0 ? (
              <p className="text-xs text-slate-400">Tidak ada tagihan (tarif belum diisi atau siswa belum masuk periode tagihan).</p>
            ) : (
              grup.map(({ k, rows }) => (
                <div key={k.id}>
                  <p className="text-xs font-black text-slate-700 mb-1.5">{k.nama}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {rows.map((t) => {
                      const lunas = t.sisa <= 0
                      const sebagian = !lunas && t.bayar > 0
                      return (
                        <div
                          key={t.periode}
                          title={`Tagihan ${angka(t.target)} · Bayar ${angka(t.bayar)} · Sisa ${angka(t.sisa)}`}
                          className={cn(
                            "min-w-[72px] px-2.5 py-1.5 rounded-lg border text-center",
                            lunas ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : sebagian ? "bg-orange-50 border-orange-200 text-orange-700"
                              : t.jatuh_tempo ? "bg-red-50 border-red-200 text-red-600"
                              : "bg-slate-50 border-slate-200 text-slate-400"
                          )}
                        >
                          <div className="text-[10px] font-black uppercase">{k.tipe_tagihan === "bulanan" ? labelPeriode("bulanan", t.periode).slice(0, 3) : labelPeriode(k.tipe_tagihan, t.periode)}</div>
                          <div className="text-[9px] font-bold">{lunas ? "Lunas" : sebagian ? `Sisa ${angka(t.sisa)}` : t.jatuh_tempo ? "Belum" : "—"}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Riwayat transaksi */}
          <div className={cn(ui.card, "overflow-hidden")}>
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-b border-slate-100">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Riwayat Pembayaran {tahun}</h2>
              <div className="flex gap-2">
                <button className={ui.btnGhost} disabled={!transaksi.length} onClick={() => exportExcel(`Rekap_${siswa.nama_lengkap}_${tahun}`, "Rekap", head, baris())}>
                  <FileSpreadsheet size={14} /> Excel
                </button>
                <button
                  className={ui.btnGhost}
                  disabled={!transaksi.length}
                  onClick={() =>
                    exportPdf({
                      filename: `Rekap_${siswa.nama_lengkap}_${tahun}`, title: "REKAP PEMBAYARAN SISWA",
                      subtitle: `${siswa.nama_lengkap} · NIS ${siswa.nis ?? "-"} · Tahun ${tahun}`,
                      head, body: baris(), foot: [["", "", "", "", "TOTAL", ringkas.terbayar]], rightAlignCols: [5],
                    })
                  }
                >
                  <FileText size={14} className="text-red-500" /> PDF
                </button>
              </div>
            </div>
            <div className="overflow-x-auto custom-scrollbar max-h-[420px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800 text-white sticky top-0">
                  <tr>
                    <th className={ui.th}>Tanggal</th>
                    <th className={ui.th}>Pembayaran</th>
                    <th className={ui.th}>Keterangan</th>
                    <th className={`${ui.th} text-right`}>Jumlah</th>
                    <th className={`${ui.th} text-center`}>Kwitansi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transaksi.length === 0 ? (
                    <tr><td colSpan={5}><Empty text="Belum ada pembayaran" /></td></tr>
                  ) : (
                    transaksi.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 font-semibold text-slate-500 whitespace-nowrap">{tanggal(t.tanggal_bayar)}</td>
                        <td className="px-4 py-2.5 font-bold text-slate-700">{labelTrx(t)}</td>
                        <td className="px-4 py-2.5 text-slate-500">{t.keterangan || <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-2.5 text-right font-black text-emerald-700 whitespace-nowrap">{rupiah(t.jumlah_bayar)}</td>
                        <td className="px-4 py-2.5 text-center">
                          <button aria-label="Cetak kwitansi" disabled={printing === t.id} onClick={() => cetak(t)} className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg">
                            {printing === t.id ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
