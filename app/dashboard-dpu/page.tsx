"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  Utensils, Search, MessageCircle, 
  CheckCircle, Clock, Filter
} from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

const BULAN_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
const DAFTAR_DAPUR = ["Dapur Umi", "Dapur Qais", "Dapur Hamka"]

export default function DashboardDPU() {
  const [selectedDapur, setSelectedDapur] = useState(DAFTAR_DAPUR[0])
  const [santriList, setSantriList] = useState<any[]>([])
  const [pembayaranList, setPembayaranList] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterBulan, setFilterBulan] = useState(new Date().getMonth() + 1)
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [filterBulan, filterTahun, selectedDapur])

  async function loadData() {
    setIsLoading(true)
    const supabase = getSupabase()
    
    // Paralel Fetching untuk DPU
    const [resSantri, resPay] = await Promise.all([
      supabase.from("santri")
        .select("*")
        .eq("id_dapur", selectedDapur)
        .order("nama_lengkap", { ascending: true }),
      supabase.from("transaksi_pembayaran_v2")
        .select("*")
        .eq("kategori", "dapur")
        .eq("bulan", filterBulan)
        .eq("tahun", filterTahun)
    ])
    
    setSantriList(resSantri.data || [])
    setPembayaranList(resPay.data || [])
    setIsLoading(false)
  }

  const rekapDapur = useMemo(() => {
    return santriList.map(s => {
      const bayar = pembayaranList
        .filter(p => p.santri_id === s.id)
        .reduce((a, b) => a + b.jumlah_bayar, 0)
      
      return { ...s, totalBayar: bayar, isLunas: bayar > 0 }
    }).filter(res => 
      res.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [santriList, pembayaranList, searchTerm])

  const stats = useMemo(() => ({
    total: santriList.length,
    lunas: rekapDapur.filter(r => r.isLunas).length,
    belum: rekapDapur.filter(r => !r.isLunas).length
  }), [santriList, rekapDapur])

  const sendRekapToBMT = () => {
    const lunas = rekapDapur.filter(r => r.isLunas)
    const totalUang = lunas.reduce((a, b) => a + b.totalBayar, 0)
    
    let pesan = `*LAPORAN HARIAN ${selectedDapur.toUpperCase()}*%0A`
    pesan += `Periode: ${BULAN_NAMES[filterBulan-1]} ${filterTahun}%0A%0A`
    pesan += `Daftar Santri Sudah Bayar:%0A`
    lunas.forEach((s, i) => {
      pesan += `${i+1}. ${s.nama_lengkap} (Rp ${s.totalBayar.toLocaleString()})%0A`
    })
    pesan += `%0A*Total Dana Diterima: Rp ${totalUang.toLocaleString()}*%0A`
    
    window.open(`https://wa.me/628123456789?text=${pesan}`, '_blank')
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-in fade-in duration-500">
      
      {/* 1. HEADER & STATS MINI */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-orange-50 p-3 rounded-2xl text-orange-600 shadow-inner">
            <Utensils size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Laporan DPU</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
              Sinkronisasi Data Dapur & BMT
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right border-r border-slate-100 pr-6">
            <p className="text-[8px] font-black text-slate-400 uppercase">Total Santri</p>
            <p className="text-sm font-black text-slate-800">{stats.total} Anak</p>
          </div>
          <div className="text-right border-r border-slate-100 pr-6">
            <p className="text-[8px] font-black text-slate-400 uppercase text-emerald-600">Berhak Makan</p>
            <p className="text-sm font-black text-emerald-600">{stats.lunas} Anak</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-black text-slate-400 uppercase text-red-500">Belum Bayar</p>
            <p className="text-sm font-black text-red-600">{stats.belum} Anak</p>
          </div>
        </div>
      </div>

      {/* 2. TOOLBAR AREA */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Cari Santri..." 
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-orange-500 bg-slate-50 transition-all" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5 px-2 text-orange-600">
              <Filter size={14} />
            </div>
            <select 
              value={selectedDapur} 
              onChange={(e) => setSelectedDapur(e.target.value)}
              className="bg-transparent text-[10px] font-black uppercase outline-none text-slate-700 cursor-pointer pr-4"
            >
              {DAFTAR_DAPUR.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <select value={filterBulan} onChange={(e) => setFilterBulan(Number(e.target.value))} className="bg-transparent text-[10px] font-black uppercase outline-none px-2 cursor-pointer">
              {BULAN_NAMES.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
            </select>
            <div className="w-px h-4 bg-slate-300"></div>
            <select value={filterTahun} onChange={(e) => setFilterTahun(Number(e.target.value))} className="bg-transparent text-[10px] font-black outline-none px-2 cursor-pointer">
              {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <button onClick={sendRekapToBMT} className="bg-emerald-600 hover:bg-black text-white font-black px-6 py-2.5 rounded-xl text-[10px] uppercase flex items-center gap-2 shadow-lg transition-all active:scale-95 border-b-4 border-emerald-800">
          <MessageCircle size={16} /> Kirim Rekap via WA
        </button>
      </div>

      {/* 3. TABLE AREA */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[550px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900 text-white uppercase text-[9px] font-black tracking-widest sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 border-r border-slate-700">Informasi Santri</th>
                <th className="px-5 py-4 text-center border-r border-slate-700">Jenjang / Kelas</th>
                <th className="px-5 py-4 text-right border-r border-slate-700">Dana Terbayar</th>
                <th className="px-5 py-4 text-center">Status Izin Makan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-24 text-center">
                    <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase mt-4 tracking-widest">Memuat Data Dapur...</p>
                  </td>
                </tr>
              ) : rekapDapur.length > 0 ? (
                rekapDapur.map((s) => (
                  <tr key={s.id} className={cn("group hover:bg-slate-50 transition-colors", s.isLunas ? "bg-emerald-50/20" : "bg-white")}>
                    <td className="px-6 py-3 border-r border-slate-50">
                      <div className="font-black text-xs uppercase text-slate-900 leading-tight">{s.nama_lengkap}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">NIS: {s.nis || "-"}</div>
                    </td>
                    <td className="px-5 py-3 text-center border-r border-slate-50">
                      <span className="text-[9px] font-black text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 uppercase">
                        {s.jenjang} - {s.kelas}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-black text-xs text-slate-700 border-r border-slate-50">
                      Rp {s.totalBayar.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {s.isLunas ? (
                        <div className="inline-flex items-center gap-1.5 text-emerald-600 font-black text-[9px] uppercase bg-emerald-100 px-3 py-1.5 rounded-full border border-emerald-200">
                          <CheckCircle size={14} /> Berhak Makan
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-red-500 font-black text-[9px] uppercase bg-red-50 px-3 py-1.5 rounded-full border border-red-100">
                          <Clock size={14} /> Belum Bayar
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                    <Utensils className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tidak ada santri di unit ini</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}