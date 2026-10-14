import { Search, Loader2, TrendingUp } from "lucide-react"

interface SantriSearchProps {
  searchTerm: string
  setSearchTerm: (val: string) => void
  isLoading: boolean
  filteredList: any[]
  onSelect: (santri: any) => void
}

export default function SantriSearch({ searchTerm, setSearchTerm, isLoading, filteredList, onSelect }: SantriSearchProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative z-20">
      <div className="max-w-md">
        <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">
          Cari Santri
        </label>
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="absolute left-3 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Ketik Nama atau NIS..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-sky-500 bg-slate-50 transition-all focus:bg-white shadow-inner"
            />
            {isLoading && <Loader2 className="absolute right-3 w-4 h-4 text-sky-500 animate-spin" />}
          </div>

          {searchTerm && filteredList.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-50">
              {filteredList.map(santri => (
                <button
                  key={santri.id}
                  onClick={() => onSelect(santri)}
                  className="w-full text-left px-3 py-2.5 hover:bg-sky-50 border-b last:border-b-0 border-slate-100 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="font-semibold text-sm text-slate-700">{santri.nama_lengkap}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">NIS: {santri.nis || "-"} | {santri.jenjang}</div>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-sky-200 text-sky-600 transition-colors">
                    <TrendingUp size={12} />
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchTerm && filteredList.length === 0 && !isLoading && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-center z-50 text-xs text-slate-500">
              Santri tidak ditemukan.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}