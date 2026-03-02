"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  Plus, Search, Receipt, CheckCircle2, 
  X, Save, Loader2, AlertCircle, Trash2, Calendar, Inbox, FileText
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
    keterangan: ""
  })

  useEffect(() => { loadAllData() }, [filterBulan, filterTahun])

  async function loadAllData() {
    const supabase = getSupabase()
    const [resSantri, resPay, resTarif] = await Promise.all([
      supabase.from("santri").select("*").order("nama_lengkap", { ascending: true }),
      supabase.from("transaksi_pembayaran_v2").select("*").eq("bulan", filterBulan).eq("tahun", filterTahun),
      supabase.from("tarif").select("*")
    ])
    setSantriList(resSantri.data || [])
    setPembayaranList(resPay.data || [])
    setMasterTarif(resTarif.data || [])
  }

  const getTargetDinamis = (santri: any, kategori: string) => {
    if (!santri || masterTarif.length === 0) return 0
    const jenjang = santri.jenjang?.toString().trim().toLowerCase()
    const tglRef = santri.tanggal_mulai_tagihan ? new Date(santri.tanggal_mulai_tagihan) : new Date(santri.tanggal_masuk)
    if (new Date(filterTahun, filterBulan - 1, 1) < new Date(tglRef.getFullYear(), tglRef.getMonth(), 1)) return 0
    let tahunReferensi = tglRef.getFullYear() < 2026 ? 2025 : tglRef.getFullYear()
    if (['takhosus', 'kuliah', 'pengabdian'].includes(jenjang)) tahunReferensi = 2025
    let komponenCari = kategori
    if (jenjang === 'takhosus' || jenjang === 'kuliah') {
      if (kategori === 'sekolah') return 0
      komponenCari = `${kategori}_takhosus`
    } else if (jenjang === 'pengabdian') {
      if (kategori !== 'pesantren') return 0
      komponenCari = `pesantren_pengabdian`
    } else if (kategori === 'sekolah') {
      komponenCari = `sekolah_${jenjang}`
    }
    const match = masterTarif.find(t => t.komponen === komponenCari && t.angkatan === tahunReferensi)
    return match ? match.nominal : 0
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
    if (formData.nominal_dapur && Number(formData.nominal_dapur) > 0) entries.push({ santri_id: selectedSantri.id, kategori: 'dapur', jumlah_bayar: Number(formData.nominal_dapur), bulan: formData.bulan_bayar, tahun: formData.tahun_bayar, keterangan: formData.keterangan })
    if (formData.nominal_pesantren && Number(formData.nominal_pesantren) > 0) entries.push({ santri_id: selectedSantri.id, kategori: 'pesantren', jumlah_bayar: Number(formData.nominal_pesantren), bulan: formData.bulan_bayar, tahun: formData.tahun_bayar, keterangan: formData.keterangan })
    if (formData.nominal_sekolah && Number(formData.nominal_sekolah) > 0) entries.push({ santri_id: selectedSantri.id, kategori: 'sekolah', jumlah_bayar: Number(formData.nominal_sekolah), bulan: formData.bulan_bayar, tahun: formData.tahun_bayar, keterangan: formData.keterangan })
    try {
      await supabase.from("transaksi_pembayaran_v2").insert(entries)
      Swal.fire({ icon: 'success', title: 'Tersimpan', timer: 1000, showConfirmButton: false })
      closeModal()
      loadAllData()
    } catch (err: any) { Swal.fire("Gagal", err.message, "error") } finally { setIsSubmitting(false) }
  }

  const handleDeleteTrx = async (id: string) => {
    const res = await Swal.fire({ title: 'Hapus?', text: "Hapus satu catatan pembayaran ini?", icon: 'warning', showCancelButton: true })
    if (res.isConfirmed) {
      await getSupabase().from("transaksi_pembayaran_v2").delete().eq("id", id)
      loadAllData()
    }
  }

  const cetakKwitansiPDF = async (s: any) => {
    setPrintingId(s.id);
    try {
      const doc = new jsPDF('p', 'mm', [105, 148]); // A6
      const pageWidth = doc.internal.pageSize.getWidth();
      const centerX = pageWidth / 2;

      const categories = ["dapur", "pesantren", "sekolah"];
      const detailBayar = categories.map(cat => {
        const target = getTargetDinamis(s, cat);
        const terbayar = pembayaranList
          .filter(p => p.santri_id === s.id && p.kategori === cat)
          .reduce((a, b) => a + b.jumlah_bayar, 0);
        return {
          nama: cat === 'dapur' ? 'Syahriah Dapur' : cat === 'pesantren' ? 'Syahriah Pesantren' : 'Syahriah Sekolah',
          terbayar,
          sisa: Math.max(0, target - terbayar),
          isLunas: terbayar >= target || target === 0
        };
      });

      const totalTerbayar = detailBayar.reduce((a, b) => a + b.terbayar, 0);
      const totalSisa = detailBayar.reduce((a, b) => a + b.sisa, 0);
      const qrText = `VAL-AMAL: ${s.nama_lengkap} | Rp ${totalTerbayar.toLocaleString()} | ${BULAN_NAMES[filterBulan-1]} ${filterTahun}`;
      const qrDataUrl = await QRCode.toDataURL(qrText);

      // HEADER TEKS RAPI DI TENGAH
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("PONPES AL-HIDAYAH CISADAP", centerX, 13, { align: "center" });
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Jl. Cisadap No. 01, Kec. Ciamis, Kab. Ciamis, Jawa Barat", centerX, 18, { align: "center" });

      // Garis Pembatas Hitam Tebal (Simetris 10mm dari kiri & kanan)
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.8);
      doc.line(10, 22, pageWidth - 10, 22);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("KWITANSI PEMBAYARAN", centerX, 32, { align: "center" });

      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(`NO. REF: TRX-${Date.now().toString().slice(-6)}`, 10, 42);
      doc.setFontSize(9);
      doc.text(`NAMA: ${s.nama_lengkap.toUpperCase()}`, 10, 48);
      doc.setFontSize(8);
      doc.text(`KELAS: ${s.jenjang} - ${s.kelas}`, 10, 53);

      autoTable(doc, {
        startY: 58,
        head: [['Keterangan Iuran', 'Bayar', 'Status']],
        body: detailBayar.filter(d => d.terbayar > 0 || d.sisa > 0).map(d => [
          d.nama,
          `Rp ${d.terbayar.toLocaleString()}`,
          d.isLunas ? 'LUNAS' : `SISA: Rp ${d.sisa.toLocaleString()}`
        ]),
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 3 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' } },
        margin: { left: 10, right: 10 }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.addImage(qrDataUrl, 'PNG', 10, finalY, 22, 22);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("BMT ADZKIA", 21, finalY + 28, { align: "center" });
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      doc.text("Jazakumullahu khairan katsiron", 21, finalY + 34, { align: "center" });

      if (totalSisa <= 0) {
        doc.setTextColor(16, 185, 129);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("LUNAS", pageWidth - 10, finalY + 5, { align: 'right' });
      } else {
        doc.setTextColor(239, 68, 68);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("BELUM LUNAS", pageWidth - 10, finalY + 5, { align: 'right' });
      }

      doc.setFillColor(248, 250, 252);
      doc.rect(pageWidth - 55, finalY + 18, 45, 15, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL BAYAR:", pageWidth - 52, finalY + 23);
      doc.setFontSize(10);
      doc.text(`Rp ${totalTerbayar.toLocaleString()}`, pageWidth - 13, finalY + 30, { align: "right" });

      doc.save(`Kwitansi_${s.nama_lengkap}.pdf`);
    } catch (err) {
      console.error(err);
    } finally {
      setPrintingId(null);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedSantri(null)
    setSearchSantriInModal("")
    setFormData({ bulan_bayar: filterBulan, tahun_bayar: filterTahun, nominal_dapur: "", nominal_pesantren: "", nominal_sekolah: "", keterangan: "" })
  }

  const RenderPaymentCell = ({ santri, jenis }: { santri: any, jenis: string }) => {
    const target = getTargetDinamis(santri, jenis)
    const trxInCell = pembayaranList.filter(p => p.santri_id === santri.id && p.kategori === jenis)
    const totalTerbayar = trxInCell.reduce((a, b) => a + b.jumlah_bayar, 0)
    const isLunas = target === 0 || (target > 0 && totalTerbayar >= target)
    if (target === 0 && trxInCell.length === 0) return <span className="text-slate-300">-</span>
    return (
      <div className="flex flex-col gap-1 items-center justify-center min-h-[50px] py-1">
        <div className="flex flex-wrap gap-1 justify-center">
          {trxInCell.map((t) => (
            <div key={t.id} className="group relative bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm hover:border-sky-300 transition-all">
              <span className={cn("text-[9px] font-black", isLunas ? "text-emerald-600" : "text-red-600")}>{t.jumlah_bayar.toLocaleString()}</span>
              <div className="hidden group-hover:flex absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[8px] py-1 px-2 rounded-md whitespace-nowrap z-50 shadow-xl items-center gap-2">
                <span>{new Date(t.created_at).toLocaleDateString('id-ID')}</span>
                <button onClick={() => handleDeleteTrx(t.id)} className="text-red-400 hover:text-red-200"><Trash2 size={10}/></button>
              </div>
            </div>
          ))}
        </div>
        {isLunas && target > 0 ? <span className="text-[8px] font-black text-emerald-700 uppercase bg-emerald-50 px-1.5 rounded border border-emerald-200">Lunas</span> : target > 0 && <span className="text-[7px] font-bold text-red-500 uppercase italic">Sisa: {(target - totalTerbayar).toLocaleString()}</span>}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-in fade-in duration-500">
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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-black">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-4 items-center">
          <div className="relative w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input type="text" placeholder="Cari santri..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-[11px] font-bold outline-none focus:border-sky-600 bg-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <select value={filterBulan} onChange={(e) => setFilterBulan(Number(e.target.value))} className="px-3 py-1.5 text-[10px] font-black uppercase outline-none bg-transparent cursor-pointer">{BULAN_NAMES.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}</select>
            <div className="w-px h-4 bg-slate-200"></div>
            <select value={filterTahun} onChange={(e) => setFilterTahun(Number(e.target.value))} className="px-3 py-1.5 text-[10px] font-black outline-none bg-transparent cursor-pointer">{[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}</select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[550px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse sticky-header">
            <thead className="bg-slate-900 text-white uppercase text-[9px] font-black tracking-widest sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 border-r border-slate-700">Profil Santri</th>
                <th className="px-4 py-4 text-center border-r border-slate-700">Kelas</th>
                <th className="px-4 py-4 text-center border-r border-slate-700">Syahriah Dapur</th>
                <th className="px-4 py-4 text-center border-r border-slate-700">Syahriah Pesantren</th>
                <th className="px-4 py-4 text-center border-r border-slate-700">Syahriah Sekolah</th>
                <th className="px-4 py-4 text-center border-r border-slate-700">Status</th>
                <th className="px-4 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {santriWithTransactions.length > 0 ? (
                santriWithTransactions.map(s => {
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
                        <div className="text-[9px] font-bold text-sky-600 uppercase">NIS: {s.nis || "-"}</div>
                      </td>
                      <td className="px-4 py-3 border-r border-slate-50 text-center text-[10px] font-bold text-slate-500 uppercase">{s.kelas || "-"}</td>
                      <td className="px-4 py-3 border-r border-slate-50"><RenderPaymentCell santri={s} jenis="dapur" /></td>
                      <td className="px-4 py-3 border-r border-slate-50"><RenderPaymentCell santri={s} jenis="pesantren" /></td>
                      <td className="px-4 py-3 border-r border-slate-50"><RenderPaymentCell santri={s} jenis="sekolah" /></td>
                      <td className="px-4 py-3 border-r border-slate-50 text-center">
                        {isFullyLunas ? (
                          <div className="flex flex-col items-center gap-1">
                            <CheckCircle2 className="text-emerald-500" size={18} />
                            <span className="text-[8px] font-black text-emerald-600 uppercase">Lengkap</span>
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
                          <button 
                            disabled={printingId === s.id}
                            onClick={() => cetakKwitansiPDF(s)} 
                            className={cn("p-2 rounded-lg transition-all", printingId === s.id ? "text-slate-400" : "text-sky-600 hover:bg-sky-50")}
                          >
                            {printingId === s.id ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                          </button>
                          <button onClick={() => {
                            Swal.fire({
                              title: 'Hapus Semua?',
                              text: `Hapus seluruh transaksi ${s.nama_lengkap} di bulan ini?`,
                              icon: 'warning',
                              showCancelButton: true,
                              confirmButtonColor: '#ef4444'
                            }).then(res => {
                              if (res.isConfirmed) {
                                getSupabase().from("transaksi_pembayaran_v2").delete().eq("santri_id", s.id).eq("bulan", filterBulan).eq("tahun", filterTahun).then(() => loadAllData())
                              }
                            })
                          }} className="text-slate-300 hover:text-red-600 p-2"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <Inbox className="w-10 h-10 text-slate-200 mx-auto" />
                    <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest italic">Belum ada transaksi</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 text-black">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="bg-sky-900 p-4 text-white flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest">Input Pembayaran</h3>
              <button onClick={closeModal} className="hover:bg-white/20 p-1 rounded-lg transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={handleSimpanBayar} className="p-6 space-y-4">
              <div className="space-y-1 relative">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nama Santri</label>
                {selectedSantri ? (
                  <div className="flex items-center justify-between bg-sky-50 border border-sky-200 p-3 rounded-xl shadow-inner">
                    <div>
                      <div className="text-[10px] font-black uppercase text-slate-800">{selectedSantri.nama_lengkap}</div>
                      <div className="text-[9px] font-bold text-sky-600 uppercase tracking-tighter">{selectedSantri.jenjang} - {selectedSantri.kelas}</div>
                    </div>
                    <button type="button" onClick={() => setSelectedSantri(null)} className="text-red-500 text-[10px] font-black hover:bg-red-50 px-2 py-1 rounded-lg transition-all">GANTI</button>
                  </div>
                ) : (
                  <>
                    <input autoFocus type="text" placeholder="Cari santri..." className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:border-sky-600 bg-slate-50 shadow-inner" value={searchSantriInModal} onChange={(e) => setSearchSantriInModal(e.target.value)} />
                    {filteredSantriForModal.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 shadow-2xl rounded-xl z-50 overflow-hidden mt-1">
                        {filteredSantriForModal.map(s => (
                          <div key={s.id} onClick={() => {setSelectedSantri(s); setSearchSantriInModal("")}} className="px-4 py-2.5 hover:bg-sky-50 cursor-pointer border-b border-slate-50 flex items-center justify-between last:border-0">
                            <div className="text-[10px] font-black uppercase text-slate-800">{s.nama_lengkap}</div>
                            <Plus size={12} className="text-sky-500" />
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Bulan</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[10px] font-black outline-none bg-slate-50" value={formData.bulan_bayar} onChange={(e) => setFormData({...formData, bulan_bayar: Number(e.target.value)})}>
                    {BULAN_NAMES.map((b, i) => <option key={i} value={i+1}>{b}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Tahun</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[10px] font-black outline-none bg-slate-50" value={formData.tahun_bayar} onChange={(e) => setFormData({...formData, tahun_bayar: Number(e.target.value)})}>
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 shadow-inner">
                <div className="space-y-1 text-center">
                  <label className="text-[8px] font-black text-slate-400 uppercase">Dapur</label>
                  <input type="number" disabled={selectedSantri?.jenjang?.trim().toLowerCase() === 'pengabdian'} className="w-full px-2 py-2 border border-slate-200 rounded-lg text-[10px] font-black text-center disabled:bg-slate-200/50" placeholder="0" value={formData.nominal_dapur} onChange={(e) => setFormData({...formData, nominal_dapur: e.target.value})} />
                </div>
                <div className="space-y-1 text-center">
                  <label className="text-[8px] font-black text-slate-400 uppercase">Pesantren</label>
                  <input type="number" className="w-full px-2 py-2 border border-slate-200 rounded-lg text-[10px] font-black text-center" placeholder="0" value={formData.nominal_pesantren} onChange={(e) => setFormData({...formData, nominal_pesantren: e.target.value})} />
                </div>
                <div className="space-y-1 text-center">
                  <label className="text-[8px] font-black text-slate-400 uppercase">Sekolah</label>
                  <input type="number" disabled={['takhosus', 'kuliah', 'pengabdian'].includes(selectedSantri?.jenjang?.trim().toLowerCase())} className="w-full px-2 py-2 border border-slate-200 rounded-lg text-[10px] font-black text-center disabled:bg-slate-200/50" placeholder="0" value={formData.nominal_sekolah} onChange={(e) => setFormData({...formData, nominal_sekolah: e.target.value})} />
                </div>
              </div>
              <button disabled={isSubmitting} type="submit" className="w-full bg-sky-900 text-white font-black py-4 rounded-xl text-[10px] uppercase shadow-lg border-b-4 border-sky-950 flex justify-center items-center gap-2">
                {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Simpan Transaksi
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}