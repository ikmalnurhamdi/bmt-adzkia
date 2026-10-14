"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, FileSpreadsheet, FileText, Loader2, MessageCircle, Search, Users, Wallet } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { useMaster } from "@/modules/mts/lib/master"
import { useDebounce } from "@/hooks/useDebounce"
import { fail } from "@/lib/alert"
import { APP_NAME } from "@/modules/mts/lib/config"
import { tingkatLabel } from "@/modules/mts/lib/constants"
import { exportExcel, exportPdf } from "@/modules/mts/lib/export"
import { nomorWA, rupiah } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { TunggakanRow } from "@/modules/mts/lib/types"
import { Badge, Empty, KategoriSelect, PageHeader, SkeletonRows, StatCard, TahunSelect, ui } from "@/modules/mts/components/ui"

export default function TunggakanPage() {
  const { tahunAjaran, kategori, tahunDefault } = useMaster()
  const [tahunPilih, setTahunPilih] = useState<number | null>(null)
  const tahun = tahunPilih ?? tahunDefault
  const [kat, setKat] = useState("")
  const [search, setSearch] = useState("")
  const q = useDebounce(search.trim().toLowerCase(), 200)
  const [data, setData] = useState<TunggakanRow[]>([])
  const [loading, setLoading] = useState(true)

  const muat = useCallback(async () => {
    setLoading(true)
    const { data, error } = await getSupabase().rpc("fn_tunggakan", { p_tahun: tahun })
    setLoading(false)
    if (error) return fail(error)
    setData((data ?? []) as TunggakanRow[])
  }, [tahun])

  useEffect(() => {
    muat()
  }, [muat])

  // Filter kategori & pencarian dilakukan di klien dari satu hasil RPC (cepat, tanpa query ulang)
  const tampil = useMemo(() => {
    return data
      .map((r) => {
        const rincian = kat ? r.rincian.filter((x) => x.kategori_id === kat) : r.rincian
        return { ...r, rincian, total_sisa: rincian.reduce((a, x) => a + x.sisa, 0) }
      })
      .filter((r) => r.total_sisa > 0)
      .filter((r) => !q || r.nama_lengkap.toLowerCase().includes(q) || (r.nis ?? "").includes(q))
  }, [data, kat, q])

  const totalTunggakan = tampil.reduce((a, r) => a + r.total_sisa, 0)

  const kirimWA = (r: TunggakanRow & { rincian: TunggakanRow["rincian"] }) => {
    const rincian = r.rincian.map((x) => `- ${x.nama}: ${rupiah(x.sisa)} (${x.jumlah_periode} periode)`).join("\n")
    const pesan =
      `Assalamu'alaikum Bapak/Ibu ${r.nama_wali || "Wali Murid"}.\n` +
      `Mengingatkan tunggakan pembayaran Ananda ${r.nama_lengkap} di ${APP_NAME} tahun ${tahun}:\n${rincian}\n` +
      `Total: ${rupiah(r.total_sisa)}.\nMohon segera diselesaikan. Syukran jazakumullahu khairan.`
    const no = nomorWA(r.hp_wali)
    window.open(`https://wa.me/${no}?text=${encodeURIComponent(pesan)}`, "_blank", "noopener")
  }

  const barisEkspor = () =>
    tampil.map((r, i) => [
      i + 1, r.nama_lengkap, r.nis ?? "-", `${tingkatLabel(r.tingkat)}${r.kelas ? " " + r.kelas : ""}`,
      r.rincian.map((x) => `${x.nama} (${x.jumlah_periode}x) ${rupiah(x.sisa)}`).join("; "), r.total_sisa,
    ])
  const head = ["No", "Nama", "NIS", "Kelas", "Rincian", "Total Tunggakan"]

  return (
    <div className="p-4 lg:p-6 space-y-4 fade-up">
      <PageHeader
        icon={<AlertCircle size={22} />}
        title="Tunggakan"
        subtitle={`Tagihan jatuh tempo yang belum lunas · ${tahun}`}
        actions={
          <>
            <button className={ui.btnGhost} disabled={!tampil.length} onClick={() => exportExcel(`Tunggakan_${tahun}`, "Tunggakan", head, barisEkspor())}>
              <FileSpreadsheet size={14} /> Excel
            </button>
            <button
              className={ui.btnGhost}
              disabled={!tampil.length}
              onClick={() =>
                exportPdf({
                  filename: `Tunggakan_${tahun}`, title: "DAFTAR TUNGGAKAN", subtitle: `Tahun Ajaran ${tahun}`,
                  head, body: barisEkspor(), foot: [["", "", "", "", "TOTAL", totalTunggakan]], rightAlignCols: [5], landscape: true,
                })
              }
            >
              <FileText size={14} className="text-red-500" /> PDF
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard title="Total Tunggakan" value={rupiah(totalTunggakan)} icon={<Wallet size={22} />} tone="red" />
        <StatCard title="Siswa Menunggak" value={`${tampil.length} siswa`} icon={<Users size={22} />} tone="orange" />
      </div>

      <div className={cn(ui.card, "overflow-hidden")}>
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-100">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input type="search" placeholder="Cari nama / NIS..." value={search} onChange={(e) => setSearch(e.target.value)} className={cn(ui.input, "pl-9 py-2")} />
          </div>
          <TahunSelect value={tahun} onChange={setTahunPilih} tahunAjaran={tahunAjaran} />
          <KategoriSelect value={kat} onChange={setKat} kategori={kategori} />
          <button className={ui.btnGhost} onClick={muat}>{loading ? <Loader2 size={14} className="animate-spin" /> : "Muat ulang"}</button>
        </div>

        <div className="overflow-x-auto custom-scrollbar max-h-[620px]">
          <table className="w-full text-left">
            <thead className="bg-slate-800 text-white sticky top-0 z-10">
              <tr>
                <th className={ui.th}>Siswa</th>
                <th className={`${ui.th} text-center`}>Kelas</th>
                <th className={ui.th}>Rincian Tunggakan</th>
                <th className={`${ui.th} text-right bg-red-800`}>Total</th>
                <th className={`${ui.th} text-center`}>WA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading && data.length === 0 ? (
                <SkeletonRows cols={5} />
              ) : tampil.length === 0 ? (
                <tr><td colSpan={5}><Empty text="Tidak ada tunggakan 🎉" /></td></tr>
              ) : (
                tampil.map((r) => (
                  <tr key={r.siswa_id} className="hover:bg-red-50/20">
                    <td className="px-4 py-3">
                      <div className="font-black uppercase text-slate-900 leading-tight">{r.nama_lengkap}</div>
                      <div className="text-[10px] text-slate-400">Wali: {r.nama_wali || "-"}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-black text-slate-600">
                      {tingkatLabel(r.tingkat)}{r.kelas ? ` · ${r.kelas}` : ""}
                      {r.status === "calon" && <div className="mt-1"><Badge tone="amber">Calon</Badge></div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {r.rincian.map((x) => (
                          <span key={x.kategori_id} className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px]">
                            <b className="text-slate-700">{x.nama}</b>
                            <span className="text-slate-400">{x.jumlah_periode}×</span>
                            <span className="font-black text-red-600">{rupiah(x.sisa)}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-red-700 bg-red-50/60 whitespace-nowrap">{rupiah(r.total_sisa)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        aria-label={`Kirim WhatsApp ke wali ${r.nama_lengkap}`}
                        disabled={!nomorWA(r.hp_wali)}
                        title={nomorWA(r.hp_wali) ? "Kirim pengingat WhatsApp" : "Nomor HP wali belum diisi"}
                        onClick={() => kirimWA(r)}
                        className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white p-2 rounded-xl transition active:scale-95"
                      >
                        <MessageCircle size={16} />
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
  )
}