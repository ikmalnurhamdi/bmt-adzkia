"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  Activity, ArrowUpRight, Banknote, CheckCircle2, ChevronRight,
  Clock, Plus, Receipt, RotateCw, Users, Wallet
} from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { useMaster } from "@/modules/mts/lib/master"
import { fail } from "@/lib/alert"
import { BULAN_NAMES } from "@/modules/mts/lib/constants"
import { rupiah } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Ringkasan } from "@/modules/mts/lib/types"
import { Empty, PageHeader, Spinner, StatCard, TahunSelect, ui } from "@/modules/mts/components/ui"

export default function DashboardPage() {
  const { tahunAjaran, tahunDefault, ready } = useMaster()
  const [tahunPilih, setTahunPilih] = useState<number | null>(null)
  const tahun = tahunPilih ?? tahunDefault

  const [ringkasan, setRingkasan] = useState<Ringkasan | null>(null)
  const [loading, setLoading] = useState(true)

  const muat = useCallback(async () => {
    setLoading(true)
    const { data, error } = await getSupabase().rpc("fn_ringkasan", { p_tahun: tahun })
    setLoading(false)
    if (error) return fail(error)
    setRingkasan(data as Ringkasan)
  }, [tahun])

  useEffect(() => {
    if (ready) muat()
  }, [ready, muat])

  const totalPotensi = (ringkasan?.pemasukan ?? 0) + (ringkasan?.tunggakan ?? 0)
  const efektivitas = totalPotensi > 0
    ? Math.min(100, Math.round(((ringkasan?.pemasukan ?? 0) / totalPotensi) * 100))
    : 0

  const maxBulanan = Math.max(1, ...(ringkasan?.per_bulan?.map((b) => b.total) ?? [1]))
  const saldoKas = (ringkasan?.kas_masuk ?? 0) - (ringkasan?.kas_keluar ?? 0)

  return (
    <div className="p-4 lg:p-6 space-y-5 fade-up max-w-7xl mx-auto">
      <PageHeader
        icon={<Activity size={22} className="text-sky-600" />}
        title="Dashboard"
        subtitle={`Ringkasan Keuangan & Administrasi · Tahun ${tahun}`}
        actions={
          <div className="flex items-center gap-2">
            <TahunSelect value={tahun} onChange={setTahunPilih} tahunAjaran={tahunAjaran} />
            <button
              onClick={muat}
              disabled={loading}
              className={ui.btnGhost}
              title="Refresh data"
            >
              <RotateCw size={14} className={cn(loading && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        }
      />

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Siswa Aktif"
          value={`${ringkasan?.siswa_aktif ?? 0} Anak`}
          sub={ringkasan?.calon ? `${ringkasan.calon} Calon PPDB` : "Terdaftar Aktif"}
          icon={<Users size={22} />}
          tone="sky"
        />
        <StatCard
          title="Pembayaran Masuk"
          value={rupiah(ringkasan?.pemasukan ?? 0)}
          sub={`Tahun Ajaran ${tahun}`}
          icon={<Banknote size={22} />}
          tone="emerald"
        />
        <StatCard
          title="Tunggakan Jatuh Tempo"
          value={rupiah(ringkasan?.tunggakan ?? 0)}
          sub="Belum Terbayar"
          icon={<Wallet size={22} />}
          tone={ringkasan?.tunggakan ? "red" : "emerald"}
        />
        <StatCard
          title="Saldo Kas Operasional"
          value={rupiah(saldoKas)}
          sub={`Masuk ${rupiah(ringkasan?.kas_masuk ?? 0)} · Keluar ${rupiah(ringkasan?.kas_keluar ?? 0)}`}
          icon={<Receipt size={22} />}
          tone="orange"
        />
      </div>

      {/* GRAFIK & EFEKTIVITAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Progress Efektivitas */}
        <div className={cn(ui.card, "p-5 sm:p-6 space-y-5 flex flex-col justify-between")}>
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-black text-slate-800 uppercase text-xs tracking-wider">
                Efektivitas Penagihan
              </h2>
              <span className="text-2xl font-black text-sky-600">{efektivitas}%</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Perbandingan dana diterima terhadap total kewajiban jatuh tempo tahun {tahun}.
            </p>

            <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden shadow-inner mt-4">
              <div
                className="bg-gradient-to-r from-sky-500 to-emerald-500 h-full transition-all duration-700 rounded-full"
                style={{ width: `${efektivitas}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
              <p className="text-[9px] font-black text-emerald-600 uppercase">Diterima</p>
              <p className="text-xs sm:text-sm font-black text-emerald-900 mt-0.5">
                {rupiah(ringkasan?.pemasukan ?? 0)}
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-center">
              <p className="text-[9px] font-black text-red-600 uppercase">Tunggakan</p>
              <p className="text-xs sm:text-sm font-black text-red-900 mt-0.5">
                {rupiah(ringkasan?.tunggakan ?? 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Tren Pembayaran Bulanan (CSS Bar Chart murni - sangat ringan) */}
        <div className={cn(ui.card, "p-5 sm:p-6 lg:col-span-2 space-y-4")}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-black text-slate-800 uppercase text-xs tracking-wider">
                Tren Pembayaran Bulanan ({tahun})
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">Akumulasi uang masuk per bulan transaksi</p>
            </div>
            <Link
              href="/mts/transaksi"
              className="text-[10px] font-black uppercase text-sky-700 hover:text-sky-900 flex items-center gap-1"
            >
              Lihat Transaksi <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="h-44 flex items-end gap-1.5 sm:gap-3 pt-6 pb-1 px-1 border-b border-slate-100">
            {BULAN_NAMES.map((b, i) => {
              const bulanIdx = i + 1
              const item = ringkasan?.per_bulan?.find((x) => x.bulan === bulanIdx)
              const totalBln = item?.total ?? 0
              const tinggiPersen = Math.max(4, Math.round((totalBln / maxBulanan) * 100))

              return (
                <div key={b} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative">
                  {/* Tooltip hover */}
                  <div className="absolute -top-7 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap z-20">
                    {b}: {rupiah(totalBln)}
                  </div>
                  <div
                    className={cn(
                      "w-full rounded-t-lg transition-all duration-300",
                      totalBln > 0
                        ? "bg-sky-600 hover:bg-sky-500 shadow-sm"
                        : "bg-slate-100"
                    )}
                    style={{ height: `${tinggiPersen}%` }}
                  />
                  <span className="text-[9px] font-bold text-slate-400 group-hover:text-slate-800 transition-colors">
                    {b.slice(0, 3)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* DETAIL PER KATEGORI PEMBAYARAN */}
      <div className={cn(ui.card, "overflow-hidden")}>
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-800">
              Rekapitulasi per Kategori Pembayaran
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Rincian kewajiban, penerimaan, dan tunggakan untuk masing-masing pos pembayaran dinamis
            </p>
          </div>
          <Link
            href="/mts/pengaturan"
            className="text-[10px] font-black uppercase text-sky-700 hover:text-sky-900 flex items-center gap-1"
          >
            Atur Tarif <ChevronRight size={14} />
          </Link>
        </div>

        {loading && !ringkasan ? (
          <Spinner label="Memuat ringkasan..." />
        ) : !ringkasan?.kategori?.length ? (
          <Empty text="Belum ada data kategori pembayaran" />
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className={ui.th}>Kategori Pembayaran</th>
                  <th className={`${ui.th} text-right`}>Target Jatuh Tempo</th>
                  <th className={`${ui.th} text-right`}>Penerimaan</th>
                  <th className={`${ui.th} text-right`}>Sisa Tunggakan</th>
                  <th className={`${ui.th} text-center`}>Status Capaian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ringkasan.kategori.map((k) => {
                  const persen = k.tagihan > 0 ? Math.min(100, Math.round((k.bayar / k.tagihan) * 100)) : 100
                  const isLunas = k.tunggakan <= 0
                  return (
                    <tr key={k.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3.5">
                        <span className="font-black text-slate-800 uppercase">{k.nama}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-600">
                        {rupiah(k.tagihan)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-emerald-700">
                        {rupiah(k.bayar)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-red-600">
                        {rupiah(k.tunggakan)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border"
                          style={{
                            backgroundColor: isLunas ? "#ecfdf5" : "#fff7ed",
                            borderColor: isLunas ? "#a7f3d0" : "#fed7aa",
                            color: isLunas ? "#047857" : "#c2410c",
                          }}
                        >
                          {isLunas ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                          <span>{persen}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PINTASAN CEPAT */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <Link
          href="/mts/transaksi"
          className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl hover:border-sky-500 hover:shadow-sm transition group"
        >
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Input Bayar</p>
            <p className="text-xs font-black text-slate-800 mt-0.5 group-hover:text-sky-700">Transaksi Siswa</p>
          </div>
          <Plus size={16} className="text-sky-600" />
        </Link>
        <Link
          href="/mts/siswa"
          className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl hover:border-sky-500 hover:shadow-sm transition group"
        >
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Registrasi</p>
            <p className="text-xs font-black text-slate-800 mt-0.5 group-hover:text-sky-700">Data Siswa / PPDB</p>
          </div>
          <Users size={16} className="text-sky-600" />
        </Link>
        <Link
          href="/mts/tunggakan"
          className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl hover:border-sky-500 hover:shadow-sm transition group"
        >
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Monitoring</p>
            <p className="text-xs font-black text-slate-800 mt-0.5 group-hover:text-red-700">Daftar Tunggakan</p>
          </div>
          <Wallet size={16} className="text-red-500" />
        </Link>
        <Link
          href="/mts/laporan-keuangan"
          className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl hover:border-sky-500 hover:shadow-sm transition group"
        >
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Buku Kas</p>
            <p className="text-xs font-black text-slate-800 mt-0.5 group-hover:text-sky-700">Laporan Kas</p>
          </div>
          <Receipt size={16} className="text-orange-500" />
        </Link>
      </div>
    </div>
  )
}