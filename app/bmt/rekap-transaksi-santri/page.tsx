"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Calendar, RotateCcw } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { BULAN_NAMES, hitungRekapTransaksiSantri } from "@/modules/bmt/lib/transactionHelpers"

// Import komponen
import Header from "@/modules/bmt/components/rekap-transaksi-santri/Header"
import SantriSearch from "@/modules/bmt/components/rekap-transaksi-santri/SantriSearch"
import SantriProfileCard from "@/modules/bmt/components/rekap-transaksi-santri/SantriProfileCard"
import MetricCards from "@/modules/bmt/components/rekap-transaksi-santri/MetricCards"
import TransactionTable from "@/modules/bmt/components/rekap-transaksi-santri/TransactionTable"

export default function RekapTransaksiSantriPage() {
  const [mounted, setMounted] = useState(false)
  const [santriList, setSantriList] = useState<any[]>([])
  const [masterTarif, setMasterTarif] = useState<any[]>([])
  
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSantri, setSelectedSantri] = useState<any | null>(null)
  
  const [transaksiSantri, setTransaksiSantri] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingTransaksi, setIsLoadingTransaksi] = useState(false)

  // Default: tampilkan semua pembayaran santri (tidak terkunci per bulan)
  const [filterBulan, setFilterBulan] = useState<number | "semua">("semua")
  const [filterTahun, setFilterTahun] = useState<number | "semua">("semua")

  const loadInitialData = useCallback(async () => {
    setIsLoading(true)
    const supabase = getSupabase()
    const [resSantri, resTarif] = await Promise.all([
      supabase.from("santri").select("*").order("nama_lengkap", { ascending: true }),
      supabase.from("tarif").select("*").eq("angkatan", 2026) 
    ])

    setSantriList(resSantri.data || [])
    setMasterTarif(resTarif.data || [])
    setIsLoading(false)
  }, [])

  useEffect(() => {
    setMounted(true)
    loadInitialData()
  }, [loadInitialData])

  const filteredSantriList = useMemo(() => {
    if (!searchTerm) return []
    return santriList.filter(s => 
      s.nama_lengkap?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.nis && s.nis.toString().includes(searchTerm))
    ).slice(0, 5) 
  }, [santriList, searchTerm])

  const handleSelectSantri = async (santri: any) => {
    setSelectedSantri(santri)
    setSearchTerm("")
    setFilterBulan("semua")
    setFilterTahun("semua")
    setIsLoadingTransaksi(true)
    
    const supabase = getSupabase()
    const res = await supabase
      .from("transaksi_pembayaran_v2")
      .select("*")
      .eq("santri_id", santri.id)
      .order("tahun", { ascending: false })
      .order("bulan", { ascending: false })
      .order("created_at", { ascending: false })
      
    setTransaksiSantri(res.data || [])
    setIsLoadingTransaksi(false)
  }

  // Opsi tahun dinamis berdasarkan tahun mulai santri, tahun sekarang, dan tahun transaksi
  const tahunOptions = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const years = new Set<number>([currentYear])

    const dateStr = selectedSantri?.tanggal_mulai_tagihan || selectedSantri?.tanggal_masuk
    if (dateStr) {
      const startYear = new Date(dateStr).getFullYear()
      if (!Number.isNaN(startYear) && startYear > 2000) {
        for (let y = startYear; y <= currentYear; y++) years.add(y)
      }
    }

    transaksiSantri.forEach(t => {
      const y = Number(t.tahun)
      if (y > 2000) years.add(y)
    })

    return Array.from(years).sort((a, b) => b - a)
  }, [selectedSantri, transaksiSantri])

  const handleChangeBulan = (val: string) => {
    if (val === "semua") {
      setFilterBulan("semua")
      return
    }
    const bulanNum = Number(val)
    setFilterBulan(bulanNum)
    if (filterTahun === "semua") {
      setFilterTahun(new Date().getFullYear())
    }
  }

  const handleChangeTahun = (val: string) => {
    if (val === "semua") {
      setFilterTahun("semua")
      setFilterBulan("semua")
      return
    }
    setFilterTahun(Number(val))
  }

  const handleResetPeriode = () => {
    setFilterBulan("semua")
    setFilterTahun("semua")
  }

  const isPeriodeFiltered = filterBulan !== "semua" || filterTahun !== "semua"
  const isSingleMonth = filterBulan !== "semua" && filterTahun !== "semua"

  const periodeLabel = useMemo(() => {
    if (filterBulan !== "semua" && filterTahun !== "semua") {
      return `${BULAN_NAMES[filterBulan - 1]} ${filterTahun}`
    }
    if (filterTahun !== "semua") {
      return `Tahun ${filterTahun}`
    }
    return "Semua Periode"
  }, [filterBulan, filterTahun])

  // Transaksi yang ditampilkan sesuai filter bulan & tahun (default: semua transaksi santri)
  const transaksiPeriode = useMemo(() => {
    return transaksiSantri.filter(trx => {
      if (filterTahun !== "semua" && Number(trx.tahun) !== filterTahun) return false
      if (filterBulan !== "semua" && Number(trx.bulan) !== filterBulan) return false
      return true
    })
  }, [transaksiSantri, filterBulan, filterTahun])

  // Masa aktif keseluruhan santri (untuk kartu profil)
  const rekapKeseluruhan = useMemo(
    () => hitungRekapTransaksiSantri(selectedSantri, transaksiSantri, masterTarif),
    [selectedSantri, transaksiSantri, masterTarif]
  )

  // Rekap pembayaran & tunggakan sesuai periode yang dipilih (default = keseluruhan)
  const rekap = useMemo(
    () =>
      isPeriodeFiltered
        ? hitungRekapTransaksiSantri(selectedSantri, transaksiSantri, masterTarif, new Date(), {
            bulan: filterBulan,
            tahun: filterTahun,
          })
        : rekapKeseluruhan,
    [isPeriodeFiltered, selectedSantri, transaksiSantri, masterTarif, filterBulan, filterTahun, rekapKeseluruhan]
  )

  if (!mounted) return null

  return (
    <div className="p-4 lg:p-6 space-y-4 animate-in fade-in duration-500 text-slate-800 font-sans min-h-screen bg-slate-50/50">
      
      <Header />
      
      <SantriSearch 
        searchTerm={searchTerm} 
        setSearchTerm={setSearchTerm} 
        isLoading={isLoading} 
        filteredList={filteredSantriList} 
        onSelect={handleSelectSantri} 
      />
      
      {/* 
        Area ini muncul hanya jika santri sudah dipilih.
        Default menampilkan semua pembayaran santri; filter bulan & tahun langsung menyaring tabel serta total pembayaran & tunggakan.
      */}
      {selectedSantri && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">

          {/* Filter Periode (Semua Periode / Per Tahun / Per Bulan & Tahun) */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="bg-sky-50 text-sky-600 p-1.5 rounded-lg border border-sky-100">
                <Calendar size={15} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 leading-tight">Filter Periode Rekap</p>
                <p className="text-[10px] text-slate-400 font-medium">
                  Menampilkan: <span className="font-semibold text-sky-600">{periodeLabel}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filter Bulan"
                value={filterBulan}
                onChange={e => handleChangeBulan(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:border-sky-500 focus:bg-white cursor-pointer"
              >
                <option value="semua">Semua Bulan</option>
                {BULAN_NAMES.map((nama, idx) => (
                  <option key={nama} value={idx + 1}>{nama}</option>
                ))}
              </select>

              <select
                aria-label="Filter Tahun"
                value={filterTahun}
                onChange={e => handleChangeTahun(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:border-sky-500 focus:bg-white cursor-pointer"
              >
                <option value="semua">Semua Tahun</option>
                {tahunOptions.map(thn => (
                  <option key={thn} value={thn}>{thn}</option>
                ))}
              </select>

              {isPeriodeFiltered && (
                <button
                  type="button"
                  onClick={handleResetPeriode}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors"
                >
                  <RotateCcw size={12} /> Semua Periode
                </button>
              )}
            </div>
          </div>
          
          {/* Kartu Profil & Metrik Tunggakan/Lunas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SantriProfileCard santri={selectedSantri} jumlahBulan={rekapKeseluruhan?.jumlahBulan || 0} />
            <MetricCards rekap={rekap} periodeLabel={periodeLabel} isSingleMonth={isSingleMonth} />
          </div>
          
          {/* Tabel Transaksi yang terintegrasi dengan Filter Periode, Kategori, Pencarian & Export */}
          <TransactionTable 
            transaksi={transaksiPeriode} 
            isLoading={isLoadingTransaksi} 
            santriName={selectedSantri.nama_lengkap || selectedSantri.nama}
            periodeLabel={periodeLabel}
          />

        </div>
      )}

      {/* Global Style untuk Scrollbar Tabel */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
      
    </div>
  )
}