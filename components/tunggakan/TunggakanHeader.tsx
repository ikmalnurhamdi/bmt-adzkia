import { AlertTriangle, Calendar, TrendingUp, Wallet } from "lucide-react";
import { BULAN_NAMES } from "@/lib/constants";

interface Props {
  filterBulan: number;
  filterTahun: number;
  totalMasuk: number;
  totalTunggakan: number;
}

export function TunggakanHeader({ filterBulan, filterTahun, totalMasuk, totalTunggakan }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="bg-red-50 p-3 rounded-2xl text-red-600 shadow-inner">
          <AlertTriangle size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Daftar Tunggakan</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
            <Calendar size={12} className="text-sky-500" /> Periode: {BULAN_NAMES[filterBulan - 1]} {filterTahun}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl min-w-[160px] shadow-sm text-center">
          <div className="flex items-center justify-center gap-2 text-emerald-600 mb-1">
            <TrendingUp size={14} /> <span className="text-[8px] font-black uppercase">Pembayaran</span>
          </div>
          <p className="text-sm font-black text-emerald-700 tracking-tight">Rp {totalMasuk.toLocaleString()}</p>
        </div>
        <div className="bg-red-50 border border-red-100 p-3 rounded-2xl min-w-[160px] shadow-sm text-center">
          <div className="flex items-center justify-center gap-2 text-red-600 mb-1">
            <Wallet size={14} /> <span className="text-[8px] font-black uppercase">Tunggakan</span>
          </div>
          <p className="text-sm font-black text-red-700 tracking-tight">Rp {totalTunggakan.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}