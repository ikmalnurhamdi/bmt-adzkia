import { Search } from "lucide-react";
import { BULAN_NAMES } from "@/modules/bmt/lib/constants";

interface Props {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  filterBulan: number;
  setFilterBulan: (val: number) => void;
  filterTahun: number;
  setFilterTahun: (val: number) => void;
  onRefresh: () => void;
  availableYears?: number[]; // Optional prop for available years
}

export function TunggakanToolbar({ 
  searchTerm, setSearchTerm, 
  filterBulan, setFilterBulan, 
  filterTahun, setFilterTahun,
  availableYears = [], // Berikan nilai default array kosong agar map() tidak error
  onRefresh
}: Props) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-3 flex-1">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Cari Nama Santri atau NIS..." 
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-red-500 bg-slate-50 transition-all" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <select value={filterBulan} onChange={(e) => setFilterBulan(Number(e.target.value))} className="bg-transparent text-[10px] font-black uppercase outline-none px-3 cursor-pointer">
            {BULAN_NAMES.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
          </select> 
          {/* Tag Penutup <select> diatas ditambahkan kembali */}

          <div className="w-px h-4 bg-slate-200"></div> {/* Divider pemisah bulan dan tahun dikembalikan */}

          <select value={filterTahun} onChange={(e) => setFilterTahun(Number(e.target.value))} className="bg-transparent text-[10px] font-black outline-none px-3 cursor-pointer">
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>
      <button onClick={onRefresh} className="bg-white border-b-4 border-slate-200 hover:bg-slate-50 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm">
        Refresh Data
      </button>
    </div>
  );
}