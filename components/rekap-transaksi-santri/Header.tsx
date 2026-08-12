import { ClipboardList } from "lucide-react"

export default function Header() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between shadow-sm relative overflow-hidden">
      <div className="absolute right-0 top-0 -mt-8 -mr-8 w-32 h-32 bg-sky-50 rounded-full blur-2xl opacity-60"></div>
      <div className="flex items-center gap-3 relative z-10">
        <div className="bg-sky-500 p-2.5 rounded-xl text-white shadow-md shadow-sky-500/20">
          <ClipboardList size={20} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">Rekap Transaksi</h1>
          <p className="text-[11px] font-medium text-slate-500 mt-0.5">Lihat riwayat & akumulasi tagihan santri</p>
        </div>
      </div>
    </div>
  )
}