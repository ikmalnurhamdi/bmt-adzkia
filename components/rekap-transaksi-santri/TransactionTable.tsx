"use client"

import { useState, useMemo } from "react"
import { FileText, Loader2, CheckCircle2, Search, Filter, X, FileSpreadsheet, FileDown } from "lucide-react"
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Array fallback untuk nama bulan
const BULAN_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
]

interface TransactionTableProps {
  transaksi: any[]
  isLoading: boolean
  santriName?: string // Tambahan opsional untuk nama file nanti
}

export default function TransactionTable({ transaksi = [], isLoading, santriName = "Santri" }: TransactionTableProps) {
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
      if (selectedKategori !== "semua" && trx.kategori?.toLowerCase() !== selectedKategori.toLowerCase()) return false
      if (selectedTahun !== "semua" && String(trx.tahun) !== String(selectedTahun)) return false
      
      if (searchTerm.trim() !== "") {
        const query = searchTerm.toLowerCase()
        const bulanName = BULAN_NAMES[(trx.bulan || 1) - 1]?.toLowerCase() || ""
        const kategoriStr = (trx.kategori || "").toLowerCase()
        const tahunStr = String(trx.tahun || "")
        const jumlahStr = String(trx.jumlah_bayar || "")
        // Tambahkan keterangan ke dalam pencarian
        const keteranganStr = (trx.keterangan || "").toLowerCase()

        const matches = 
          bulanName.includes(query) ||
          kategoriStr.includes(query) ||
          tahunStr.includes(query) ||
          jumlahStr.includes(query) ||
          keteranganStr.includes(query)

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

  // ==========================================
  // FITUR EXPORT EXCEL
  // ==========================================
  const handleExportExcel = () => {
    if (filteredTransaksi.length === 0) return;

    // 1. Siapkan struktur data untuk Excel
    const dataToExport = filteredTransaksi.map((trx, index) => ({
      "No": index + 1,
      "Tanggal Input": new Date(trx.created_at).toLocaleDateString('id-ID'),
      "Periode": `${BULAN_NAMES[(trx.bulan || 1) - 1]} ${trx.tahun}`,
      "Kategori": trx.kategori?.toUpperCase(),
      // Logika khusus untuk Excel: Keterangan hanya diisi jika kategori "lainnya"
      "Keterangan": trx.kategori?.toLowerCase() === "lainnya" ? (trx.keterangan || "-") : "-",
      "Nominal (Rp)": trx.jumlah_bayar,
      "Status": "Berhasil"
    }));

    // 2. Buat Worksheet & Workbook
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat Transaksi");

    // 3. Download File
    XLSX.writeFile(workbook, `Rekap_Transaksi_${santriName.replace(/\s+/g, '_')}.xlsx`);
  }

  // ==========================================
  // FITUR EXPORT PDF
  // ==========================================
  const handleExportPDF = () => {
    if (filteredTransaksi.length === 0) return;

    const doc = new jsPDF();
    
    // Header PDF
    doc.setFontSize(14);
    doc.text(`Laporan Transaksi Santri - ${santriName}`, 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 22);

    // Siapkan Data Tabel
    const tableColumn = ["No", "Tanggal Input", "Periode", "Kategori", "Keterangan", "Nominal", "Status"];
    const tableRows = filteredTransaksi.map((trx, index) => [
      index + 1,
      new Date(trx.created_at).toLocaleDateString('id-ID'),
      `${BULAN_NAMES[(trx.bulan || 1) - 1]} ${trx.tahun}`,
      trx.kategori?.toUpperCase(),
      // Logika khusus untuk PDF: Keterangan hanya diisi jika kategori "lainnya"
      trx.kategori?.toLowerCase() === "lainnya" ? (trx.keterangan || "-") : "-",
      `Rp ${trx.jumlah_bayar?.toLocaleString('id-ID')}`,
      "Berhasil"
    ]);

    // Generate Tabel di PDF
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      theme: 'grid',
      styles: { fontSize: 8 }, // Diperkecil menjadi 8 agar muat 7 kolom
      headStyles: { fillColor: [14, 165, 233] } // Warna biru sky-500
    });

    // Download File
    doc.save(`Rekap_Transaksi_${santriName.replace(/\s+/g, '_')}.pdf`);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      
      {/* Header & Controls Bar */}
      <div className="p-3.5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1.5 rounded text-slate-500">
            <FileText size={16} />
          </div>
          <div>
            <h3 className="font-bold text-slate-700 text-xs">Rincian Transaksi Santri</h3>
            <p className="text-[10px] text-slate-400 font-medium">
              Menampilkan {filteredTransaksi.length} transaksi
            </p>
          </div>
        </div>

        {transaksi.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Input Search & Filters... */}
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Cari..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 pr-7 py-1.5 w-full sm:w-32 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-sky-500 transition-all placeholder:text-slate-400"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                  <X size={12} />
                </button>
              )}
            </div>

            <select value={selectedKategori} onChange={e => setSelectedKategori(e.target.value)} className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:border-sky-500 cursor-pointer capitalize">
              <option value="semua">Semua Kategori</option>
              {kategoriOptions.map(kat => <option key={kat} value={kat} className="capitalize">{kat}</option>)}
            </select>

            <select value={selectedTahun} onChange={e => setSelectedTahun(e.target.value)} className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:border-sky-500 cursor-pointer">
              <option value="semua">Semua Tahun</option>
              {tahunOptions.map(thn => <option key={thn} value={thn}>{thn}</option>)}
            </select>

            {isFiltered && (
              <button onClick={handleResetFilter} className="text-[11px] text-red-500 hover:text-red-600 px-2 py-1.5 rounded-lg bg-red-50" title="Reset">
                <X size={12} />
              </button>
            )}

            {/* BATAS PEMISAH */}
            <div className="hidden sm:block w-px h-6 bg-slate-200 mx-1"></div>

            {/* TOMBOL EXPORT */}
            <button 
              onClick={handleExportExcel}
              disabled={filteredTransaksi.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet size={14} />
              <span className="hidden sm:inline">Excel</span>
            </button>

            <button 
              onClick={handleExportPDF}
              disabled={filteredTransaksi.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileDown size={14} />
              <span className="hidden sm:inline">PDF</span>
            </button>

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
            <button onClick={handleResetFilter} className="mt-2.5 text-xs font-semibold text-sky-600 hover:underline">Reset Filter</button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-[10px] font-semibold sticky top-0 z-10 border-b border-slate-100 shadow-sm">
              <tr>
                <th className="px-4 py-2.5">Tgl Input</th>
                <th className="px-4 py-2.5">Periode</th>
                <th className="px-4 py-2.5">Kategori</th>
                <th className="px-4 py-2.5 max-w-[150px]">Keterangan</th>
                <th className="px-4 py-2.5 text-right">Nominal</th>
                <th className="px-4 py-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTransaksi.map(trx => (
                <tr key={trx.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-2 text-[11px] font-medium text-slate-600 whitespace-nowrap">
                    {new Date(trx.created_at).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-[10px] font-medium text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100 whitespace-nowrap">
                      {BULAN_NAMES[(trx.bulan || 1) - 1]} {trx.tahun}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-[10px] font-medium text-slate-500 capitalize">
                    {trx.kategori}
                  </td>
                  <td className="px-4 py-2 text-[10px] text-slate-500">
                    {/* Logika Khusus Keterangan hanya untuk kategori 'lainnya' */}
                    {trx.kategori?.toLowerCase() === "lainnya" ? (
                      <span 
                        className="truncate max-w-[120px] sm:max-w-[180px] inline-block align-middle" 
                        title={trx.keterangan || "Tidak ada keterangan"}
                      >
                        {trx.keterangan || "-"}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-[11px] font-semibold text-slate-700 text-right whitespace-nowrap">
                    Rp {(trx.jumlah_bayar || 0).toLocaleString('id-ID')}
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