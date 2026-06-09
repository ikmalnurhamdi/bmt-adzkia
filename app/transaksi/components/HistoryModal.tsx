"use client"

import { useState, useMemo, useEffect } from "react"
import { X, History, Loader2, Calendar, CheckCircle2, AlertCircle, Minus } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { BULAN_NAMES, YEAR_OPTIONS, getTargetDinamis } from "../utils/transactionHelpers"

interface HistoryModalProps {
  isOpen: boolean
  onClose: () => void
  santriList: any[]
  masterTarif: any[]
}

export default function HistoryModal({ isOpen, onClose, santriList, masterTarif }: HistoryModalProps) {
  const [searchSantri, setSearchSantri] = useState("")
  const [selectedSantri, setSelectedSantri] = useState<any | null>(null)
  const [selectedTahun, setSelectedTahun] = useState(new Date().getFullYear())
  const [pembayaranHistory, setPembayaranHistory] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // Ambil riwayat pembayaran ketika santri atau tahun diubah
  useEffect(() => {
    if (selectedSantri) {
      fetchHistory()
    } else {
      setPembayaranHistory([])
    }
  }, [selectedSantri, selectedTahun])

  async function fetchHistory() {
    setIsLoadingHistory(true)
    const { data } = await getSupabase()
      .from("transaksi_pembayaran_v2")
      .select("*")
      .eq("santri_id", selectedSantri.id)
      .eq("tahun", selectedTahun)
    setPembayaranHistory(data || [])
    setIsLoadingHistory(false)
  }

  const filteredSantri = useMemo(() => {
    if (!searchSantri) return []
    return santriList.filter(s =>
      s.nama_lengkap.toLowerCase().includes(searchSantri.toLowerCase()) ||
      (s.nis && s.nis.toString().includes(searchSantri))
    ).slice(0, 5)
  }, [santriList, searchSantri])

  // Helper untuk merender status per kategori per bulan
  const renderStatusKategori = (bulanIndex: number, kategori: string) => {
    const target = getTargetDinamis(selectedSantri, kategori, masterTarif)
    
    // Jika target tarif 0, berarti santri tidak dikenakan biaya ini
    if (target === 0) return <span className="text-slate-300 font-bold text-[10px]">—</span>

    const totalBayar = pembayaranHistory
      .filter(p => p.bulan === bulanIndex && p.kategori === kategori)
      .reduce((sum, item) => sum + item.jumlah_bayar, 0)

    if (totalBayar >= target) {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
          Lunas
        </span>
      )
    } else if (totalBayar > 0) {
      return (
        <div className="flex flex-col items-center">
          <span className="text-orange-600 font-bold text-[10px] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
            Kurang
          </span>
          <span className="text-[9px] text-slate-400 mt-0.5">Sisa: {(target - totalBayar).toLocaleString()}</span>
        </div>
      )
    } else {
      return (
        <div className="flex flex-col items-center">
          <span className="text-red-500 font-bold text-[10px] bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
            Belum
          </span>
          <span className="text-[9px] text-slate-400 mt-0.5">Rp {target.toLocaleString()}</span>
        </div>
      )
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Modal */}
        <div className="bg-slate-800 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <History size={18} className="text-sky-400" />
            <h2 className="text-sm font-black uppercase tracking-wide">Riwayat Transaksi Tahunan</h2>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Konten Utama */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          
          {/* Baris Pencarian & Pilih Tahun */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2 space-y-1.5 relative">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Cari Santri</label>
              {selectedSantri ? (
                <div className="flex items-center justify-between bg-slate-50 border rounded-xl px-4 py-2">
                  <div>
                    <div className="text-xs font-black uppercase text-slate-800">{selectedSantri.nama_lengkap}</div>
                    <div className="text-[10px] text-sky-600 font-semibold mt-0.5">{selectedSantri.jenjang} · Kelas {selectedSantri.kelas}</div>
                  </div>
                  <button type="button" onClick={() => setSelectedSantri(null)} className="text-xs font-bold text-red-500 hover:bg-red-50 px-2.5 py-1 rounded-lg">Ganti</button>
                </div>
              ) : (
                <>
                  <input
                    type="text" placeholder="Ketik nama atau NIS santri..."
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none bg-slate-50 focus:border-slate-400"
                    value={searchSantri} onChange={e => setSearchSantri(e.target.value)}
                  />
                  {filteredSantri.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-50 overflow-hidden">
                      {filteredSantri.map(s => (
                        <div key={s.id} onClick={() => { setSelectedSantri(s); setSearchSantri("") }} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-50">
                          <div>
                            <div className="text-xs font-bold uppercase text-slate-800">{s.nama_lengkap}</div>
                            <div className="text-[10px] text-slate-400">NIS: {s.nis || "—"}</div>
                          </div>
                          <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{s.jenjang}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Tahun Riwayat</label>
              <select 
                value={selectedTahun} 
                onChange={e => setSelectedTahun(Number(e.target.value))} 
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 outline-none"
              >
                {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Tabel Riwayat Bulanan (Hanya Muncul Jika Santri Sudah Terpilih) */}
          {selectedSantri ? (
            isLoadingHistory ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="animate-spin text-slate-600" size={24} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Menyusun Laporan Tahunan...</span>
              </div>
            ) : (
              <div className="border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b text-[9px] font-black uppercase text-slate-500 tracking-wider">
                      <th className="px-4 py-3">Bulan ({selectedTahun})</th>
                      <th className="px-4 py-3 text-center">Syahriah Dapur</th>
                      <th className="px-4 py-3 text-center">Syahriah Pesantren</th>
                      <th className="px-4 py-3 text-center">Syahriah Sekolah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs">
                    {Array.from({ length: 12 }, (_, index) => {
                      const bulanMasehi = index + 1;
                      return (
                        <tr key={bulanMasehi} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3.5 font-bold text-slate-700">
                            {BULAN_NAMES[index]}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {renderStatusKategori(bulanMasehi, "dapur")}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {renderStatusKategori(bulanMasehi, "pesantren")}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {renderStatusKategori(bulanMasehi, "sekolah")}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="py-16 border border-dashed rounded-xl flex flex-col items-center justify-center text-slate-400 bg-slate-50">
              <Calendar size={32} className="text-slate-300 mb-2" />
              <p className="text-xs font-semibold">Silakan pilih santri terlebih dahulu untuk melihat riwayat iuran</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}