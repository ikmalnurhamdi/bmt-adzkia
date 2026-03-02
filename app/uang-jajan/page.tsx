"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { 
  PlusCircle, Search, History, Save, X, 
  Loader2, Coins, Trash2, User, Filter
} from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import Swal from "sweetalert2"
import { cn } from "@/lib/utils"

const BULAN_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

export default function UangJajanPage() {
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const [santriList, setSantriList] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterBulan, setFilterBulan] = useState(new Date().getMonth() + 1)
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear())
  const [isLoading, setIsLoading] = useState(true)

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedSantri, setSelectedSantri] = useState<any | null>(null)
  const [modalType, setModalType] = useState<'TOPUP' | 'TARIK'>('TOPUP')
  const [amount, setAmount] = useState("")
  const [keterangan, setKeterangan] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    const { data } = await getSupabase()
      .from("santri")
      .select("*")
      .order("nama_lengkap", { ascending: true })
    setSantriList(data || [])
    setIsLoading(false)
  }, [])

  useEffect(() => {
    setMounted(true)
    loadData()
  }, [loadData])

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSantri || !amount) return

    const nominal = Number(amount)
    const currentSaldo = selectedSantri.saldo_jajan || 0
    const newSaldo = modalType === 'TOPUP' ? currentSaldo + nominal : currentSaldo - nominal

    if (modalType === 'TARIK' && currentSaldo < nominal) {
      return Swal.fire("Saldo Kurang", "Sisa saldo tidak cukup untuk penarikan ini.", "error")
    }

    setIsSubmitting(true)
    try {
      await getSupabase().from("santri").update({ saldo_jajan: newSaldo }).eq("id", selectedSantri.id)
      await getSupabase().from("log_uang_jajan").insert([{
        santri_id: selectedSantri.id,
        tipe: modalType === 'TOPUP' ? 'MASUK' : 'KELUAR',
        nominal: nominal,
        saldo_akhir: newSaldo,
        keterangan: keterangan || (modalType === 'TOPUP' ? "Titipan Uang Saku" : "Penarikan Manual")
      }])

      Swal.fire({ icon: 'success', title: 'Berhasil', timer: 1000, showConfirmButton: false })
      closeModal()
      loadData()
    } catch (err: any) { 
      Swal.fire("Error", err.message, "error") 
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSantri = async (id: string, nama: string) => {
    const result = await Swal.fire({
      title: 'Hapus Data Santri?',
      text: `Seluruh riwayat uang saku ${nama} akan terhapus permanen!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Ya, Hapus!',
    })

    if (result.isConfirmed) {
      try {
        const { error } = await getSupabase().from("santri").delete().eq("id", id)
        if (error) throw error
        loadData()
      } catch (err: any) {
        Swal.fire("Gagal", err.message, "error")
      }
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setAmount("")
    setKeterangan("")
    setSelectedSantri(null)
  }

  const stats = useMemo(() => {
    const total = santriList.reduce((a, b) => a + (b.saldo_jajan || 0), 0)
    const kritis = santriList.filter(s => (s.saldo_jajan || 0) < 10000).length
    return { total, kritis }
  }, [santriList])

  const filteredSantri = useMemo(() => {
    return santriList.filter(s => 
      s.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.nis && s.nis.toString().includes(searchTerm))
    )
  }, [santriList, searchTerm])

  if (!mounted) return null

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-in fade-in duration-500">
      {/* 1. HEADER & STATS */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-sky-50 p-3 rounded-2xl text-sky-600 shadow-inner">
            <Coins size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Uang Saku Santri</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Kelola Tabungan Jajan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right border-r border-slate-100 pr-6">
            <p className="text-[8px] font-black text-slate-400 uppercase">Total Saldo Titipan</p>
            <p className="text-sm font-black text-emerald-600 tracking-tight">Rp {stats.total.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-black text-slate-400 uppercase">Saldo Kritis</p>
            <p className="text-sm font-black text-red-600 tracking-tight">{stats.kritis} Santri</p>
          </div>
        </div>
      </div>

      {/* 2. TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Cari Nama Santri..." 
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-sky-600 bg-slate-50 transition-all" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <Filter size={14} className="text-slate-400 ml-1" />
            <select value={filterBulan} onChange={(e) => setFilterBulan(Number(e.target.value))} className="bg-transparent text-[10px] font-black uppercase outline-none px-2 cursor-pointer">
              {BULAN_NAMES.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
            </select>
            <div className="w-px h-4 bg-slate-300"></div>
            <select value={filterTahun} onChange={(e) => setFilterTahun(Number(e.target.value))} className="bg-transparent text-[10px] font-black outline-none px-2 cursor-pointer">
              {[2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push("/uang-jajan/riwayat")} 
            className="bg-white border border-slate-200 text-slate-600 font-black px-5 py-2.5 rounded-xl text-[10px] uppercase flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
          >
            <History size={16} /> Riwayat Global
          </button>
          <button 
            onClick={() => { setModalType('TOPUP'); setSelectedSantri(null); setIsModalOpen(true); }}
            className="bg-sky-900 hover:bg-black text-white font-black px-6 py-2.5 rounded-xl text-[10px] uppercase flex items-center gap-2 shadow-lg transition-all active:scale-95 border-b-4 border-sky-950"
          >
            <PlusCircle size={16}/> Top Up Saldo
          </button>
        </div>
      </div>

      {/* 3. TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900 text-white text-[9px] uppercase tracking-widest font-black">
              <tr>
                <th className="px-6 py-4">Informasi Santri</th>
                <th className="px-4 py-4 text-center">Saldo Saat Ini</th>
                <th className="px-4 py-4 text-center">Aksi Manual</th>
                <th className="px-4 py-4 text-center">Opsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSantri.map((s) => (
                <tr key={s.id} className={cn("group hover:bg-sky-50/30 transition-colors", (s.saldo_jajan || 0) < 10000 && "bg-red-50/20")}>
                  <td className="px-6 py-4">
                    <div className="font-black text-xs uppercase text-slate-800 leading-none">{s.nama_lengkap}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase mt-1">Kelas: {s.kelas || "-"}</div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className={cn("text-xs font-black tracking-tight", (s.saldo_jajan || 0) < 10000 ? "text-red-600" : "text-emerald-700")}>
                      Rp {(s.saldo_jajan || 0).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => { setSelectedSantri(s); setModalType('TOPUP'); setIsModalOpen(true); }}
                        className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-black text-[9px] px-3 py-1.5 rounded-lg uppercase hover:bg-emerald-100 transition-all"
                      >
                        Setor
                      </button>
                      <button 
                        onClick={() => { setSelectedSantri(s); setModalType('TARIK'); setIsModalOpen(true); }}
                        className="bg-orange-50 text-orange-700 border border-orange-200 font-black text-[9px] px-3 py-1.5 rounded-lg uppercase hover:bg-orange-100 transition-all"
                      >
                        Tarik
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => router.push(`/uang-jajan/riwayat?search=${s.nama_lengkap}`)} className="text-sky-500 p-2 hover:bg-sky-50 rounded-full transition-colors" title="Riwayat"><History size={16}/></button>
                      <button onClick={() => handleDeleteSantri(s.id, s.nama_lengkap)} className="text-red-400 p-2 hover:bg-red-50 rounded-full transition-colors" title="Hapus"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MODAL TRANSAKSI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="bg-white w-full max-w-[360px] rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className={cn(
              "p-4 flex justify-between items-center text-white",
              modalType === 'TOPUP' ? "bg-emerald-600" : "bg-orange-600"
            )}>
              <h3 className="text-[10px] font-black uppercase tracking-[0.15em] ml-2">
                {modalType === 'TOPUP' ? 'Setoran Uang Saku' : 'Penarikan Uang Saku'}
              </h3>
              <button onClick={closeModal} className="hover:bg-white/20 p-1.5 rounded-lg transition-all">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTransaction} className="p-6 space-y-5">
              <div className="space-y-1.5 relative">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nama Santri</label>
                {selectedSantri ? (
                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-xl text-white shadow-sm", modalType === 'TOPUP' ? "bg-emerald-500" : "bg-orange-500")}>
                        <User size={14}/>
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase text-slate-800 leading-none">{selectedSantri.nama_lengkap}</div>
                        <div className="text-[9px] font-bold text-slate-400 mt-1">Saldo: Rp {selectedSantri.saldo_jajan.toLocaleString()}</div>
                      </div>
                    </div>
                    <button type="button" onClick={() => setSelectedSantri(null)} className="text-[9px] font-black text-red-500 uppercase hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-all">Ganti</button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      type="text" 
                      placeholder="Cari nama..." 
                      className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl text-[11px] font-bold text-black focus:border-sky-600 outline-none bg-slate-50 shadow-inner"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      autoFocus
                    />
                    {searchTerm && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 shadow-2xl rounded-2xl z-[110] max-h-48 overflow-y-auto py-2 animate-in slide-in-from-top-2">
                        {santriList
                          .filter(s => s.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()))
                          .map(s => (
                            <div 
                              key={s.id} 
                              onClick={() => { setSelectedSantri(s); setSearchTerm(""); }}
                              className="px-5 py-2.5 hover:bg-sky-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                            >
                              <div className="text-[10px] font-black uppercase text-slate-700">{s.nama_lengkap}</div>
                              <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Kelas: {s.kelas}</div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nominal Transaksi (Rp)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">Rp</span>
                  <input 
                    required 
                    type="number" 
                    placeholder="0" 
                    className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl text-sm font-black text-slate-900 focus:border-sky-600 outline-none bg-slate-50 shadow-inner placeholder:text-slate-300" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Catatan Keterangan</label>
                <input 
                  type="text" 
                  placeholder="Opsional..." 
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-[10px] font-bold text-slate-800 focus:border-sky-600 outline-none bg-slate-50 shadow-inner" 
                  value={keterangan} 
                  onChange={(e) => setKeterangan(e.target.value)} 
                />
              </div>

              <button 
                disabled={isSubmitting || !selectedSantri} 
                type="submit" 
                className={cn(
                  "w-full text-white font-black py-4 rounded-2xl text-[10px] uppercase shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2 border-b-4",
                  modalType === 'TOPUP' ? "bg-emerald-600 hover:bg-emerald-700 border-emerald-800" : "bg-orange-600 hover:bg-orange-700 border-orange-800",
                  (!selectedSantri || isSubmitting) && "opacity-50 cursor-not-allowed"
                )}
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} 
                Proses Saldo Saku
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}