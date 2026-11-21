import { Wallet, AlertTriangle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RekapTransaksiSantri } from "@/modules/bmt/lib/transactionHelpers"

interface MetricCardsProps {
  rekap: RekapTransaksiSantri | null
  periodeLabel?: string
  isSingleMonth?: boolean
}

export default function MetricCards({
  rekap,
  periodeLabel = "Semua Periode",
  isSingleMonth = false,
}: MetricCardsProps) {
  if (!rekap) return null

  const detailKurangSingleMonth = isSingleMonth
    ? [
        rekap.sisaPerKategori.dapur > 0 ? `Dapur Rp ${rekap.sisaPerKategori.dapur.toLocaleString("id-ID")}` : null,
        rekap.sisaPerKategori.pesantren > 0 ? `Pesantren Rp ${rekap.sisaPerKategori.pesantren.toLocaleString("id-ID")}` : null,
        rekap.sisaPerKategori.sekolah > 0 ? `Sekolah Rp ${rekap.sisaPerKategori.sekolah.toLocaleString("id-ID")}` : null,
      ].filter(Boolean)
    : []

  return (
    <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Card Pembayaran */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 rounded-xl text-white shadow-md shadow-emerald-500/20 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-2 -translate-y-2">
          <Wallet size={80} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-[11px] font-medium text-emerald-50">Total Pembayaran</p>
            <span className="text-[9px] font-semibold bg-white/15 px-2 py-0.5 rounded-full text-emerald-50">
              {periodeLabel}
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            Rp {rekap.totalPembayaran.toLocaleString("id-ID")}
          </h2>
        </div>
        <div className="mt-3 text-[10px] font-medium text-emerald-50 flex flex-col gap-0.5 bg-emerald-900/20 p-1.5 rounded backdrop-blur-sm relative z-10">
          <div className="flex justify-between gap-2">
            <span className="flex items-center gap-1">
              <CheckCircle2 size={11} />{" "}
              {isSingleMonth ? "Syahriah:" : `Syahriah (${rekap.jumlahBulan} bln wajib):`}
            </span>
            <span className="font-semibold">Rp {rekap.totalPembayaranSyahriah.toLocaleString("id-ID")}</span>
          </div>
          {rekap.totalPembayaranLainnya > 0 && (
            <div className="flex justify-between gap-2 text-amber-100">
              <span>Lainnya (non-bulanan):</span>
              <span className="font-semibold">Rp {rekap.totalPembayaranLainnya.toLocaleString("id-ID")}</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Tunggakan */}
      <div className={cn(
        "p-4 rounded-xl text-white flex flex-col justify-between shadow-md relative overflow-hidden",
        (rekap.totalTunggakan || 0) > 0 
          ? "bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/20"
          : "bg-gradient-to-br from-slate-700 to-slate-800 shadow-slate-900/20"
      )}>
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-2 -translate-y-2">
          <AlertTriangle size={80} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-[11px] font-medium text-white/70">Sisa Tunggakan Syahriah</p>
            <span className="text-[9px] font-semibold bg-white/15 px-2 py-0.5 rounded-full text-white/90">
              {periodeLabel}
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            Rp {rekap.totalTunggakan.toLocaleString("id-ID")}
          </h2>
        </div>
        <div className="mt-3 text-[10px] font-medium text-white/90 flex flex-col gap-0.5 bg-black/10 p-1.5 rounded backdrop-blur-sm relative z-10">
          {rekap.belumWajibBayar ? (
            <div className="text-white/80">Belum masuk masa tagihan pada periode ini</div>
          ) : (
            <>
              <div className="flex justify-between gap-2">
                <span>Kewajiban Syahriah:</span>
                <span>Rp {rekap.totalKewajiban.toLocaleString("id-ID")}</span>
              </div>
              {isSingleMonth ? (
                detailKurangSingleMonth.length > 0 ? (
                  <div className="text-rose-100 leading-snug">
                    Kurang: {detailKurangSingleMonth.join(" · ")}
                  </div>
                ) : (
                  rekap.statusLunas && (
                    <div className="text-emerald-300 font-semibold">Status: Lunas</div>
                  )
                )
              ) : (
                rekap.bulanMenunggak > 0 && (
                  <div className="flex justify-between gap-2 text-rose-100">
                    <span>Belum Lunas:</span>
                    <span>{rekap.bulanMenunggak} bulan</span>
                  </div>
                )
              )}
              {rekap.totalLebihBayar > 0 && (
                <div className="flex justify-between gap-2 text-emerald-300">
                  <span>Lebih Bayar Syahriah:</span>
                  <span>+ Rp {rekap.totalLebihBayar.toLocaleString("id-ID")}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}