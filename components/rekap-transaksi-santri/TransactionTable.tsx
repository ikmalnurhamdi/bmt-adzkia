"use client"

import { useState, useMemo } from "react"
import { FileText, Loader2, CheckCircle2, Search, Filter, X } from "lucide-react"

// Array fallback untuk nama bulan
const BULAN_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
]

export default function TransactionTable({ transaksi = [], isLoading }: { transaksi: any[], isLoading: boolean }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedKategori, setSelectedKategori] = useState("semua")
  const [selectedTahun, setSelectedTahun] = useState("semua")

  // Opsi kategori unik otomatis dari data
  const kategoriOptions = useMemo(() => {
    const set = new Set<string>()
    transaksi.forEach(t => {
      if (t.kategori) set.add(t.kategori)
    })
    return Array.from(set)
  }, [transaksi])

  // Opsi tahun unik otomatis dari data
  const tahunOptions = useMemo(() => {
    const set = new Set<string | number>()
    transaksi.forEach(t => {
      if (t.tahun) set.add(t.tahun)
    })
    return Array.from(set).sort((a, b) => Number(b) - Number(a))
  }, [transaksi])

  // Filter logika transaksi
  const filteredTransaksi = useMemo(() => {
    return transaksi.filter(trx => {
      // 1. Filter Kategori
      if (selectedKategori !== "semua" && trx.kategori?.toLowerCase() !== selectedKategori.toLowerCase()) {
        return false
      }

      // 2. Filter Tahun
      if (selectedTahun !== "semua" && String(trx.tahun) !== String(selectedTahun)) {
        return false
      }

      // 3. Pencarian Teks (Bulan, Kategori, Tahun, Nominal)
      if (searchTerm.trim() !== "") {
        const query = searchTerm.toLowerCase()
        const bulanName = BULAN_NAMES[(trx.bulan || 1) - 1]?.toLowerCase() || ""
        const kategoriStr = (trx.kategori || "").toLowerCase()
        const tahunStr = String(trx.tahun || "")
        const jumlahStr = String(trx.jumlah_bayar || "")

        const matches = 
          bulanName.includes(query) ||
          kategoriStr.includes(query) ||
          tahunStr.includes(query) ||
          jumlahStr.includes(query)

        if (!matches) return false
      }

      return true
    })
  }, [transaksi, searchTerm, selectedKategori, selectedTahun])

  const handleResetFilter = () => {
    setSearchTerm("")
    setSelectedKategori("semua")
    setSelectedTahun("semua")
  }

  const isFiltered = searchTerm !== "" || selectedKategori !== "semua" || selectedTahun !== "semua"

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      
      {/* Header & Controls Bar */}
      <div className="p-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1.5 rounded text-slate-500">
            <FileText size={16} />
          </div>
          <div>
            <h3 className="font-bold text-slate-700 text-xs">Rincian Transaksi Santri</h3>
            <p className="text-[10px] text-slate-400 font-medium">
              Menampilkan {filteredTransaksi.length} dari {transaksi.length} transaksi
            </p>
          </div>
        </div>

        {transaksi.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Input Search */}
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Cari transaksi..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 pr-7 py-1.5 w-full sm:w-36 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-sky-500 transition-all placeholder:text-slate-400"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Select Kategori */}
            {kategoriOptions.length > 0 && (
              <select
                value={selectedKategori}
                onChange={e => setSelectedKategori(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:border-sky-500 transition-all cursor-pointer capitalize"
              >
                <option value="semua">Semua Kategori</option>
                {kategoriOptions.map(kat => (
                  <option key={kat} value={kat} className="capitalize">
                    {kat}
                  </option>
                ))}
              </select>
            )}

            {/* Select Tahun */}
            {tahunOptions.length > 0 && (
              <select
                value={selectedTahun}
                onChange={e => setSelectedTahun(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:border-sky-500 transition-all cursor-pointer"
              >
                <option value="semua">Semua Tahun</option>
                {tahunOptions.map(thn => (
                  <option key={thn} value={thn}>
                    {thn}
                  </option>
                ))}
              </select>
            )}

            {/* Reset Button */}
            {isFiltered && (
              <button
                onClick={handleResetFilter}
                className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-600 font-medium px-2 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                title="Reset Filter"
              >
                <X size={12} />
                Reset
              </button>
            )}

          </div>
        )}
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mb-2 text-sky-500" />
            <p className="text-[11px] font-medium">Memuat Transaksi...</p>
          </div>
        ) : transaksi.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <FileText className="w-8 h-8 mb-2 text-slate-200" />
            <p className="text-[11px] font-medium">Belum ada transaksi</p>
          </div>
        ) : filteredTransaksi.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <Filter className="w-6 h-6 mb-2 text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">Tidak ada data yang cocok</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Coba ubah kata kunci atau pilihan filter Anda.</p>
            <button
              onClick={handleResetFilter}
              className="mt-2.5 text-xs font-semibold text-sky-600 hover:underline"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-[10px] font-semibold sticky top-0 z-10 border-b border-slate-100">
              <tr>
                <th className="px-4 py-2.5">Tgl Input</th>
                <th className="px-4 py-2.5">Periode</th>
                <th className="px-4 py-2.5">Kategori</th>
                <th className="px-4 py-2.5 text-right">Nominal</th>
                <th className="px-4 py-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTransaksi.map(trx => (
                <tr key={trx.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-2 text-[11px] font-medium text-slate-600">
                    {new Date(trx.created_at).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-[10px] font-medium text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">
                      {BULAN_NAMES[(trx.bulan || 1) - 1]} {trx.tahun}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-[10px] font-medium text-slate-500 capitalize">
                    {trx.kategori}
                  </td>
                  <td className="px-4 py-2 text-[11px] font-semibold text-slate-700 text-right">
                    Rp {(trx.jumlah_bayar || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100">
                      <CheckCircle2 size={10} />
                      <span className="text-[9px] font-medium">Berhasil</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}