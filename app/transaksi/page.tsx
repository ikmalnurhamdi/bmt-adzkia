"use client"

import { useState, useEffect, useMemo } from "react"
// PERBAIKAN: Menambahkan 'History' ke dalam destructured import lucide-react
import { Plus, Search, Receipt, CheckCircle2, Loader2, AlertCircle, Trash2, Calendar, FileText, History } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import Swal from "sweetalert2"
import { cn } from "@/lib/utils"

// Import Helper & Komponen Hasil Refactor
import { BULAN_NAMES, YEAR_OPTIONS, cetakKwitansiPDF, getTargetDinamis } from "./utils/transactionHelpers"
import PaymentCell from "./components/PaymentCell"
import PaymentModal from "./components/PaymentModal"
import HistoryModal from "./components/HistoryModal"

export default function TransaksiPage() {
  const [santriList, setSantriList] = useState<any[]>([])
  const [pembayaranList, setPembayaranList] = useState<any[]>([])
  const [masterTarif, setMasterTarif] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterBulan, setFilterBulan] = useState(new Date().getMonth() + 1)
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear())
  const [printingId, setPrintingId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)

  useEffect(() => { loadAllData() }, [filterBulan, filterTahun])

  async function loadAllData() {
    const supabase = getSupabase()
    const [resSantri, resPay, resTarif] = await Promise.all([
      supabase.from("santri").select("*").order("nama_lengkap", { ascending: true }),
      supabase.from("transaksi_pembayaran_v2").select("*").eq("bulan", filterBulan).eq("tahun", filterTahun),
      supabase.from("tarif").select("*").eq("angkatan", 2026)
    ])
    setSantriList(resSantri.data || [])
    setPembayaranList(resPay.data || [])
    setMasterTarif(resTarif.data || [])
  }

  const santriWithTransactions = useMemo(() => {
    const idsWithTrx = new Set(pembayaranList.map(p => p.santri_id))
    return santriList.filter(s =>
      idsWithTrx.has(s.id) &&
      (s.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) || (s.nis && s.nis.toString().includes(searchTerm)))
    )
  }, [santriList, pembayaranList, searchTerm])

  const handleDeleteSingleTrx = async (id: string) => {
    await getSupabase().from("transaksi_pembayaran_v2").delete().eq("id", id)
    loadAllData()
  }

  const handleDeleteTrxBySantri = async (s: any) => {
    const res = await Swal.fire({
      title: 'Hapus Transaksi?',
      text: `Hapus seluruh catatan pembayaran ${s.nama_lengkap} pada periode ini?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Hapus'
    })
    if (res.isConfirmed) {
      try {
        const { error } = await getSupabase()
          .from("transaksi_pembayaran_v2")
          .delete()
          .eq("santri_id", s.id)
          .eq("bulan", filterBulan)
          .eq("tahun", filterTahun)
        if (error) throw error
        Swal.fire({ icon: 'success', title: 'Data dihapus', timer: 1000, showConfirmButton: false })
        loadAllData()
      } catch (err: any) {
        Swal.fire("Gagal", err.message, "error")
      }
    }
  }

  const handleCetakKwitansi = async (s: any) => {
    setPrintingId(s.id)
    await cetakKwitansiPDF(s, filterBulan, filterTahun, pembayaranList, masterTarif)
    setPrintingId(null)
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 font-sans text-slate-800 bg-slate-50 min-h-screen">
      
      {/* ── HEADER ── */}
      <div className="bg-white border rounded-2xl p-5 flex flex-col sm:flex-row gap-4 sm:items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-sky-100 p-2.5 rounded-xl">
            <Receipt size={22} className="text-sky-700" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">Monitoring Transaksi</h1>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <Calendar size={11} className="text-sky-500" />
              Periode: <span className="text-sky-600 font-bold">{BULAN_NAMES[filterBulan - 1]} {filterTahun}</span>
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setIsHistoryModalOpen(true)} 
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase px-4 py-2.5 rounded-xl transition-all border border-slate-200"
          >
            <History size={14} /> Riwayat Tahunan
          </button>

          <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center gap-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-black uppercase px-5 py-2.5 rounded-xl transition-all shadow-md">
            <Plus size={15} strokeWidth={3} /> Input Pembayaran
          </button>
        </div>
      </div>

      {/* ── TABLE AREA ── */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text" placeholder="Cari nama atau NIS..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border text-xs bg-slate-50 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-slate-50">
            <select value={filterBulan} onChange={e => setFilterBulan(Number(e.target.value))} className="text-xs font-bold uppercase bg-transparent outline-none">
              {BULAN_NAMES.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
            </select>
            <div className="w-px h-4 bg-slate-200" />
            <select value={filterTahun} onChange={e => setFilterTahun(Number(e.target.value))} className="text-xs font-bold bg-transparent outline-none">
              {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <span className="text-xs text-slate-400">{santriWithTransactions.length} santri</span>
        </div>

        <div className="overflow-x-auto max-h-[560px]">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-5 py-3.5 border-r border-slate-700">Santri</th>
                <th className="px-4 py-3.5 text-center border-r border-slate-700">Jenjang</th>
                <th className="px-4 py-3.5 text-center border-r border-slate-700">Dapur</th>
                <th className="px-4 py-3.5 text-center border-r border-slate-700">Pesantren</th>
                <th className="px-4 py-3.5 text-center border-r border-slate-700">Sekolah</th>
                <th className="px-4 py-3.5 text-center border-r border-slate-700">Lainnya</th>
                <th className="px-4 py-3.5 text-center border-r border-slate-700">Status</th>
                <th className="px-4 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {santriWithTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-400">Belum ada transaksi pada periode ini.</td>
                </tr>
              ) : santriWithTransactions.map(s => {
                const targetD = getTargetDinamis(s, "dapur", masterTarif)
                const targetP = getTargetDinamis(s, "pesantren", masterTarif)
                const targetS = getTargetDinamis(s, "sekolah", masterTarif)
                
                const bayarD = pembayaranList.filter(p => p.santri_id === s.id && p.kategori === "dapur").reduce((a, b) => a + b.jumlah_bayar, 0)
                const bayarP = pembayaranList.filter(p => p.santri_id === s.id && p.kategori === "pesantren").reduce((a, b) => a + b.jumlah_bayar, 0)
                const bayarS = pembayaranList.filter(p => p.santri_id === s.id && p.kategori === "sekolah").reduce((a, b) => a + b.jumlah_bayar, 0)
                
                // Transaksi khusus lainnya
                const trxLainnya = pembayaranList.filter(p => p.santri_id === s.id && p.kategori === "lainnya")
                
                // Status hanya memperhitungkan Dapur, Pesantren, dan Sekolah
                const isFullyLunas = (bayarD >= targetD) && (bayarP >= targetP) && (bayarS >= targetS)

                return (
                  <tr key={s.id} className={cn("hover:bg-slate-50/70 text-sm", isFullyLunas && "bg-emerald-50/30")}>
                    <td className="px-5 py-3 border-r border-slate-50 align-top">
                      <div className="font-bold text-xs uppercase text-slate-800">{s.nama_lengkap}</div>
                      <div className="text-[10px] text-sky-600 font-semibold mt-0.5">NIS: {s.nis || "—"}</div>
                    </td>
                    <td className="px-4 py-3 border-r text-center align-top">
                      <span className="text-[9px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-1 rounded-full">{s.jenjang}</span>
                    </td>
                    <td className="px-4 py-3 border-r text-center align-top">
                      <PaymentCell santri={s} jenis="dapur" pembayaranList={pembayaranList} masterTarif={masterTarif} onDeleteSingleTrx={handleDeleteSingleTrx} />
                    </td>
                    <td className="px-4 py-3 border-r text-center align-top">
                      <PaymentCell santri={s} jenis="pesantren" pembayaranList={pembayaranList} masterTarif={masterTarif} onDeleteSingleTrx={handleDeleteSingleTrx} />
                    </td>
                    <td className="px-4 py-3 border-r text-center align-top">
                      <PaymentCell santri={s} jenis="sekolah" pembayaranList={pembayaranList} masterTarif={masterTarif} onDeleteSingleTrx={handleDeleteSingleTrx} />
                    </td>
                    
                    {/* KOLOM LAINNYA */}
                    <td className="px-4 py-3 border-r text-center align-top">
                      {trxLainnya.length > 0 ? (
                        <div className="flex flex-col gap-1.5 items-center">
                          {trxLainnya.map(trx => (
                            <div key={trx.id} className="group relative flex flex-col items-center bg-white border border-slate-200 px-2 py-1 rounded-md w-full min-w-[70px]">
                              <span className="text-[10px] font-bold text-slate-700">
                                Rp {trx.jumlah_bayar.toLocaleString('id-ID')}
                              </span>
                              {trx.keterangan && (
                                <span className="text-[9px] text-slate-500 lowercase text-center leading-tight mt-0.5">
                                  {trx.keterangan}
                                </span>
                              )}
                              <button 
                                onClick={() => handleDeleteSingleTrx(trx.id)}
                                className="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 bg-red-100 text-red-600 p-1 rounded-full shadow-sm transition-opacity"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-[10px]">-</span>
                      )}
                    </td>

                    <td className="px-4 py-3 border-r text-center align-top">
                      {isFullyLunas ? (
                        <div className="flex flex-col items-center gap-1 mt-1">
                          <CheckCircle2 size={16} className="text-emerald-500" />
                          <span className="text-[9px] font-bold text-emerald-600 uppercase">Lunas</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 mt-1">
                          <AlertCircle size={16} className="text-orange-400" />
                          <span className="text-[9px] font-bold text-orange-500 uppercase">Kurang</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center align-top">
                      <div className="flex items-center justify-center gap-1 mt-0.5">
                        <button onClick={() => handleCetakKwitansi(s)} disabled={printingId === s.id} className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg">
                          {printingId === s.id ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
                        </button>
                        <button onClick={() => handleDeleteTrxBySantri(s)} className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL COMPONENT ── */}
      <PaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        santriList={santriList}
        onSuccessSave={loadAllData}
      />

      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        santriList={santriList}
        masterTarif={masterTarif}
      />

    </div>
  )
}