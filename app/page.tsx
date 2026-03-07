"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { getSupabase } from "@/lib/supabase"
import { 
  Users, Wallet, Banknote, ReceiptText, 
  Activity 
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

// Import sub-komponen
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
      supabase.from("tarif").select("*").eq("angkatan", 2026), 
      supabase.from("keuangan_operasional").select("*")
    ])

    const santriData = santriRes.data || []
    const masterTarif = masterTarifRes.data || []
    const pembayaranList = pembayaranRes.data || []
    const operasionalList = operasionalRes.data || []

    const payMap = new Map()
    pembayaranList.forEach((p: any) => {
      const key = `${p.santri_id}-${p.bulan}-${p.tahun}-${p.kategori}`
      payMap.set(key, (payMap.get(key) || 0) + p.jumlah_bayar)
    })

    const tarifMap = new Map()
    masterTarif.forEach((t: any) => {
      tarifMap.set(t.komponen, t.nominal)
    })

    let totalAkumulasiTunggakan = 0

    santriData.forEach((s: any) => {
      const tglRef = s.tanggal_mulai_tagihan ? new Date(s.tanggal_mulai_tagihan) : new Date(s.tanggal_masuk)
      const thnStart = tglRef.getFullYear()
      const blnStart = tglRef.getMonth() + 1
      const k = s.jenjang 

      for (let th = thnStart; th <= thnSkrg; th++) {
        const blnEnd = (th === thnSkrg) ? blnSkrg : 12
        const blnStartLoop = (th === thnStart) ? blnStart : 1

        for (let bl = blnStartLoop; bl <= blnEnd; bl++) {
          let tD = 0, tP = 0, tS = 0

          if (k === "MTS PLUS") {
            tD = tarifMap.get("dapur_mts") || 0
            tP = tarifMap.get("pesantren_mts") || 0
            tS = tarifMap.get("sekolah_mts") || 0
          } else if (k === "MTS PLUS REVISI") {
            tD = tarifMap.get("dapur_mts_revisi") || 0
            tP = tarifMap.get("pesantren_mts_revisi") || 0
            tS = tarifMap.get("sekolah_mts_revisi") || 0
          } else if (k === "MA PLUS") {
            tD = tarifMap.get("dapur_ma") || 0
            tP = tarifMap.get("pesantren_ma") || 0
            tS = tarifMap.get("sekolah_ma") || 0
          } else if (k === "MA PLUS REVISI") {
            tD = tarifMap.get("dapur_ma_revisi") || 0
            tP = tarifMap.get("pesantren_ma_revisi") || 0
            tS = tarifMap.get("sekolah_ma_revisi") || 0
          } else if (k === "TAKHOSUS/KULIAH") {
            tD = tarifMap.get("dapur_takhosus") || 0
            tP = tarifMap.get("pesantren_takhosus") || 0
          } else if (k === "PENGABDIAN") {
            tP = tarifMap.get("pesantren_pengabdian") || 0
          } else if (k === "MTS SAJA" || k === "MA SAJA") {
            tS = tarifMap.get(k) || 0 
          } else if (k === "SANTRI NON MUKIM") {
            tP = tarifMap.get(k) || 0 
          }

          const bD = payMap.get(`${s.id}-${bl}-${th}-dapur`) || 0
          const bP = payMap.get(`${s.id}-${bl}-${th}-pesantren`) || 0
          const bS = payMap.get(`${s.id}-${bl}-${th}-sekolah`) || 0

          totalAkumulasiTunggakan += (Math.max(0, tD - bD) + Math.max(0, tP - bP) + Math.max(0, tS - bS))
        }
      }
    })

    const totalMasukSyahriah = pembayaranList.reduce((a: any, b: any) => a + b.jumlah_bayar, 0)
    const totalMasukOps = operasionalList.filter((o: any) => o.jenis === 'pemasukan').reduce((a: any, b: any) => a + b.nominal, 0)
    const totalKeluarOps = operasionalList.filter((o: any) => o.jenis === 'pengeluaran').reduce((a: any, b: any) => a + b.nominal, 0)
    const saldoOperasional = totalMasukOps - totalKeluarOps

    setStats({  
      totalSantri: santriData.length,
      totalPemasukan: totalMasukSyahriah, 
      totalPengeluaran: saldoOperasional, 
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
    <div className="p-4 lg:p-8 space-y-8 animate-in fade-in duration-500 font-sans text-black">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Dashboard</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
            <Activity size={12} className="text-sky-500" /> Akumulasi Data Keseluruhan
          </p>
        </div>
        <button 
          onClick={() => loadStats()} 
          className="bg-sky-900 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-black transition-all active:scale-95 shadow-lg"
        >
          Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Santri Aktif" value={stats.totalSantri} sub="Total Jiwa" icon={<Users size={20}/>} color="sky" />
        <StatCard 
  title="Total Saldo Syahriah" 
  value={`Rp ${stats.totalPemasukan.toLocaleString()}`} 
  sub="Uang Masuk" 
  icon={<Banknote size={20}/>} 
  color="emerald" 
/>
        <StatCard 
  title="Operasional" 
  value={`Rp ${stats.totalPengeluaran.toLocaleString()}`} 
  sub="Saldo Laporan" 
  icon={<ReceiptText size={20}/>} 
  color="orange" 
/>
        <StatCard title="Total Tunggakan" value={`Rp ${stats.totalTunggakan.toLocaleString()}`} sub="Tunggakan Santri" icon={<Wallet size={20}/>} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-wider">Efektivitas Penagihan Syahriah</h3>
            <span className="text-2xl font-black text-sky-600">{efektivitas}%</span>
          </div>
          <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden shadow-inner">
            <div 
              className="bg-gradient-to-r from-sky-400 to-sky-600 h-full transition-all duration-1000" 
              style={{ width: `${efektivitas}%` }}
            ></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
              <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Dana Tertagih</p>
              <p className="text-sm font-black text-emerald-900">Rp {stats.totalPemasukan.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-center">
              <p className="text-[9px] font-black text-red-600 uppercase mb-1">Belum Tertagih</p>
              <p className="text-sm font-black text-red-900">Rp {stats.totalTunggakan.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col items-center">
          <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest mb-4 self-start">Rasio Pembayaran</h3>
          <div className="w-full h-[200px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Lunas', value: stats.totalPemasukan },
                    { name: 'Menunggak', value: stats.totalTunggakan }
                  ]}
                  cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value" stroke="none"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '10px', fontWeight: '900' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-slate-900">{efektivitas}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 space-y-6">
        <div className="flex gap-4 border-b border-slate-200 overflow-x-auto custom-scrollbar">
           {["overview", "santri", "keuangan"].map((tab) => (
             <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                activeTab === tab ? "text-sky-600 border-b-4 border-sky-600" : "text-slate-400 hover:text-slate-600"
              )}
             >
               {tab === "overview" ? "Ringkasan" : tab === "santri" ? "Data Santri" : "Laporan Unit"}
             </button>
           ))}
        </div>
        
        <div className="animate-in slide-in-from-bottom-4 duration-500">
          {/* PERBAIKAN: ManajemenSantri (tadi ManajemenSant) */}
          {activeTab === "santri" && <ManajemenSantri onUpdate={loadStats} />}
          {activeTab === "keuangan" && <LaporanKeuangan onUpdate={loadStats} />}
        </div>
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
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm group hover:border-sky-500 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-3 rounded-2xl border", themes[color])}>{icon}</div>
        <div className="h-1.5 w-1.5 rounded-full bg-slate-200 group-hover:bg-sky-500"></div>
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <h3 className="text-lg font-black text-slate-900 mt-1">{value}</h3>
        <p className="text-[8px] font-bold text-slate-300 uppercase mt-1">{sub}</p>
      </div>
    </div>
  )
}