"use client"

import { useState, useEffect } from "react"
import { Settings, Save, Coins, Loader2, LayoutGrid, AlertCircle } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import Swal from "sweetalert2"

export default function PengaturanTarif() {
  const [isLoading, setIsLoading] = useState(false)
  const [tarifData, setTarifData] = useState<any[]>([])

  const getVal = (komponen: string) => tarifData.find(t => t.komponen === komponen)?.nominal || 0

  const setVal = (komponen: string, nominal: number) => {
    setTarifData(prev => {
      const existing = prev.find(t => t.komponen === komponen)
      if (existing) {
        return prev.map(t => t.komponen === komponen ? { ...t, nominal } : t)
      }
      return [...prev, { komponen, nominal, angkatan: 2026 }]
    })
  }

  const loadTarifData = async () => {
    setIsLoading(true)
    const { data } = await getSupabase().from("tarif").select("*").eq("angkatan", 2026)
    if (data) setTarifData(data)
    setIsLoading(false)
  }

  useEffect(() => { loadTarifData() }, [])

 const handleSave = async () => {
  setIsLoading(true);

  // KUNCI UTAMA: Kita buat array baru (payload) tanpa menyertakan 'id'
  // Kita hanya ambil komponen, nominal, dan angkatan saja.
  const payload = tarifData.map((item: any) => ({
    komponen: item.komponen,
    nominal: Number(item.nominal),
    angkatan: 2026 
  }));

  try {
    const { error } = await getSupabase()
      .from("tarif")
      .upsert(payload, { 
        // Ini akan mencari data yang komponen & angkatannya sama untuk di-update
        onConflict: 'komponen,angkatan' 
      });

    if (error) throw error;

    Swal.fire({ 
      icon: 'success', 
      title: 'Tarif Berhasil Disimpan', 
      text: 'Data telah disinkronkan dengan database.',
      timer: 1500, 
      showConfirmButton: false 
    });
    
    // Refresh data agar tampilan terbaru muncul
    loadTarifData(); 
  } catch (err: any) {
    Swal.fire("Gagal Menyimpan", err.message, "error");
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="bg-white border border-slate-200 rounded-xl max-w-7xl mx-auto overflow-hidden shadow-sm text-black font-sans">
      <div className="bg-sky-900 p-5 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-800 rounded-lg"><Settings size={20} className="text-yellow-400" /></div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest leading-none">Parameter Biaya Spesifik</h2>
            <p className="text-[10px] text-sky-300 font-bold uppercase mt-1">Pengaturan Tarif per Kategori Santri</p>
          </div>
        </div>
      </div>

      <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* SECTION 1: MTS GROUPS */}
        <SectionHeader title="Kelompok MTS PLUS" iconColor="text-sky-600" />
        
        <CardTarif title="MTS PLUS (Lama)">
          <InputTarif label="Dapur" value={getVal("dapur_mts")} onChange={(v:any) => setVal("dapur_mts", v)} />
          <InputTarif label="Pesantren" value={getVal("pesantren_mts")} onChange={(v:any) => setVal("pesantren_mts", v)} />
          <InputTarif label="Sekolah" value={getVal("sekolah_mts")} onChange={(v:any) => setVal("sekolah_mts", v)} />
        </CardTarif>

        <CardTarif title="MTS PLUS REVISI">
          <InputTarif label="Dapur" value={getVal("dapur_mts_revisi")} onChange={(v:any) => setVal("dapur_mts_revisi", v)} />
          <InputTarif label="Pesantren" value={getVal("pesantren_mts_revisi")} onChange={(v:any) => setVal("pesantren_mts_revisi", v)} />
          <InputTarif label="Sekolah" value={getVal("sekolah_mts_revisi")} onChange={(v:any) => setVal("sekolah_mts_revisi", v)} />
        </CardTarif>

        <div className="lg:col-span-2 hidden lg:block"></div> {/* Spacer */}

        {/* SECTION 2: MA GROUPS */}
        <SectionHeader title="Kelompok MA PLUS" iconColor="text-orange-600" />

        <CardTarif title="MA PLUS (Lama)">
          <InputTarif label="Dapur" value={getVal("dapur_ma")} onChange={(v:any) => setVal("dapur_ma", v)} />
          <InputTarif label="Pesantren" value={getVal("pesantren_ma")} onChange={(v:any) => setVal("pesantren_ma", v)} />
          <InputTarif label="Sekolah" value={getVal("sekolah_ma")} onChange={(v:any) => setVal("sekolah_ma", v)} />
        </CardTarif>

        <CardTarif title="MA PLUS REVISI">
          <InputTarif label="Dapur" value={getVal("dapur_ma_revisi")} onChange={(v:any) => setVal("dapur_ma_revisi", v)} />
          <InputTarif label="Pesantren" value={getVal("pesantren_ma_revisi")} onChange={(v:any) => setVal("pesantren_ma_revisi", v)} />
          <InputTarif label="Sekolah" value={getVal("sekolah_ma_revisi")} onChange={(v:any) => setVal("sekolah_ma_revisi", v)} />
        </CardTarif>

        <div className="lg:col-span-2 hidden lg:block"></div> {/* Spacer */}

        {/* SECTION 3: KHUSUS & MANDIRI */}
        <SectionHeader title="Kategori Khusus & Mandiri" iconColor="text-emerald-600" />

        <CardTarif title="TAKHOSUS / KULIAH">
          <InputTarif label="Dapur" value={getVal("dapur_takhosus")} onChange={(v:any) => setVal("dapur_takhosus", v)} />
          <InputTarif label="Pesantren" value={getVal("pesantren_takhosus")} onChange={(v:any) => setVal("pesantren_takhosus", v)} />
        </CardTarif>

        <CardTarif title="PENGABDIAN">
          <InputTarif label="Pesantren" value={getVal("pesantren_pengabdian")} onChange={(v:any) => setVal("pesantren_pengabdian", v)} />
        </CardTarif>

        <CardTarif title="KATEGORI LUAR">
          <InputTarif label="MTS SAJA" value={getVal("MTS SAJA")} onChange={(v:any) => setVal("MTS SAJA", v)} />
          <InputTarif label="MA SAJA" value={getVal("MA SAJA")} onChange={(v:any) => setVal("MA SAJA", v)} />
          <InputTarif label="NON MUKIM" value={getVal("SANTRI NON MUKIM")} onChange={(v:any) => setVal("SANTRI NON MUKIM", v)} />
        </CardTarif>

      </div>
      
      <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
        <div className="flex items-center gap-2 text-slate-400">
          <Coins size={16} />
          <span className="text-[10px] font-bold uppercase text-slate-500">Mata Uang: Rupiah (IDR)</span>
        </div>
        <button 
          onClick={handleSave}
          className="bg-sky-900 hover:bg-black text-white font-black py-3 px-8 rounded-xl shadow-lg text-[10px] uppercase transition-all flex items-center gap-2"
        >
          <Save size={14} /> Simpan Perubahan Tarif
        </button>
      </div>
    </div>
  )
}

