"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { 
  TrendingUp, TrendingDown, Plus, Search, 
  Trash2, Calendar, Loader2, X, Save, Wallet,
  Inbox, Receipt, FileText
} from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable" 
import { getSupabase } from "@/lib/supabase"
import Swal from "sweetalert2"
import { cn } from "@/lib/utils"

// 1. KONSTANTA
const BULAN_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

export default function LaporanKeuanganPage() {
  // 2. STATE MANAGEMENT
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [transaksiList, setTransaksiList] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterBulan, setFilterBulan] = useState(new Date().getMonth() + 1)
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear())

  const [formData, setFormData] = useState({
    jenis: "pemasukan",
    nominal: "",
    keterangan: "",
    tanggal: new Date().toISOString().split("T")[0]
  })

  // 3. DATA FETCHING
  const loadTransaksi = useCallback(async () => {
    setLoading(true)
    const { data } = await getSupabase()
      .from("keuangan_operasional")
      .select("*")
      .order("tanggal", { ascending: false })
    
    setTransaksiList(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { 
    loadTransaksi() 
  }, [loadTransaksi])

  // 4. LOGIC (Filtering & Stats)
  const filteredData = useMemo(() => {
    return transaksiList.filter(t => {
      const tgl = new Date(t.tanggal)
      const matchWaktu = (tgl.getMonth() + 1 === filterBulan) && (tgl.getFullYear() === filterTahun)
      const matchSearch = t.keterangan.toLowerCase().includes(searchTerm.toLowerCase())
      return matchWaktu && matchSearch
    })
  }, [transaksiList, searchTerm, filterBulan, filterTahun])

  const stats = useMemo(() => {
    const masuk = filteredData
      .filter(t => t.jenis === "pemasukan")
      .reduce((a, b) => a + Number(b.nominal), 0)
    
    const keluar = filteredData
      .filter(t => t.jenis === "pengeluaran")
      .reduce((a, b) => a + Number(b.nominal), 0)

    return { masuk, keluar, saldo: masuk - keluar }
  }, [filteredData])

  // 5. HANDLERS
  const handleSimpan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nominal || Number(formData.nominal) <= 0) return
    
    setIsSubmitting(true)
    try {
      const { error } = await getSupabase()
        .from("keuangan_operasional")
        .insert([{
          jenis: formData.jenis,
          nominal: Number(formData.nominal),
          keterangan: formData.keterangan.toUpperCase(),
          tanggal: formData.tanggal
        }])

      if (error) throw error

      Swal.fire({ icon: 'success', title: 'Tersimpan', timer: 1000, showConfirmButton: false })
      setIsModalOpen(false)
      setFormData({ ...formData, nominal: "", keterangan: "", tanggal: new Date().toISOString().split("T")[0] })
      loadTransaksi()
    } catch (err: any) {
      Swal.fire("Gagal", err.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleHapus = async (id: string) => {
    const res = await Swal.fire({
      title: 'Hapus Transaksi?',
      text: "Data yang dihapus tidak dapat dikembalikan.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Hapus'
    })

    if (res.isConfirmed) {
      await getSupabase().from("keuangan_operasional").delete().eq("id", id)
      loadTransaksi()
    }
  }

  const cetakMutasiPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PONDOK PESANTREN AL-HIDAYAH CISADAP", pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Jl. Cisadap No. 01, Kec. Ciamis, Kab. Ciamis, Jawa Barat", pageWidth / 2, 21, { align: "center" });
    doc.setLineWidth(0.5);
    doc.line(15, 25, pageWidth - 15, 25);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("LAPORAN MUTASI KAS OPERASIONAL", pageWidth / 2, 35, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Periode: ${BULAN_NAMES[filterBulan - 1]} ${filterTahun}`, pageWidth / 2, 41, { align: "center" });

    const tableData = filteredData.map((t, index) => [
      index + 1,
      new Date(t.tanggal).toLocaleDateString('id-ID'),
      t.keterangan.toUpperCase(),
      t.jenis === 'pemasukan' ? `Rp ${t.nominal.toLocaleString()}` : '-',
      t.jenis === 'pengeluaran' ? `Rp ${t.nominal.toLocaleString()}` : '-',
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['NO', 'TANGGAL', 'KETERANGAN', 'DEBIT (MASUK)', 'KREDIT (KELUAR)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], halign: 'center' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 30 },
        3: { halign: 'right' },
        4: { halign: 'right' },
      },
      styles: { fontSize: 9 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text(`Total Pemasukan: Rp ${stats.masuk.toLocaleString()}`, 130, finalY);
    doc.text(`Total Pengeluaran: Rp ${stats.keluar.toLocaleString()}`, 130, finalY + 5);
    doc.setFont("helvetica", "bold");
    doc.text(`Saldo Akhir: Rp ${stats.saldo.toLocaleString()}`, 130, finalY + 12);

    doc.save(`Mutasi_Keuangan_${BULAN_NAMES[filterBulan - 1]}_${filterTahun}.pdf`);
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-in fade-in duration-500">
      
      {/* 1. Header Card */}
      <div className="flex flex-wrap justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-sky-50 p-3 rounded-2xl text-sky-600 border border-sky-100 shadow-inner">
            <Receipt size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Laporan Keuangan</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
              <Calendar size={12} className="text-sky-500" /> Operasional & Kas Umum
            </p>
          </div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-yellow-400 hover:bg-yellow-500 text-sky-900 font-black px-6 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-[10px] uppercase transition-all active:scale-95 border-b-4 border-yellow-600">
          <Plus size={16} strokeWidth={3} /> Input Transaksi
        </button>
      </div>

      {/* 2. Statistik Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Pemasukan" value={stats.masuk} icon={<TrendingUp size={24}/>} type="emerald" />
        <StatCard title="Pengeluaran" value={stats.keluar} icon={<TrendingDown size={24}/>} type="red" />
        <div className="bg-slate-900 p-5 rounded-2xl shadow-xl flex items-center gap-4 border-b-4 border-slate-950">
          <div className="bg-slate-800 p-3 rounded-xl text-sky-400"><Wallet size={24} /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Saldo Kas Aktif</p>
            <p className="text-xl font-black text-white leading-none mt-2">Rp {stats.saldo.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* 3. Table & Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Cari keterangan..." 
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-sky-600 transition-all bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
              <select value={filterBulan} onChange={(e) => setFilterBulan(Number(e.target.value))} className="px-3 py-1 text-[10px] font-black uppercase outline-none cursor-pointer bg-transparent">
                {BULAN_NAMES.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
              </select>
              <div className="w-px h-4 bg-slate-200"></div>
              <select value={filterTahun} onChange={(e) => setFilterTahun(Number(e.target.value))} className="px-3 py-1 text-[10px] font-black outline-none cursor-pointer bg-transparent">
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <button onClick={cetakMutasiPDF} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-black px-5 py-2.5 rounded-xl shadow-sm flex items-center gap-2 text-[10px] uppercase transition-all active:scale-95">
            <FileText size={16} className="text-red-500" /> Cetak Mutasi PDF
          </button>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900 text-white uppercase text-[9px] font-black tracking-widest sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 border-r border-slate-800">Tanggal</th>
                <th className="px-6 py-4 border-r border-slate-800">Keterangan</th>
                <th className="px-6 py-4 text-right border-r border-slate-800">Nominal</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="py-24 text-center"><Loader2 className="animate-spin mx-auto text-sky-600" /></td></tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((t) => (
                  <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 border-r border-slate-50">
                      <span className="text-[10px] font-black text-slate-500 uppercase">
                        {new Date(t.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-6 py-4 border-r border-slate-50">
                      <div className="font-black text-xs uppercase text-slate-800">{t.keterangan}</div>
                      <div className={cn("mt-1.5 inline-block text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-tighter", t.jenis === 'pemasukan' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                        {t.jenis}
                      </div>
                    </td>
                    <td className={cn("px-6 py-4 text-right font-black text-sm border-r border-slate-50", t.jenis === 'pemasukan' ? "text-emerald-600 bg-emerald-50/20" : "text-red-600 bg-red-50/20")}>
                      {t.jenis === 'pemasukan' ? '+' : '-'} {t.nominal.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleHapus(t.id)} className="p-2 text-slate-300 hover:text-red-600 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-24 text-center">
                    <Inbox className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Belum ada data pada periode ini</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Modal Input */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest">Catatan Kas Operasional</h3>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1.5 rounded-lg transition-all"><X size={18} /></button>
            </div>
            <form onSubmit={handleSimpan} className="p-8 space-y-6">
              <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner">
                <button type="button" onClick={() => setFormData({...formData, jenis: 'pemasukan'})} className={cn("flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all", formData.jenis === 'pemasukan' ? "bg-white text-emerald-600 shadow-md" : "text-slate-400")}>Pemasukan</button>
                <button type="button" onClick={() => setFormData({...formData, jenis: 'pengeluaran'})} className={cn("flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all", formData.jenis === 'pengeluaran' ? "bg-white text-red-600 shadow-md" : "text-slate-400")}>Pengeluaran</button>
              </div>
              
              <div className="space-y-4">
                <InputGroup label="Tanggal Transaksi" type="date" value={formData.tanggal} onChange={(v: any) => setFormData({...formData, tanggal: v})} />
                <InputGroup label="Nominal (IDR)" type="number" value={formData.nominal} onChange={(v: any) => setFormData({...formData, nominal: v})} />
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Keterangan / Deskripsi</label>
                  <textarea required className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-[11px] font-bold outline-none focus:border-slate-900 min-h-[100px] bg-slate-50 uppercase shadow-inner" value={formData.keterangan} onChange={(e) => setFormData({...formData, keterangan: e.target.value})} />
                </div>
              </div>

              <button disabled={isSubmitting} type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl text-[10px] uppercase shadow-xl flex justify-center items-center gap-2 border-b-4 border-slate-950 transition-all active:scale-95 disabled:opacity-50">
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Simpan ke Buku Kas
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// 6. SUB-COMPONENTS
function StatCard({ title, value, icon, type }: any) {
  const isEmerald = type === "emerald";
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all hover:border-sky-200">
      <div className={cn("p-3 rounded-xl", isEmerald ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{title}</p>
        <p className="text-xl font-black text-slate-900 leading-none mt-2">Rp {value.toLocaleString()}</p>
      </div>
    </div>
  )
}

function InputGroup({ label, type, value, onChange }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">{label}</label>
      <input 
        type={type} 
        required 
        className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-xs font-black outline-none bg-slate-50 focus:bg-white focus:border-slate-900 transition-all shadow-inner" 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
      />
    </div>
  )
}