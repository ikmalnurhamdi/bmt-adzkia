import { useState, useEffect, useMemo, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";

export function useTunggakan() {
  const [mounted, setMounted] = useState(false);
  const [santriList, setSantriList] = useState<any[]>([]);
  const [pembayaranList, setPembayaranList] = useState<any[]>([]);
  const [masterTarif, setMasterTarif] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBulan, setFilterBulan] = useState(new Date().getMonth() + 1);
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const supabase = getSupabase();
    const [resSantri, resBayar, resTarif] = await Promise.all([
      supabase.from("santri").select("*").order("nama_lengkap", { ascending: true }),
      supabase.from("transaksi_pembayaran_v2").select("*").eq("bulan", filterBulan).eq("tahun", filterTahun),
      supabase.from("tarif").select("*").eq("angkatan", 2026)
    ]);

    setSantriList(resSantri.data || []);
    setPembayaranList(resBayar.data || []);
    setMasterTarif(resTarif.data || []);
    setIsLoading(false);
  }, [filterBulan, filterTahun]);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [loadData]);

  // LOGIKA TAHUN DINAMIS: Mencari tahun terlama dari data santri sampai tahun saat ini
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear(); // Tahun real-time
    if (santriList.length === 0) return [currentYear];

    let minYear = currentYear;
    santriList.forEach(s => {
      // Ambil tanggal mulai tagihan atau tanggal masuk santri
      const dateStr = s.tanggal_mulai_tagihan || s.tanggal_masuk;
      if (dateStr) {
        const year = new Date(dateStr).getFullYear();
        if (year < minYear) {
          minYear = year; // Temukan tahun paling lama
        }
      }
    });

    // Buat array dari tahun terlama sampai tahun sekarang
    const years = [];
    for (let y = minYear; y <= currentYear; y++) {
      years.push(y);
    }
    return years;
  }, [santriList]);

  const getTargetDinamis = (santri: any, jenisKategori: string) => {
    if (!santri || masterTarif.length === 0) return 0;
    const k = santri.jenjang;
    const getNominal = (komp: string) => masterTarif.find(t => t.komponen === komp)?.nominal || 0;

    if (k === "MTS PLUS") {
      if (jenisKategori === 'dapur') return getNominal("dapur_mts");
      if (jenisKategori === 'pesantren') return getNominal("pesantren_mts");
      if (jenisKategori === 'sekolah') return getNominal("sekolah_mts");
    } else if (k === "MTS PLUS REVISI") {
      if (jenisKategori === 'dapur') return getNominal("dapur_mts_revisi");
      if (jenisKategori === 'pesantren') return getNominal("pesantren_mts_revisi");
      if (jenisKategori === 'sekolah') return getNominal("sekolah_mts_revisi");
    } else if (k === "MA PLUS") {
      if (jenisKategori === 'dapur') return getNominal("dapur_ma");
      if (jenisKategori === 'pesantren') return getNominal("pesantren_ma");
      if (jenisKategori === 'sekolah') return getNominal("sekolah_ma");
    } else if (k === "MA PLUS REVISI") {
      if (jenisKategori === 'dapur') return getNominal("dapur_ma_revisi");
      if (jenisKategori === 'pesantren') return getNominal("pesantren_ma_revisi");
      if (jenisKategori === 'sekolah') return getNominal("sekolah_ma_revisi");
    } else if (k === "TAKHOSUS/KULIAH") {
      if (jenisKategori === 'dapur') return getNominal("dapur_takhosus");
      if (jenisKategori === 'pesantren') return getNominal("pesantren_takhosus");
      return 0;
    } else if (k === "PENGABDIAN") {
      if (jenisKategori === 'pesantren') return getNominal("pesantren_pengabdian");
      return 0;
    } else if (k === "MTS SAJA" || k === "MA SAJA") {
      if (jenisKategori === 'sekolah') return getNominal(k);
      return 0;
    } else if (k === "SANTRI NON MUKIM") {
      if (jenisKategori === 'pesantren') return getNominal(k);
      return 0;
    }
    return 0;
  };

  const processedData = useMemo(() => {
    let totalMasuk = pembayaranList.reduce((a, b) => a + (b.jumlah_bayar || 0), 0);
    let totalTunggakan = 0;

    const list = santriList.map(s => {
      const tglReferensi = s.tanggal_mulai_tagihan ? new Date(s.tanggal_mulai_tagihan) : new Date(s.tanggal_masuk);
      const tglAwalWajib = new Date(tglReferensi.getFullYear(), tglReferensi.getMonth(), 1);
      const tglFilterAktif = new Date(filterTahun, filterBulan - 1, 1);
      const isBelumWajibBayar = tglFilterAktif < tglAwalWajib;

      const targetD = isBelumWajibBayar ? 0 : getTargetDinamis(s, "dapur");
      const targetP = isBelumWajibBayar ? 0 : getTargetDinamis(s, "pesantren");
      const targetS = isBelumWajibBayar ? 0 : getTargetDinamis(s, "sekolah");

      const bayarD = pembayaranList.filter(p => p.santri_id === s.id && p.kategori === "dapur").reduce((a, b) => a + b.jumlah_bayar, 0);
      const bayarP = pembayaranList.filter(p => p.santri_id === s.id && p.kategori === "pesantren").reduce((a, b) => a + b.jumlah_bayar, 0);
      const bayarS = pembayaranList.filter(p => p.santri_id === s.id && p.kategori === "sekolah").reduce((a, b) => a + b.jumlah_bayar, 0);

      const sisaD = Math.max(0, targetD - bayarD);
      const sisaP = Math.max(0, targetP - bayarP);
      const sisaS = Math.max(0, targetS - bayarS);
      const totalSisa = sisaD + sisaP + sisaS;

      if (totalSisa > 0) totalTunggakan += totalSisa;
      return { ...s, sisaD, sisaP, sisaS, totalSisa };
    }).filter(res => 
      res.totalSisa > 0 && 
      (res.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) || (res.nis && res.nis.toString().includes(searchTerm)))
    );

    return { list, totalMasuk, totalTunggakan };
  }, [santriList, pembayaranList, masterTarif, searchTerm, filterBulan, filterTahun]);

  return {
    mounted,
    searchTerm, setSearchTerm,
    filterBulan, setFilterBulan,
    filterTahun, setFilterTahun,
    isLoading, loadData,
    availableYears,
    processedData
  };
}