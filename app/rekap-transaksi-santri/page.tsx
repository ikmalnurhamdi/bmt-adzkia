"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import { getTargetDinamis } from "../transaksi/utils/transactionHelpers"

// Import komponen
import Header from "@/components/rekap-transaksi-santri/Header"
import SantriSearch from "@/components/rekap-transaksi-santri/SantriSearch"
import SantriProfileCard from "@/components/rekap-transaksi-santri/SantriProfileCard"
import MetricCards from "@/components/rekap-transaksi-santri/MetricCards"
import TransactionTable from "@/components/rekap-transaksi-santri/TransactionTable"

export default function RekapTransaksiSantriPage() {
  const [mounted, setMounted] = useState(false)
  const [santriList, setSantriList] = useState<any[]>([])
  const [masterTarif, setMasterTarif] = useState<any[]>([])
  
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSantri, setSelectedSantri] = useState<any | null>(null)
  
  const [transaksiSantri, setTransaksiSantri] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingTransaksi, setIsLoadingTransaksi] = useState(false)

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

  const rekap = useMemo(() => {
    if (!selectedSantri) return null

    const totalPembayaran = transaksiSantri.reduce((a, b) => a + (b.jumlah_bayar || 0), 0)
    let jumlahBulan = 0
    let tglMasukStr = selectedSantri.tanggal_masuk
    
    if (tglMasukStr) {
      const start = new Date(tglMasukStr)
      const now = new Date()
      if (now >= start) {
        const yearsDiff = now.getFullYear() - start.getFullYear()
        const monthsDiff = now.getMonth() - start.getMonth()
        jumlahBulan = (yearsDiff * 12) + monthsDiff + 1
      }
    }

    const targetD = getTargetDinamis(selectedSantri, "dapur", masterTarif)
    const targetP = getTargetDinamis(selectedSantri, "pesantren", masterTarif)
    const targetS = getTargetDinamis(selectedSantri, "sekolah", masterTarif)
    const totalTargetBulanan = targetD + targetP + targetS

    const totalKewajiban = totalTargetBulanan * jumlahBulan
    const totalTunggakan = Math.max(0, totalKewajiban - totalPembayaran)
    const totalLebihBayar = Math.max(0, totalPembayaran - totalKewajiban)

    return {
      totalPembayaran,
      jumlahBulan,
      totalTargetBulanan,
      totalKewajiban,
      totalTunggakan,
      totalLebihBayar,
      statusLunas: totalKewajiban > 0 && totalPembayaran >= totalKewajiban
    }
  }, [selectedSantri, transaksiSantri, masterTarif])

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
        Semua info profil, metrik tagihan, dan tabel transaksi dimasukkan ke sini.
      */}
      {selectedSantri && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
          
          {/* Kartu Profil & Metrik Tunggakan/Lunas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SantriProfileCard santri={selectedSantri} jumlahBulan={rekap?.jumlahBulan || 0} />
            <MetricCards rekap={rekap} />
          </div>
          
          {/* Tabel Transaksi yang sudah terintegrasi fitur Filter & Export */}
          <TransactionTable 
            transaksi={transaksiSantri} 
            isLoading={isLoadingTransaksi} 
            santriName={selectedSantri.nama_lengkap || selectedSantri.nama} // Nama untuk file PDF/Excel
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