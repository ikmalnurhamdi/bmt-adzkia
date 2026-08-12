import { User } from "lucide-react"

export default function SantriProfileCard({ santri, jumlahBulan }: { santri: any, jumlahBulan: number }) {
  return (
    <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col justify-center">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 shrink-0 border-2 border-white shadow-sm">
          <User size={18} />
        </div>
        <div className="overflow-hidden">
          <h3 className="font-bold text-sm text-slate-800 leading-tight truncate">
            {santri.nama_lengkap}
          </h3>
          <div className="inline-block mt-1 px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-semibold text-slate-600 uppercase">
            {santri.jenjang}
          </div>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-[10px] text-slate-400 block mb-0.5">Tgl Masuk</span>
          <span className="font-medium text-slate-700">
            {santri.tanggal_masuk ? new Date(santri.tanggal_masuk).toLocaleDateString('id-ID', {day: 'numeric', month:'short', year:'numeric'}) : '-'}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block mb-0.5">Masa Aktif</span>
          <span className="font-medium text-sky-600">{jumlahBulan} Bulan</span>
        </div>
      </div>
    </div>
  )
}