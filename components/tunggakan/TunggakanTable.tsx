import { Loader2, Inbox, MessageCircle } from "lucide-react";
import { BULAN_NAMES } from "@/lib/constants";

interface Props {
  isLoading: boolean;
  data: any[];
  filterBulan: number;
}

export function TunggakanTable({ isLoading, data, filterBulan }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-black">
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-900 text-white uppercase text-[9px] font-black tracking-widest sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 border-r border-slate-800">Profil Santri</th>
              <th className="px-4 py-4 text-center border-r border-slate-800">Kategori</th>
              <th className="px-4 py-4 text-right border-r border-slate-800">Dapur</th>
              <th className="px-4 py-4 text-right border-r border-slate-800">Pesantren</th>
              <th className="px-4 py-4 text-right border-r border-slate-800">Sekolah</th>
              <th className="px-4 py-4 text-right bg-red-800 text-white font-black">Total Tagihan</th>
              <th className="px-6 py-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-32 text-center">
                  <Loader2 className="animate-spin mx-auto text-red-600 w-10 h-10" />
                  <p className="text-[10px] font-black text-slate-400 uppercase mt-4 tracking-widest">Sinkronisasi Tagihan...</p>
                </td>
              </tr>
            ) : data.length > 0 ? (
              data.map((s) => (
                <tr key={s.id} className="group hover:bg-red-50/20 transition-colors">
                  <td className="px-6 py-4 border-r border-slate-50">
                    <div className="font-black text-xs uppercase text-slate-900 leading-none">{s.nama_lengkap}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase mt-1 italic">Wali: {s.nama_wali || "-"}</div>
                  </td>
                  <td className="px-4 py-4 text-center font-black text-[9px] uppercase text-sky-700 bg-sky-50/50 border-r border-slate-50">
                    {s.jenjang}
                  </td>
                  <td className="px-4 py-4 text-right font-bold text-xs border-r border-slate-50 text-slate-600">
                    {s.sisaD > 0 ? `Rp ${s.sisaD.toLocaleString()}` : <span className="text-slate-200">-</span>}
                  </td>
                  <td className="px-4 py-4 text-right font-bold text-xs border-r border-slate-50 text-slate-600">
                    {s.sisaP > 0 ? `Rp ${s.sisaP.toLocaleString()}` : <span className="text-slate-200">-</span>}
                  </td>
                  <td className="px-4 py-4 text-right font-bold text-xs border-r border-slate-50 text-slate-600">
                    {s.sisaS > 0 ? `Rp ${s.sisaS.toLocaleString()}` : <span className="text-slate-200">-</span>}
                  </td>
                  <td className="px-4 py-4 text-right font-black text-xs bg-red-50 text-red-700 border-r border-slate-50">
                    Rp {s.totalSisa.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => {
                        const phone = s.hp_wali?.replace(/^0/, '62').replace(/[^\d]/g, '');
                        const pesan = `Assalamu'alaikum Bapak/Ibu ${s.nama_wali}. Mengingatkan tunggakan syahriah Ananda ${s.nama_lengkap} periode ${BULAN_NAMES[filterBulan-1]} sebesar Rp ${s.totalSisa.toLocaleString()}. Mohon segera diselesaikan. Syukran.`;
                        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(pesan)}`, '_blank');
                      }} 
                      className="bg-emerald-500 hover:bg-black text-white p-2.5 rounded-xl transition-all active:scale-95 shadow-md flex items-center justify-center mx-auto"
                    >
                      <MessageCircle size={18} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-24 text-center">
                  <Inbox className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Semua santri sudah lunas</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}