"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { 
  AlertTriangle, Search, MessageCircle, 
  Loader2, Inbox, Calendar, Wallet, TrendingUp 
} from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

const BULAN_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

export default function TunggakanPage() {
  const [mounted, setMounted] = useState(false)
  const [santriList, setSantriList] = useState<any[]>([])
  const [pembayaranList, setPembayaranList] = useState<any[]>([])
  const [masterTarif, setMasterTarif] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterBulan, setFilterBulan] = useState(new Date().getMonth() + 1)
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear())
  const [isLoading, setIsLoading] = useState(true)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    const supabase = getSupabase()
    const [resSantri, resBayar, resTarif] = await Promise.all([
      supabase.from("santri").select("*").order("nama_lengkap", { ascending: true }),
      supabase.from("transaksi_pembayaran_v2").select("*").eq("bulan", filterBulan).eq("tahun", filterTahun),
      supabase.from("tarif").select("*")
    ])

    setSantriList(resSantri.data || [])
    setPembayaranList(resBayar.data || [])
    setMasterTarif(resTarif.data || [])
    setIsLoading(false)
  }, [filterBulan, filterTahun])

  useEffect(() => {
    setMounted(true)
    loadData()
  }, [loadData])

  const getTargetDinamis = (santri: any, kategori: string) => {
    if (!santri || masterTarif.length === 0) return 0
    const jenjang = santri.jenjang?.toString().trim().toLowerCase()
    let tahunReferensi = 2025 
    const tglRef = santri.tanggal_mulai_tagihan ? new Date(santri.tanggal_mulai_tagihan) : new Date(santri.tanggal_masuk)
    
    if (jenjang !== 'takhosus' && jenjang !== 'kuliah' && jenjang !== 'pengabdian') {
      tahunReferensi = tglRef.getFullYear() < 2026 ? 2025 : tglRef.getFullYear()
    }

    let komponenCari = kategori
    if (jenjang === 'takhosus' || jenjang === 'kuliah') {
      if (kategori === 'sekolah') return 0 
      komponenCari = `${kategori}_takhosus`
    } else if (jenjang === 'pengabdian') {
      if (kategori !== 'pesantren') return 0
      komponenCari = `pesantren_pengabdian`
    } else {
      if (kategori === 'sekolah') komponenCari = `sekolah_${jenjang}`
    }

    const match = masterTarif.find(t => 
      t.komponen?.toString().trim().toLowerCase() === komponenCari.toLowerCase() && 
      t.angkatan === tahunReferensi
    )
    return match ? match.nominal : 0
  }

  const processedData = useMemo(() => {
    let totalMasuk = pembayaranList.reduce((a, b) => a + (b.jumlah_bayar || 0), 0)
    let totalTunggakan = 0

    const sekarang = new Date()
    const bulanSekarang = sekarang.getMonth() + 1
    const tahunSekarang = sekarang.getFullYear()

    const list = santriList.map(s => {
      const tglReferensi = s.tanggal_mulai_tagihan ? new Date(s.tanggal_mulai_tagihan) : new Date(s.tanggal_masuk)
      const tglAwalWajib = new Date(tglReferensi.getFullYear(), tglReferensi.getMonth(), 1)
      const tglFilterAktif = new Date(filterTahun, filterBulan - 1, 1)

      const isMasaDepan = filterTahun > tahunSekarang || (filterTahun === tahunSekarang && filterBulan > bulanSekarang)
      const isBelumWajibBayar = tglFilterAktif < tglAwalWajib
      const tagihanHarusNol = isMasaDepan || isBelumWajibBayar

      const targetD = tagihanHarusNol ? 0 : getTargetDinamis(s, "dapur")
      const targetP = tagihanHarusNol ? 0 : getTargetDinamis(s, "pesantren")
      const targetS = tagihanHarusNol ? 0 : getTargetDinamis(s, "sekolah")

      const bayarD = pembayaranList.filter(p => p.santri_id === s.id && p.kategori === "dapur").reduce((a, b) => a + b.jumlah_bayar, 0)
      const bayarP = pembayaranList.filter(p => p.santri_id === s.id && p.kategori === "pesantren").reduce((a, b) => a + b.jumlah_bayar, 0)
      const bayarS = pembayaranList.filter(p => p.santri_id === s.id && p.kategori === "sekolah").reduce((a, b) => a + b.jumlah_bayar, 0)

      const sisaD = Math.max(0, targetD - bayarD)
      const sisaP = Math.max(0, targetP - bayarP)
      const sisaS = Math.max(0, targetS - bayarS)
      const totalSisa = sisaD + sisaP + sisaS

      if (totalSisa > 0) totalTunggakan += totalSisa

      return { ...s, sisaD, sisaP, sisaS, totalSisa }
    }).filter(res => 
      res.totalSisa > 0 && 
      (res.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) || (res.nis && res.nis.toString().includes(searchTerm)))
    )

    return { list, totalMasuk, totalTunggakan }
  }, [santriList, pembayaranList, masterTarif, searchTerm, filterBulan, filterTahun])

  if (!mounted) return null

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-in fade-in duration-500">
      
      {/* 1. HEADER & SUMMARY CARDS */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-red-50 p-3 rounded-2xl text-red-600 shadow-inner">
            <AlertTriangle size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Daftar Tunggakan</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
              <Calendar size={12} className="text-sky-500" /> Periode: {BULAN_NAMES[filterBulan-1]} {filterTahun}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl min-w-[160px] shadow-sm">
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
               <TrendingUp size={14} /> <span className="text-[8px] font-black uppercase">Realisasi</span>
            </div>
            <p className="text-sm font-black text-emerald-700 tracking-tight">Rp {processedData.totalMasuk.toLocaleString()}</p>
          </div>
          <div className="bg-red-50 border border-red-100 p-3 rounded-2xl min-w-[160px] shadow-sm">
            <div className="flex items-center gap-2 text-red-600 mb-1">
               <Wallet size={14} /> <span className="text-[8px] font-black uppercase">Outstanding</span>
            </div>
            <p className="text-sm font-black text-red-700 tracking-tight">Rp {processedData.totalTunggakan.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* 2. TOOLBAR (FILTER & SEARCH) */}
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
            <div className="w-px h-4 bg-slate-200"></div>
            <select value={filterTahun} onChange={(e) => setFilterTahun(Number(e.target.value))} className="bg-transparent text-[10px] font-black outline-none px-3 cursor-pointer">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        
        <button onClick={() => loadData()} className="bg-white border-b-4 border-slate-200 hover:bg-slate-50 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all active:scale-95 shadow-sm">
          Refresh Data
        </button>
      </div>

      {/* 3. DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900 text-white uppercase text-[9px] font-black tracking-widest sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 border-r border-slate-800">Profil Santri</th>
                <th className="px-4 py-4 text-center border-r border-slate-800">Kelas</th>
                <th className="px-4 py-4 text-right border-r border-slate-800">Dapur</th>
                <th className="px-4 py-4 text-right border-r border-slate-800">Psntrn</th>
                <th className="px-4 py-4 text-right border-r border-slate-800">Sekolah</th>
                <th className="px-4 py-4 text-right bg-red-800 text-white">Total Tagihan</th>
                <th className="px-6 py-4 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-32 text-center">
                    <Loader2 className="animate-spin mx-auto text-red-600 w-10 h-10" />
                    <p className="text-[10px] font-black text-slate-400 uppercase mt-4 tracking-widest">Menghitung Tunggakan...</p>
                  </td>
                </tr>
              ) : processedData.list.length > 0 ? (
                processedData.list.map((s) => (
                  <tr key={s.id} className="group hover:bg-red-50/20 transition-colors">
                    <td className="px-6 py-4 border-r border-slate-50">
                      <div className="font-black text-xs uppercase text-slate-900 leading-none">{s.nama_lengkap}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase mt-1 italic">Wali: {s.nama_wali || "-"}</div>
                    </td>
                    <td className="px-4 py-4 text-center font-black text-[10px] uppercase text-slate-500 border-r border-slate-50">
                      {s.jenjang} - {s.kelas}
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-xs border-r border-slate-50 text-slate-600">Rp {s.sisaD.toLocaleString()}</td>
                    <td className="px-4 py-4 text-right font-bold text-xs border-r border-slate-50 text-slate-600">Rp {s.sisaP.toLocaleString()}</td>
                    <td className="px-4 py-4 text-right font-bold text-xs border-r border-slate-50 text-slate-600">Rp {s.sisaS.toLocaleString()}</td>
                    <td className="px-4 py-4 text-right font-black text-xs bg-red-50 text-red-700 border-r border-slate-50">
                      Rp {s.totalSisa.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => {
                          const phone = s.hp_wali?.replace(/^0/, '62').replace(/[^\d]/g, '');
                          const pesan = `Assalamu'alaikum Bapak/Ibu ${s.nama_wali}. Mengingatkan tunggakan syahriah Ananda ${s.nama_lengkap} periode ${BULAN_NAMES[filterBulan-1]} sebesar Rp ${s.totalSisa.toLocaleString()}. Mohon segera diselesaikan. Syukran.`;
                          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(pesan)}`, '_blank');
                        }} 
                        className="bg-emerald-500 hover:bg-black text-white p-2.5 rounded-xl transition-all active:scale-95 shadow-md shadow-emerald-200 flex items-center justify-center mx-auto"
                        title="Kirim Pengingat WA"
                      >
                        <MessageCircle size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-24 text-center">
                    <Inbox className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Alhamdulillah, semua lunas</p>
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