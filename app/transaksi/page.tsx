"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  Plus, Search, Receipt, CheckCircle2, 
  X, Save, Loader2, AlertCircle, Trash2, Calendar, Inbox, FileText, Banknote
} from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import Swal from "sweetalert2"
import QRCode from "qrcode"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { cn } from "@/lib/utils"

const BULAN_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

export default function TransaksiPage() {
  const [santriList, setSantriList] = useState<any[]>([])
  const [pembayaranList, setPembayaranList] = useState<any[]>([])
  const [masterTarif, setMasterTarif] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterBulan, setFilterBulan] = useState(new Date().getMonth() + 1)
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear())

  const [printingId, setPrintingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchSantriInModal, setSearchSantriInModal] = useState("")
  const [selectedSantri, setSelectedSantri] = useState<any | null>(null)
  
  const [formData, setFormData] = useState({
    bulan_bayar: new Date().getMonth() + 1,
    tahun_bayar: new Date().getFullYear(),
    nominal_dapur: "",
    nominal_pesantren: "",
    nominal_sekolah: "",
    nominal_total: "", 
    keterangan: ""
  })

  useEffect(() => { loadAllData() }, [filterBulan, filterTahun])

  async function loadAllData() {
    const supabase = getSupabase()
    const [resSantri, resPay, resTarif] = await Promise.all([
      supabase.from("santri").select("*").order("nama_lengkap", { ascending: true }),
      supabase.from("transaksi_pembayaran_v2").select("*").eq("bulan", filterBulan).eq("tahun", filterTahun),
      supabase.from("tarif").select("*").eq("angkatan", 2026)
    ])
    setSantriList(resSantri.data || [])
    setPembayaranList(resPay.data || [])
    setMasterTarif(resTarif.data || [])
  }

  const getTargetDinamis = (santri: any, kategori: string) => {
    if (!santri || masterTarif.length === 0) return 0
    const k = santri.jenjang 
    const getNominal = (komp: string) => masterTarif.find(t => t.komponen === komp)?.nominal || 0

    if (k === "MTS PLUS") {
        if (kategori === 'dapur') return getNominal("dapur_mts")
        if (kategori === 'pesantren') return getNominal("pesantren_mts")
        if (kategori === 'sekolah') return getNominal("sekolah_mts")
    } else if (k === "MTS PLUS REVISI") {
        if (kategori === 'dapur') return getNominal("dapur_mts_revisi")
        if (kategori === 'pesantren') return getNominal("pesantren_mts_revisi")
        if (kategori === 'sekolah') return getNominal("sekolah_mts_revisi")
    } else if (k === "MA PLUS") {
        if (kategori === 'dapur') return getNominal("dapur_ma")
        if (kategori === 'pesantren') return getNominal("pesantren_ma")
        if (kategori === 'sekolah') return getNominal("sekolah_ma")
    } else if (k === "MA PLUS REVISI") {
        if (kategori === 'dapur') return getNominal("dapur_ma_revisi")
        if (kategori === 'pesantren') return getNominal("pesantren_ma_revisi")
        if (kategori === 'sekolah') return getNominal("sekolah_ma_revisi")
    } else if (k === "TAKHOSUS/KULIAH") {
        if (kategori === 'dapur') return getNominal("dapur_takhosus")
        if (kategori === 'pesantren') return getNominal("pesantren_takhosus")
    } else if (k === "PENGABDIAN") {
        if (kategori === 'pesantren') return getNominal("pesantren_pengabdian")
    } else if (k === "MTS SAJA" || k === "MA SAJA") {
        if (kategori === 'sekolah') return getNominal(k) 
    } else if (k === "SANTRI NON MUKIM") {
        if (kategori === 'pesantren') return getNominal(k) 
    }
    return 0
  }

  const santriWithTransactions = useMemo(() => {
    const idsWithTrx = new Set(pembayaranList.map(p => p.santri_id))
    return santriList.filter(s => 
      idsWithTrx.has(s.id) && 
      (s.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) || (s.nis && s.nis.toString().includes(searchTerm)))
    )
  }, [santriList, pembayaranList, searchTerm])

  const filteredSantriForModal = useMemo(() => {
    if (!searchSantriInModal) return []
    return santriList.filter(s => 
      s.nama_lengkap.toLowerCase().includes(searchSantriInModal.toLowerCase()) || 
      (s.nis && s.nis.toString().includes(searchSantriInModal))
    ).slice(0, 5)
  }, [santriList, searchSantriInModal])

  const handleSimpanBayar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSantri) return
    setIsSubmitting(true)
    const supabase = getSupabase()
    const entries = []
    
    const baseData = {
        santri_id: selectedSantri.id,
        bulan: formData.bulan_bayar,
        tahun: formData.tahun_bayar,
        keterangan: formData.keterangan
    }

    if (Number(formData.nominal_dapur) > 0) entries.push({ ...baseData, kategori: 'dapur', jumlah_bayar: Number(formData.nominal_dapur) })
    if (Number(formData.nominal_pesantren) > 0) entries.push({ ...baseData, kategori: 'pesantren', jumlah_bayar: Number(formData.nominal_pesantren) })
    if (Number(formData.nominal_sekolah) > 0) entries.push({ ...baseData, kategori: 'sekolah', jumlah_bayar: Number(formData.nominal_sekolah) })
    
    if (Number(formData.nominal_total) > 0) {
        let kategoriTujuan = 'pesantren';
        if (selectedSantri.jenjang === "MTS SAJA" || selectedSantri.jenjang === "MA SAJA") {
            kategoriTujuan = 'sekolah'; 
        } else if (selectedSantri.jenjang === "SANTRI NON MUKIM") {
            kategoriTujuan = 'pesantren'; 
        }
        entries.push({ ...baseData, kategori: kategoriTujuan, jumlah_bayar: Number(formData.nominal_total) })
    }

    try {
      const { error } = await supabase.from("transaksi_pembayaran_v2").insert(entries)
      if (error) throw error
      Swal.fire({ icon: 'success', title: 'Pembayaran Berhasil', timer: 1000, showConfirmButton: false })
      closeModal()
      loadAllData()
    } catch (err: any) { Swal.fire("Gagal", err.message, "error") } finally { setIsSubmitting(false) }
  }

  const handleDeleteTrxBySantri = async (s: any) => {
    const res = await Swal.fire({
      title: 'Hapus Transaksi?',
      text: `Hapus seluruh catatan pembayaran ${s.nama_lengkap} pada periode ini?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Hapus Semua'
    })

    if (res.isConfirmed) {
      try {
        const { error } = await getSupabase()
          .from("transaksi_pembayaran_v2")
          .delete()
          .eq("santri_id", s.id)
          .eq("bulan", filterBulan)
          .eq("tahun", filterTahun)
        
        if (error) throw error
        Swal.fire({ icon: 'success', title: 'Data Dihapus', timer: 1000, showConfirmButton: false })
        loadAllData() 
      } catch (err: any) {
        Swal.fire("Gagal", err.message, "error")
      }
    }
  }

  const cetakKwitansiPDF = async (s: any) => {
    setPrintingId(s.id);
    try {
      const doc = new jsPDF('p', 'mm', [105, 148]); // Ukuran A6
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const centerX = pageWidth / 2;

      const categories = ["dapur", "pesantren", "sekolah"];
      const detailBayar = categories.map(cat => {
        const target = getTargetDinamis(s, cat);
        const terbayar = pembayaranList
          .filter(p => p.santri_id === s.id && p.kategori === cat)
          .reduce((a, b) => a + b.jumlah_bayar, 0);
        
        let namaIuran = cat === 'dapur' ? "Syahriah Dapur" : cat === 'pesantren' ? "Syahriah Pesantren" : "Syahriah Sekolah";

        return {
          nama: namaIuran,
          terbayar,
          target,
          sisa: Math.max(0, target - terbayar),
          isLunas: terbayar >= target || target === 0
        };
      }).filter(d => d.terbayar > 0 || d.target > 0);

      const totalTerbayar = detailBayar.reduce((a, b) => a + b.terbayar, 0);
      const totalSisa = detailBayar.reduce((a, b) => a + b.sisa, 0);
      const qrText = `VAL-BMT ADZKIA: ${s.nama_lengkap} | Rp ${totalTerbayar.toLocaleString()} | ${BULAN_NAMES[filterBulan-1]} ${filterTahun}`;
      const qrDataUrl = await QRCode.toDataURL(qrText);

      // --- HEADER ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("PONPES AL-HIDAYAH CISADAP", centerX, 12, { align: "center" });
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("Jl. Cisadap No. 01, Kec. Ciamis, Kab. Ciamis, Jawa Barat", centerX, 16, { align: "center" });
      doc.line(10, 19, pageWidth - 10, 19);
      
      doc.setFont("helvetica", "bold");
      doc.text("BUKTI PEMBAYARAN SYAHRIAH", centerX, 26, { align: "center" });

      // --- DATA SANTRI ---
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`TANGGAL : ${new Date().toLocaleDateString('id-ID')}`, 10, 34);
      doc.text(`NAMA       : ${s.nama_lengkap.toUpperCase()}`, 10, 38);
      doc.text(`KELAS      : ${s.jenjang} - ${s.kelas}`, 10, 42);
      doc.text(`PERIODE  : ${BULAN_NAMES[filterBulan-1]} ${filterTahun}`, 10, 46);

      // --- TABEL ---
      autoTable(doc, {
        startY: 50,
        head: [['Jenis Iuran', 'Jumlah Bayar', 'Keterangan']],
        body: detailBayar.map(d => [
          d.nama, 
          `Rp ${d.terbayar.toLocaleString()}`, 
          d.isLunas ? 'LUNAS' : `SISA: Rp ${d.sisa.toLocaleString()}`
        ]),
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2.5 },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
        margin: { left: 10, right: 10 }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 8;

      // --- QR CODE & INSTRUKSI ---
      doc.addImage(qrDataUrl, 'PNG', 10, finalY, 20, 20);
      doc.setFontSize(6);
      doc.setFont("helvetica", "italic");
      doc.text("Scan untuk validasi data", 10, finalY + 23);

      // --- TOTAL DITERIMA ---
      doc.setFillColor(241, 245, 249);
      doc.rect(pageWidth - 60, finalY + 25, 50, 12, 'F');
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL DITERIMA:", pageWidth - 57, finalY + 29);
      doc.setFontSize(10);
      doc.text(`Rp ${totalTerbayar.toLocaleString()}`, pageWidth - 13, finalY + 34, { align: "right" });

      // --- FOOTER (Jazakumullah & BMT ADZKIA) ---
      const footerY = pageHeight - 10;
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100);
      doc.text("Jazakumullahu khairan katsiran", centerX, footerY, { align: "center" });
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text("BMT ADZKIA", centerX, footerY + 5, { align: "center" });

      doc.save(`Kwitansi_${s.nama_lengkap}_${BULAN_NAMES[filterBulan-1]}.pdf`);
    } catch (err) {
      console.error(err);
      Swal.fire("Gagal Cetak", "Terjadi kesalahan saat membuat PDF", "error");
    } finally {
      setPrintingId(null);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedSantri(null)
    setSearchSantriInModal("")
    setFormData({ bulan_bayar: filterBulan, tahun_bayar: filterTahun, nominal_dapur: "", nominal_pesantren: "", nominal_sekolah: "", nominal_total: "", keterangan: "" })
  }

  const RenderPaymentCell = ({ santri, jenis }: { santri: any, jenis: string }) => {
    const target = getTargetDinamis(santri, jenis)
    const trxInCell = pembayaranList.filter(p => p.santri_id === santri.id && p.kategori === jenis)
    const totalTerbayar = trxInCell.reduce((a, b) => a + b.jumlah_bayar, 0)
    const isLunas = target === 0 || (target > 0 && totalTerbayar >= target)
    
    if (target === 0 && trxInCell.length === 0) return <span className="text-slate-200">-</span>
    
    return (
      <div className="flex flex-col gap-1 items-center justify-center min-h-[50px] py-1">
        <div className="flex flex-wrap gap-1 justify-center">
          {trxInCell.map((t) => (
            <div key={t.id} className="group relative bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm hover:border-sky-300 transition-all cursor-help">
              <span className={cn("text-[9px] font-black", isLunas ? "text-emerald-600" : "text-red-600")}>{t.jumlah_bayar.toLocaleString()}</span>
              <div className="hidden group-hover:flex absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[8px] py-1 px-2 rounded-md z-50 shadow-xl items-center gap-2">
                <span>{new Date(t.created_at).toLocaleDateString('id-ID')}</span>
                <button onClick={() => {
                   getSupabase().from("transaksi_pembayaran_v2").delete().eq("id", t.id).then(() => loadAllData())
                }} className="text-red-400 hover:text-red-200"><Trash2 size={10}/></button>
              </div>
            </div>
          ))}
        </div>
        {isLunas && target > 0 ? (
          <span className="text-[8px] font-black text-emerald-700 uppercase bg-emerald-50 px-1.5 rounded border border-emerald-200">Lunas</span>
        ) : target > 0 && (
          <span className="text-[7px] font-bold text-red-500 uppercase italic">Sisa: {(target - totalTerbayar).toLocaleString()}</span>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-in fade-in duration-500 font-sans text-black">
      {/* HEADER */}
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-sky-50 p-2.5 rounded-xl text-sky-600 shadow-inner"><Receipt size={26} /></div>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">Monitoring Transaksi</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
               <Calendar size={12} className="text-sky-500" /> Periode: {BULAN_NAMES[filterBulan-1]} {filterTahun}
            </p>
          </div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-yellow-400 hover:bg-yellow-500 text-sky-900 font-black px-6 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-[10px] uppercase transition-all active:scale-95 border-b-4 border-yellow-600">
          <Plus size={16} strokeWidth={3} /> Input Transaksi
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-4 items-center">
          <div className="relative w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input type="text" placeholder="Cari nama santri..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-[11px] font-bold outline-none focus:border-sky-600 bg-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <select value={filterBulan} onChange={(e) => setFilterBulan(Number(e.target.value))} className="px-3 py-1.5 text-[10px] font-black uppercase outline-none bg-transparent cursor-pointer">{BULAN_NAMES.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}</select>
            <div className="w-px h-4 bg-slate-200"></div>
            <select value={filterTahun} onChange={(e) => setFilterTahun(Number(e.target.value))} className="px-3 py-1.5 text-[10px] font-black outline-none bg-transparent cursor-pointer">{[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}</select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[550px] overflow-y-auto custom-scrollbar">
         <table className="w-full text-left border-collapse">
  <thead className="bg-slate-900 text-white uppercase text-[9px] font-black tracking-widest sticky top-0 z-10">
    <tr>
      <th className="px-6 py-4 border-r border-slate-700">Profil Santri</th>
      <th className="px-4 py-4 text-center border-r border-slate-700">Kategori</th>
      <th className="px-4 py-4 text-center border-r border-slate-700">Dapur</th>
      <th className="px-4 py-4 text-center border-r border-slate-700">Pesantren</th>
      <th className="px-4 py-4 text-center border-r border-slate-700">Sekolah</th>
      <th className="px-4 py-4 text-center border-r border-slate-700">Status</th>
      <th className="px-4 py-4 text-center">Aksi</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-slate-100">
    {santriWithTransactions.map(s => {
      // LOGIKA PENENTU STATUS LENGKAP/KURANG
      const targetD = getTargetDinamis(s, "dapur");
      const targetP = getTargetDinamis(s, "pesantren");
      const targetS = getTargetDinamis(s, "sekolah");

      const bayarD = pembayaranList.filter(p => p.santri_id === s.id && p.kategori === "dapur").reduce((a, b) => a + b.jumlah_bayar, 0);
      const bayarP = pembayaranList.filter(p => p.santri_id === s.id && p.kategori === "pesantren").reduce((a, b) => a + b.jumlah_bayar, 0);
      const bayarS = pembayaranList.filter(p => p.santri_id === s.id && p.kategori === "sekolah").reduce((a, b) => a + b.jumlah_bayar, 0);

      const isFullyLunas = (bayarD >= targetD) && (bayarP >= targetP) && (bayarS >= targetS);

      return (
        <tr key={s.id} className={cn("hover:bg-sky-50/30 transition-colors", isFullyLunas && "bg-emerald-50/20")}>
          <td className="px-6 py-3 border-r border-slate-50">
            <div className="font-black text-[11px] uppercase text-slate-800">{s.nama_lengkap}</div>
            <div className="text-[9px] font-bold text-sky-600">NIS: {s.nis || "-"}</div>
          </td>
          <td className="px-4 py-3 border-r border-slate-50 text-center">
            <span className="text-[8px] font-black text-sky-700 bg-sky-100 px-2 py-0.5 rounded uppercase">{s.jenjang}</span>
          </td>
          <td className="px-4 py-3 border-r border-slate-50"><RenderPaymentCell santri={s} jenis="dapur" /></td>
          <td className="px-4 py-3 border-r border-slate-50"><RenderPaymentCell santri={s} jenis="pesantren" /></td>
          <td className="px-4 py-3 border-r border-slate-50"><RenderPaymentCell santri={s} jenis="sekolah" /></td>
          
          {/* KOLOM STATUS BARU */}
          <td className="px-4 py-3 border-r border-slate-50 text-center">
            {isFullyLunas ? (
              <div className="flex flex-col items-center gap-1">
                <CheckCircle2 className="text-emerald-500" size={18} />
                <span className="text-[8px] font-black text-emerald-600 uppercase">Lunas</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <AlertCircle className="text-orange-400" size={18} />
                <span className="text-[8px] font-black text-orange-500 uppercase">Kurang</span>
              </div>
            )}
          </td>

          <td className="px-4 py-3 text-center">
            <div className="flex justify-center gap-1">
              <button onClick={() => cetakKwitansiPDF(s)} disabled={printingId === s.id} className={cn("p-2 rounded-lg transition-all", printingId === s.id ? "text-slate-300" : "text-sky-600 hover:bg-sky-50")} title="Cetak Kwitansi">
                {printingId === s.id ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              </button>
              <button onClick={() => handleDeleteTrxBySantri(s)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Hapus Data">
                <Trash2 size={16} />
              </button>
            </div>
          </td>
        </tr>
      );
    })}
  </tbody>
</table>
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="bg-sky-900 p-4 text-white flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest">Input Pembayaran Baru</h3>
              <button onClick={closeModal} className="hover:bg-white/20 p-1 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSimpanBayar} className="p-6 space-y-4">
              <div className="space-y-1 relative text-black">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nama Santri</label>
                {selectedSantri ? (
                  <div className="flex items-center justify-between bg-sky-50 border border-sky-200 p-3 rounded-xl text-black">
                    <div>
                      <div className="text-[10px] font-black uppercase text-slate-800">{selectedSantri.nama_lengkap}</div>
                      <div className="text-[8px] font-bold text-sky-600 uppercase italic">{selectedSantri.jenjang} - KELAS {selectedSantri.kelas}</div>
                    </div>
                    <button type="button" onClick={() => setSelectedSantri(null)} className="text-red-500 text-[9px] font-black hover:bg-red-50 px-2 py-1 rounded-lg transition-all">GANTI</button>
                  </div>
                ) : (
                  <>
                    <input autoFocus type="text" placeholder="Ketik nama atau NIS..." className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:border-sky-600 bg-slate-50 text-black" value={searchSantriInModal} onChange={(e) => setSearchSantriInModal(e.target.value)} />
                    {filteredSantriForModal.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 shadow-2xl rounded-xl z-50 overflow-hidden mt-1">
                        {filteredSantriForModal.map(s => (
                          <div key={s.id} onClick={() => {setSelectedSantri(s); setSearchSantriInModal("")}} className="px-4 py-2.5 hover:bg-sky-50 cursor-pointer border-b border-slate-50 flex items-center justify-between">
                            <div className="text-[9px] font-black uppercase text-slate-800">{s.nama_lengkap}</div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase">{s.jenjang}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              {selectedSantri && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="mb-3 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3 text-black">
                     <AlertCircle className="text-amber-500 shrink-0" size={16} />
                     <p className="text-[8px] font-bold text-amber-700 uppercase leading-relaxed">Sistem mendeteksi kategori <span className="underline">{selectedSantri.jenjang}</span>.</p>
                  </div>
                  <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-black">
                    {["MTS SAJA", "MA SAJA", "SANTRI NON MUKIM"].includes(selectedSantri.jenjang) ? (
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase">Total Syahriah Bulanan</label>
                        <div className="flex shadow-sm">
                          <span className="px-3 bg-white border border-r-0 rounded-l-lg text-[9px] font-black flex items-center">Rp</span>
                          <input type="number" required className="w-full px-3 py-2 border rounded-r-lg text-[11px] font-black outline-none focus:border-sky-600 text-black" placeholder="0" value={formData.nominal_total} onChange={(e) => setFormData({...formData, nominal_total: e.target.value})} />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {selectedSantri.jenjang !== "PENGABDIAN" && (
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase">Syahriah Dapur</label>
                            <input type="number" className="w-full px-3 py-2 border rounded-lg text-[11px] font-black outline-none text-black" placeholder="0" value={formData.nominal_dapur} onChange={(e) => setFormData({...formData, nominal_dapur: e.target.value})} />
                          </div>
                        )}
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-400 uppercase">Syahriah Pesantren</label>
                          <input type="number" className="w-full px-3 py-2 border rounded-lg text-[11px] font-black outline-none text-black" placeholder="0" value={formData.nominal_pesantren} onChange={(e) => setFormData({...formData, nominal_pesantren: e.target.value})} />
                        </div>
                        { !["TAKHOSUS/KULIAH", "PENGABDIAN"].includes(selectedSantri.jenjang) && (
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase">Syahriah Sekolah</label>
                            <input type="number" className="w-full px-3 py-2 border rounded-lg text-[11px] font-black outline-none text-black" placeholder="0" value={formData.nominal_sekolah} onChange={(e) => setFormData({...formData, nominal_sekolah: e.target.value})} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <button disabled={isSubmitting || !selectedSantri} type="submit" className="w-full bg-sky-900 text-white font-black py-4 rounded-xl text-[10px] uppercase shadow-lg border-b-4 border-sky-950 flex justify-center items-center gap-2 disabled:opacity-50">
                {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Simpan Transaksi
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}