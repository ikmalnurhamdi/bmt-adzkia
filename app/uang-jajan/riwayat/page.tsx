"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import { 
  History, Search, Download, ArrowLeft, Loader2, Printer, Filter, Calendar
} from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

const BULAN_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

export default function RiwayatJajanPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState("uang-jajan")
  const [isOpenMobile, setIsOpenMobile] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterBulan, setFilterBulan] = useState(new Date().getMonth() + 1)
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
    loadLogs()
  }, [filterBulan, filterTahun])

  async function loadLogs() {
    setLoading(true)
    const { data } = await getSupabase()
      .from("log_uang_jajan")
      .select(`*, santri(nama_lengkap, kelas)`)
      .order("created_at", { ascending: false })
    
    setLogs(data || [])
    setLoading(false)
  }

  // --- LOGIKA FILTER BERDASARKAN BULAN & TAHUN ---
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const date = new Date(log.created_at)
      const matchesSearch = log.santri?.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            log.keterangan?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesMonth = (date.getMonth() + 1) === filterBulan
      const matchesYear = date.getFullYear() === filterTahun
      
      return matchesSearch && matchesMonth && matchesYear
    })
  }, [logs, searchTerm, filterBulan, filterTahun])

  // --- FITUR CETAK PDF PROFESIONAL ---
  const exportPDF = () => {
    const doc = new jsPDF()
    
    // Header ala Dokumen Kantor
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.text("LAPORAN MUTASI TABUNGAN UANG SAKU SANTRI", 105, 15, { align: "center" })
    
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`Periode: ${BULAN_NAMES[filterBulan-1]} ${filterTahun}`, 105, 21, { align: "center" })
    doc.line(14, 25, 196, 25) // Garis Horizontal

    const tableBody = filteredLogs.map((log, index) => [
      index + 1,
      new Date(log.created_at).toLocaleDateString('id-ID'),
      log.santri?.nama_lengkap.toUpperCase(),
      log.santri?.kelas || "-",
      log.keterangan || (log.tipe === 'MASUK' ? 'DEPOSIT' : 'PENARIKAN'),
      log.tipe === 'MASUK' ? `+${log.nominal.toLocaleString()}` : `-${log.nominal.toLocaleString()}`,
      log.saldo_akhir.toLocaleString()
    ])

    autoTable(doc, {
      startY: 30,
      head: [['No', 'Tanggal', 'Nama Santri', 'Kls', 'Keterangan', 'Nominal (Rp)', 'Saldo (Rp)']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], fontSize: 9, halign: 'center' },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        5: { halign: 'right' },
        6: { halign: 'right' }
      },
      didDrawPage: (data) => {
        doc.setFontSize(8)
        doc.text(`Halaman ${data.pageNumber}`, 196, 285, { align: "right" })
      }
    })

    doc.save(`Laporan_Uang_Saku_${BULAN_NAMES[filterBulan-1]}_${filterTahun}.pdf`)
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-black">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpenMobile={isOpenMobile} setIsOpenMobile={setIsOpenMobile} />
      
      <main className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setIsOpenMobile(true)} />
        
        <div className="p-4 lg:p-6 space-y-4">
          {/* HEADER MINIMALIS */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/uang-jajan")} className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-all">
                <ArrowLeft size={16} className="text-slate-600" />
              </button>
              <div>
                <h2 className="text-lg font-black text-sky-900 uppercase tracking-tighter leading-none">Riwayat Mutasi</h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Log Aktivitas Keuangan Santri</p>
              </div>
            </div>

            <button onClick={exportPDF} className="bg-slate-800 hover:bg-black text-white font-bold px-4 py-2 rounded-md text-[10px] uppercase flex items-center gap-2 transition-all shadow-md">
              <Printer size={14} /> CETAK PDF
            </button>
          </div>

          {/* TOOLBAR FILTER */}
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[300px]">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                <input 
                  type="text" 
                  placeholder="Cari santri..." 
                  className="w-full pl-9 pr-4 py-1.5 rounded border border-slate-200 text-[11px] font-bold focus:border-sky-600 outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                <Calendar size={12} className="text-slate-400" />
                <select value={filterBulan} onChange={(e) => setFilterBulan(Number(e.target.value))} className="bg-transparent text-[10px] font-black uppercase outline-none cursor-pointer">
                  {BULAN_NAMES.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
                </select>
                <span className="text-slate-300 mx-1">|</span>
                <select value={filterTahun} onChange={(e) => setFilterTahun(Number(e.target.value))} className="bg-transparent text-[10px] font-black outline-none cursor-pointer">
                  {[2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            
            <div className="text-[10px] font-bold text-slate-500 italic">
              Menampilkan {filteredLogs.length} data ditemukan
            </div>
          </div>

          {/* TABLE AREA - WITH SCROLL */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse sticky-header">
                <thead className="bg-[#1e293b] text-slate-100 uppercase text-[9px] font-black tracking-widest sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-3 border-r border-slate-700">Waktu</th>
                    <th className="px-5 py-3 border-r border-slate-700">Nama Santri</th>
                    <th className="px-5 py-3 border-r border-slate-700">Keterangan</th>
                    <th className="px-4 py-3 text-right border-r border-slate-700">Nominal</th>
                    <th className="px-5 py-3 text-right">Sisa Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                         <div className="flex flex-col items-center gap-2">
                            <Loader2 className="animate-spin text-sky-600" size={24} />
                            <span className="text-[10px] font-black text-slate-400 uppercase">Menyinkronkan Data...</span>
                         </div>
                      </td>
                    </tr>
                  ) : filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-2.5">
                          <div className="text-[10px] font-black text-slate-900 uppercase">
                            {new Date(log.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                          </div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase">
                            {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-5 py-2.5">
                          <div className="text-[11px] font-black text-slate-800 uppercase leading-none">{log.santri?.nama_lengkap}</div>
                          <div className="text-[9px] font-bold text-sky-600 uppercase mt-0.5">Kls: {log.santri?.kelas || '-'}</div>
                        </td>
                        <td className="px-5 py-2.5">
                          <span className={cn(
                            "text-[8px] font-black px-1.5 py-0.5 rounded border uppercase inline-block",
                            log.tipe === 'MASUK' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-orange-50 text-orange-700 border-orange-100"
                          )}>
                            {log.keterangan || (log.tipe === 'MASUK' ? 'DEPOSIT' : 'PENARIKAN')}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-black text-[11px]">
                          <div className={cn(log.tipe === 'MASUK' ? "text-emerald-600" : "text-red-600")}>
                            {log.tipe === 'MASUK' ? '+' : '-'} {log.nominal.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-5 py-2.5 text-right font-black text-slate-900 text-[11px]">
                          {log.saldo_akhir.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-slate-400 font-bold uppercase text-[9px]">
                        Data tidak ditemukan pada periode ini
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        .sticky-header thead th {
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  )
}