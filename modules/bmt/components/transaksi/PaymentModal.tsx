"use client"

import { useState, useMemo, useEffect } from "react"
import { X, Banknote, Loader2, Trash2 } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import Swal from "sweetalert2"
import { cn } from "@/lib/utils"
import { BULAN_NAMES, CURRENT_YEAR, YEAR_OPTIONS } from "@/modules/bmt/lib/transactionHelpers"

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  santriList: any[]
  onSuccessSave: () => void
}

export default function PaymentModal({ isOpen, onClose, santriList, onSuccessSave }: PaymentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchSantriInModal, setSearchSantriInModal] = useState("")
  const [selectedSantri, setSelectedSantri] = useState<any | null>(null)
  const [selectedTahunBayar, setSelectedTahunBayar] = useState(CURRENT_YEAR)
  
  // Ubah inisialisasi agar sesuai dengan format array (meskipun kita batasi ke 1 nanti)
  const [selectedBulanList, setSelectedBulanList] = useState<number[]>([new Date().getMonth() + 1])
  
  const [keterangan, setKeterangan] = useState("")
  const [santriHistory, setSantriHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // TAMBAHAN: nominal_lainnya
  const [nominals, setNominals] = useState({
    nominal_dapur: "", 
    nominal_pesantren: "", 
    nominal_sekolah: "", 
    nominal_total: "",
    nominal_lainnya: "" 
  })

  useEffect(() => {
    if (selectedSantri) loadSantriHistory(selectedSantri.id)
  }, [selectedSantri])

  async function loadSantriHistory(santriId: string) {
    setLoadingHistory(true)
    const { data } = await getSupabase()
      .from("transaksi_pembayaran_v2")
      .select("*")
      .eq("santri_id", santriId)
      .order("tahun", { ascending: false })
      .order("bulan", { ascending: false })
    setSantriHistory(data || [])
    setLoadingHistory(false)
  }

  const filteredSantriForModal = useMemo(() => {
    if (!searchSantriInModal) return []
    return santriList.filter(s =>
      s.nama_lengkap?.toLowerCase().includes(searchSantriInModal.toLowerCase()) ||
      (s.nis && s.nis.toString().includes(searchSantriInModal))
    ).slice(0, 6)
  }, [santriList, searchSantriInModal])

  // PERBAIKAN: Logika pilih bulan
  const toggleBulan = (bulan: number) => {
    setSelectedBulanList(prev => {
      // Jika bulan yang diklik sama dengan yang sudah dipilih, kosongkan list (klik ganda)
      if (prev.length === 1 && prev[0] === bulan) {
        return []
      }
      // Jika tidak, ganti dengan bulan yang baru diklik
      return [bulan]
    })
  }

  const handleSimpanBayar = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedSantri) {
       Swal.fire("Perhatian", "Pilih santri terlebih dahulu.", "warning")
       return
    }

    if (selectedBulanList.length === 0) {
       Swal.fire("Perhatian", "Pilih bulan pembayaran.", "warning")
       return
    }

    setIsSubmitting(true)

    const allEntries: any[] = []
    
    // Karena sekarang array hanya berisi maksimal 1 elemen, loop ini hanya akan jalan 1x
    for (const bulan of selectedBulanList) {
      const baseData = { santri_id: selectedSantri.id, bulan, tahun: selectedTahunBayar, keterangan }

      if (["MTS SAJA", "MA SAJA", "SANTRI NON MUKIM"].includes(selectedSantri.jenjang)) {
        if (Number(nominals.nominal_total) > 0) {
          const kategoriTujuan = selectedSantri.jenjang === "SANTRI NON MUKIM" ? 'pesantren' : 'sekolah'
          allEntries.push({ ...baseData, kategori: kategoriTujuan, jumlah_bayar: Number(nominals.nominal_total) })
        }
      } else {
        if (Number(nominals.nominal_dapur) > 0) allEntries.push({ ...baseData, kategori: 'dapur', jumlah_bayar: Number(nominals.nominal_dapur) })
        if (Number(nominals.nominal_pesantren) > 0) allEntries.push({ ...baseData, kategori: 'pesantren', jumlah_bayar: Number(nominals.nominal_pesantren) })
        if (Number(nominals.nominal_sekolah) > 0) allEntries.push({ ...baseData, kategori: 'sekolah', jumlah_bayar: Number(nominals.nominal_sekolah) })
      }
      
      // TAMBAHAN: Eksekusi simpan untuk kategori 'lainnya' (berlaku untuk semua jenjang)
      if (Number(nominals.nominal_lainnya) > 0) {
         allEntries.push({ ...baseData, kategori: 'lainnya', jumlah_bayar: Number(nominals.nominal_lainnya) })
      }
    }

    if (allEntries.length === 0) {
      Swal.fire("Perhatian", "Isi minimal satu nominal pembayaran (termasuk nominal lainnya) terlebih dahulu.", "warning")
      setIsSubmitting(false)
      return
    }

    try {
      const { error } = await getSupabase().from("transaksi_pembayaran_v2").insert(allEntries)
      if (error) throw error
      Swal.fire({ icon: 'success', title: `${allEntries.length} transaksi berhasil disimpan`, timer: 1500, showConfirmButton: false })
      onSuccessSave()
      loadSantriHistory(selectedSantri.id)
      // Reset form
      setNominals({ nominal_dapur: "", nominal_pesantren: "", nominal_sekolah: "", nominal_total: "", nominal_lainnya: "" })
      setKeterangan("")
    } catch (err: any) {
      Swal.fire("Gagal", err.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  // Kondisi untuk menentukan apakah bulan harus dinonaktifkan
  const isBulanDisabled = (bulanNumber: number) => {
    // Jika ada bulan yang dipilih, dan bulan ini BUKAN bulan yang dipilih, maka disable.
    return selectedBulanList.length === 1 && selectedBulanList[0] !== bulanNumber;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 relative z-10 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-sky-800 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Banknote size={18} />
            <h2 className="text-sm font-black uppercase tracking-wide">Input Pembayaran</h2>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Content Form */}
        <div className={cn("overflow-y-auto flex-1 p-6", !selectedSantri && "min-h-[380px]")}>
          <form onSubmit={handleSimpanBayar} className="space-y-5">
            <div className="space-y-1.5 relative">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Nama Santri</label>
              {selectedSantri ? (
                <div className="flex items-center justify-between bg-sky-50 border border-sky-200 rounded-xl px-4 py-3">
                  <div>
                    <div className="text-xs font-black uppercase text-slate-800">{selectedSantri.nama_lengkap}</div>
                    <div className="text-[10px] text-sky-600 font-semibold mt-0.5">{selectedSantri.jenjang} · Kelas {selectedSantri.kelas}</div>
                  </div>
                  <button type="button" onClick={() => setSelectedSantri(null)} className="text-xs font-bold text-red-500 hover:bg-red-50 px-2.5 py-1 rounded-lg">Ganti</button>
                </div>
              ) : (
                <>
                  <input
                    type="text" placeholder="Ketik nama atau NIS..."
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none bg-slate-50 focus:border-slate-300 transition-colors"
                    value={searchSantriInModal} onChange={e => setSearchSantriInModal(e.target.value)}
                  />
                  {filteredSantriForModal.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-50 overflow-hidden">
                      {filteredSantriForModal.map(s => (
                        <div key={s.id} onClick={() => { setSelectedSantri(s); setSearchSantriInModal("") }} className="flex items-center justify-between px-4 py-2.5 hover:bg-sky-50 cursor-pointer border-b border-slate-50">
                          <div>
                            <div className="text-xs font-bold uppercase text-slate-800">{s.nama_lengkap}</div>
                            <div className="text-[10px] text-slate-400">NIS: {s.nis || "—"}</div>
                          </div>
                          <span className="text-[9px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">{s.jenjang}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {selectedSantri && (
              <div className="space-y-5">
                {/* Bagian Input Periode & Bulan */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Tahun Pembayaran</label>
                    <select value={selectedTahunBayar} onChange={e => setSelectedTahunBayar(Number(e.target.value))} className="text-xs font-bold border rounded-lg px-3 py-1.5 bg-white">
                      {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                         Pilih Bulan {selectedBulanList.length === 0 && <span className="text-red-500">(Wajib pilih)</span>}
                       </label>
                       {/* Tombol pilih semua dihapus sesuai instruksi */}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {BULAN_NAMES.map((b, i) => {
                        const bulanNumber = i + 1;
                        const isSelected = selectedBulanList.includes(bulanNumber);
                        const isDisabled = isBulanDisabled(bulanNumber);

                        return (
                          <button 
                            key={i} 
                            type="button" 
                            onClick={() => toggleBulan(bulanNumber)} 
                            disabled={isDisabled && !isSelected} // Mencegah klik pada bulan yang ter-disable
                            className={cn(
                              "py-1.5 rounded-lg text-[10px] font-bold border transition-colors", 
                              isSelected 
                                ? "bg-sky-700 text-white border-sky-800 shadow-inner" 
                                : isDisabled 
                                  ? "bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed opacity-50"
                                  : "bg-white text-slate-500 hover:bg-sky-50"
                            )}
                          >
                            {b.slice(0, 3)}
                          </button>
                        )
                      })}
                    </div>
                     <p className="text-[8px] text-slate-400 mt-2 italic text-center">
                        *Klik bulan yang terpilih untuk membatalkan (memilih bulan lain).
                     </p>
                  </div>
                </div>

                {/* Bagian Input Nominal Dinamis */}
                <div className="space-y-3">
                  {["MTS SAJA", "MA SAJA", "SANTRI NON MUKIM"].includes(selectedSantri.jenjang) ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Nominal Total (Iuran)</label>
                        <input type="number" value={nominals.nominal_total} onChange={e => setNominals({ ...nominals, nominal_total: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl text-xs focus:border-sky-500 outline-none" placeholder="Masukkan nominal..." />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider text-amber-600">Nominal Lainnya</label>
                        <input type="number" value={nominals.nominal_lainnya} onChange={e => setNominals({ ...nominals, nominal_lainnya: e.target.value })} className="w-full px-4 py-2.5 border border-amber-200 bg-amber-50 rounded-xl text-xs focus:border-amber-500 outline-none" placeholder="Di luar iuran rutin..." />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Dapur</label>
                          <input type="number" value={nominals.nominal_dapur} onChange={e => setNominals({ ...nominals, nominal_dapur: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-xs focus:border-sky-500 outline-none" placeholder="Rp" />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Pesantren</label>
                          <input type="number" value={nominals.nominal_pesantren} onChange={e => setNominals({ ...nominals, nominal_pesantren: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-xs focus:border-sky-500 outline-none" placeholder="Rp" />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Sekolah</label>
                          <input type="number" value={nominals.nominal_sekolah} onChange={e => setNominals({ ...nominals, nominal_sekolah: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-xs focus:border-sky-500 outline-none" placeholder="Rp" />
                        </div>
                      </div>
                      <div className="w-1/2">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider text-amber-600">Nominal Lainnya</label>
                         <input type="number" value={nominals.nominal_lainnya} onChange={e => setNominals({ ...nominals, nominal_lainnya: e.target.value })} className="w-full px-3 py-2 border border-amber-200 bg-amber-50 rounded-xl text-xs focus:border-amber-500 outline-none" placeholder="Di luar iuran (opsional)..." />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Keterangan</label>
                    <input type="text" value={keterangan} onChange={e => setKeterangan(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-xs focus:border-sky-500 outline-none" placeholder="Catatan tambahan (opsional, misal: Untuk seragam, buku, dll)..." />
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full bg-sky-700 hover:bg-sky-800 text-white font-black text-xs uppercase py-3 rounded-xl flex justify-center items-center gap-2 transition-colors">
                  {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : "Simpan Pembayaran"}
                </button>
              </div>
            )}
          </form>
        </div>

      </div>
    </div>
  )
}