function SectionHeader({ title, iconColor }: { title: string, iconColor: string }) {
  return (
    <div className="md:col-span-2 lg:col-span-4 flex items-center gap-2 border-b border-slate-100 pb-2 mt-4">
      <LayoutGrid size={16} className={iconColor} />
      <h3 className={`text-[11px] font-black uppercase ${iconColor.replace('text', 'text-slate-800')}`}>{title}</h3>
    </div>
  )
}

function CardTarif({ title, children }: any) {
  return (
    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3">
      <h4 className="text-[9px] font-black text-sky-900 uppercase tracking-widest border-b border-slate-200 pb-1.5">{title}</h4>
      {children}
    </div>
  )
}

function InputTarif({ label, value, onChange }: any) {
  return (
    <div className="group">
      <label className="text-[8px] font-black text-slate-400 uppercase ml-1 group-focus-within:text-sky-600 transition-colors">{label}</label>
      <div className="relative mt-1 flex shadow-sm">
        <span className="px-2 rounded-l-lg border border-r-0 border-slate-200 bg-white text-slate-400 text-[9px] flex items-center font-black">Rp</span>
        <input 
          type="number" 
          className="w-full px-2 py-1.5 border border-slate-200 rounded-r-lg text-[11px] font-black text-slate-800 focus:border-sky-600 outline-none transition-all" 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
        />
      </div>
    </div>
  )
}