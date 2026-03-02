"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { getSupabase } from "@/lib/supabase"
import { 
  Users, Wallet, TrendingUp, TrendingDown, 
  Activity 
} from "lucide-react"
import { cn } from "@/lib/utils"
// Impor Recharts untuk Grafik Bulat
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

// Import sub-komponen manajemen Anda
import ManajemenSantri from "@/components/ManajemenSantri"
import LaporanKeuangan from "@/app/laporan-keuangan/page"

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [stats, setStats] = useState({
    totalSantri: 0,
    totalPemasukan: 0,
    totalPengeluaran: 0,
    totalTunggakan: 0,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  const loadStats = useCallback(async () => {
    const supabase = getSupabase()
    const skrg = new Date()
    const blnSkrg = skrg.getMonth() + 1
    const thnSkrg = skrg.getFullYear()

    const [santriRes, pembayaranRes, masterTarifRes, operasionalRes] = await Promise.all([
      supabase.from("santri").select("*").eq("status_aktif", true),
      supabase.from("transaksi_pembayaran_v2").select("*"),
      supabase.from("tarif").select("*"),
      supabase.from("keuangan_operasional").select("*")
    ])

    const santriData = santriRes.data || []
    const masterTarif = masterTarifRes.data || []
    const pembayaranList = pembayaranRes.data || []
    const operasionalList = operasionalRes.data || []

    const payMap = new Map()
    pembayaranList.forEach(p => {
      const key = `${p.santri_id}-${p.bulan}-${p.tahun}-${p.kategori}`
      payMap.set(key, (payMap.get(key) || 0) + p.jumlah_bayar)
    })

    const tarifMap = new Map()
    masterTarif.forEach(t => {
      tarifMap.set(`${t.komponen}-${t.angkatan}`, t.nominal)
    })

    let totalAkumulasiTunggakan = 0

    santriData.forEach(s => {
      const tglRef = s.tanggal_mulai_tagihan ? new Date(s.tanggal_mulai_tagihan) : new Date(s.tanggal_masuk)
      const thnStart = tglRef.getFullYear()
      const blnStart = tglRef.getMonth() + 1
      const jenjang = s.jenjang?.toString().trim().toLowerCase()

      for (let th = thnStart; th <= thnSkrg; th++) {
        const blnEnd = (th === thnSkrg) ? blnSkrg : 12
        const blnStartLoop = (th === thnStart) ? blnStart : 1
        
        let thnAngkatan = th < 2026 ? 2025 : th
        if (['takhosus', 'kuliah', 'pengabdian'].includes(jenjang)) thnAngkatan = 2025

        for (let bl = blnStartLoop; bl <= blnEnd; bl++) {
          let tD = 0, tP = 0, tS = 0

          if (jenjang === 'takhosus' || jenjang === 'kuliah') {
            tD = tarifMap.get(`dapur_takhosus-${thnAngkatan}`) || 0
            tP = tarifMap.get(`pesantren_takhosus-${thnAngkatan}`) || 0
          } else if (jenjang === 'pengabdian') {
            tP = tarifMap.get(`pesantren_pengabdian-${thnAngkatan}`) || 0
          } else {
            tD = tarifMap.get(`dapur-${thnAngkatan}`) || 0
            tP = tarifMap.get(`pesantren-${thnAngkatan}`) || 0
            tS = tarifMap.get(`sekolah_${jenjang}-${thnAngkatan}`) || 0
          }

          const bD = payMap.get(`${s.id}-${bl}-${th}-dapur`) || 0
          const bP = payMap.get(`${s.id}-${bl}-${th}-pesantren`) || 0
          const bS = payMap.get(`${s.id}-${bl}-${th}-sekolah`) || 0

          totalAkumulasiTunggakan += (Math.max(0, tD - bD) + Math.max(0, tP - bP) + Math.max(0, tS - bS))
        }
      }
    })

    const totalMasukSyahriah = pembayaranList.reduce((a, b) => a + b.jumlah_bayar, 0)
    const totalMasukOps = operasionalList.filter(o => o.jenis === 'pemasukan').reduce((a, b) => a + b.nominal, 0)
    const totalKeluarOps = operasionalList.filter(o => o.jenis === 'pengeluaran').reduce((a, b) => a + b.nominal, 0)

    setStats({
      totalSantri: santriData.length,
      totalPemasukan: totalMasukSyahriah + totalMasukOps,
      totalPengeluaran: totalKeluarOps,
      totalTunggakan: totalAkumulasiTunggakan
    })
  }, [])

  useEffect(() => {
    if (mounted) loadStats()
  }, [mounted, loadStats])

  const efektivitas = useMemo(() => {
    const totalPotensi = stats.totalPemasukan + stats.totalTunggakan
    return totalPotensi > 0 ? Math.round((stats.totalPemasukan / totalPotensi) * 100) : 0
  }, [stats])

  if (!mounted) return null

  return (
    <div className="p-4 lg:p-8 space-y-8 animate-in fade-in duration-500">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Dashboard Overview</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
            <Activity size={12} className="text-emerald-500" /> Akumulasi Data Keseluruhan
          </p>
        </div>
        <button 
          onClick={() => loadStats()} 
          className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
        >
          Refresh Data
        </button>
      </div>

      {/* STAT CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Santri Aktif" value={stats.totalSantri} sub="Total Jiwa" icon={<Users size={20}/>} color="sky" />
        <StatCard title="Uang Masuk" value={`Rp ${stats.totalPemasukan.toLocaleString()}`} sub="Total Akumulasi" icon={<TrendingUp size={20}/>} color="emerald" />
        <StatCard title="Pengeluaran" value={`Rp ${stats.totalPengeluaran.toLocaleString()}`} sub="Total Akumulasi" icon={<TrendingDown size={20}/>} color="orange" />
        <StatCard title="Tunggakan" value={`Rp ${stats.totalTunggakan.toLocaleString()}`} sub="Piutang Global" icon={<Wallet size={20}/>} color="red" />
      </div>

      {/* DETAIL ANALYSIS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-wider">Efektivitas Penagihan Global</h3>
            <span className="text-2xl font-black text-emerald-600">{efektivitas}%</span>
          </div>
          <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden shadow-inner">
            <div 
              className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full transition-all duration-1000 ease-out" 
              style={{ width: `${efektivitas}%` }}
            ></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
              <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Dana Terkumpul</p>
              <p className="text-sm font-black text-emerald-900">Rp {stats.totalPemasukan.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-center">
              <p className="text-[9px] font-black text-red-600 uppercase mb-1">Sisa Piutang</p>
              <p className="text-sm font-black text-red-900">Rp {stats.totalTunggakan.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* ANALISIS GRAFIK BULAT */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-slate-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
          
          <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest mb-2 self-start">Komposisi Keuangan</h3>
          
          <div className="w-full h-[220px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Uang Masuk', value: stats.totalPemasukan },
                    { name: 'Tunggakan', value: stats.totalTunggakan }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-slate-900 leading-none">{efektivitas}%</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Tertagih</span>
            </div>
          </div>

          <div className="w-full space-y-2 mt-4">
            <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/50 border border-emerald-100/50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-[9px] font-black text-slate-600 uppercase">Uang Masuk</span>
              </div>
              <span className="text-[9px] font-black text-emerald-700">Rp {stats.totalPemasukan.toLocaleString()}</span>
            </div>
            
            <div className="flex items-center justify-between p-2 rounded-xl bg-red-50/50 border border-red-100/50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-[9px] font-black text-slate-600 uppercase">Tunggakan</span>
              </div>
              <span className="text-[9px] font-black text-red-700">Rp {stats.totalTunggakan.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* TABS SECTION */}
      <div className="mt-12 space-y-6">
        <div className="flex gap-2 border-b border-slate-200">
           {["overview", "santri", "keuangan"].map((tab) => (
             <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === tab ? "text-sky-600 border-b-2 border-sky-600" : "text-slate-400 hover:text-slate-600"
              )}
             >
               {tab}
             </button>
           ))}
        </div>
        
        {activeTab === "santri" && <ManajemenSantri onUpdate={loadStats} />}
        {activeTab === "keuangan" && <LaporanKeuangan onUpdate={loadStats} />}
      </div>
    </div>
  )
}

function StatCard({ title, value, sub, icon, color }: any) {
  const themes: any = {
    sky: "bg-sky-50 text-sky-600 border-sky-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    red: "bg-red-50 text-red-600 border-red-100",
  }
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm group hover:border-sky-400 transition-all cursor-default">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-3 rounded-2xl border transition-colors", themes[color])}>{icon}</div>
        <div className="h-2 w-2 rounded-full bg-slate-200 group-hover:bg-sky-400"></div>
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{title}</p>
        <h3 className="text-xl font-black text-slate-900 tracking-tight mt-1.5">{value}</h3>
        <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">{sub}</p>
      </div>
    </div>
  )
}