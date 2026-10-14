import { Wallet, AlertTriangle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

export default function MetricCards({ rekap }: { rekap: any }) {
  if (!rekap) return null

  return (
    <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Card Pembayaran */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 rounded-xl text-white shadow-md shadow-emerald-500/20 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-2 -translate-y-2">
          <Wallet size={80} />
        </div>
        <div>
          <p className="text-[11px] font-medium text-emerald-50 mb-1">Total Pembayaran</p>
          <h2 className="text-2xl font-bold tracking-tight">
            Rp {rekap.totalPembayaran.toLocaleString()}
          </h2>
        </div>
        <div className="mt-3 text-[10px] font-medium text-emerald-50 flex items-center gap-1.5 bg-emerald-900/20 w-max px-2 py-1 rounded backdrop-blur-sm">
          <CheckCircle2 size={12} /> Total {rekap.jumlahBulan} bulan aktif
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
        <div>
          <p className="text-[11px] font-medium text-white/70 mb-1">Sisa Tunggakan</p>
          <h2 className="text-2xl font-bold tracking-tight">
            Rp {rekap.totalTunggakan.toLocaleString()}
          </h2>
        </div>
        <div className="mt-3 text-[10px] font-medium text-white/90 flex flex-col gap-0.5 bg-black/10 p-1.5 rounded backdrop-blur-sm relative z-10">
          <div className="flex justify-between">
            <span>Kewajiban:</span>
            <span>Rp {rekap.totalKewajiban.toLocaleString()}</span>
          </div>
          {rekap.totalLebihBayar > 0 && (
            <div className="flex justify-between text-emerald-300">
              <span>Lebih Bayar:</span>
              <span>+ Rp {rekap.totalLebihBayar.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}