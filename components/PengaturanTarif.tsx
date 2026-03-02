"use client"

import { useState, useEffect } from "react"
import { Settings, Save, Coins, Loader2 } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import Swal from "sweetalert2"

export default function PengaturanTarif() {
  const [activeMode, setActiveMode] = useState<"2025" | "2026" | "khusus">("2026")
  const [isLoading, setIsLoading] = useState(false)
  
  // State Utama sesuai struktur tabel 'tarif'
  const [tarifMts, setTarifMts] = useState({ dapur: 0, pesantren: 0, sekolah: 0 })
  const [tarifMa, setTarifMa] = useState({ dapur: 0, pesantren: 0, sekolah: 0 })
  const [tarifTakhosus, setTarifTakhosus] = useState({ dapur: 0, pesantren: 0 })
  const [tarifPengabdian, setTarifPengabdian] = useState({ pesantren: 0 })

  const loadTarifData = async () => {
    setIsLoading(true)
    const supabase = getSupabase()
    
    // Kita ambil semua data tarif agar mudah dipetakan
    const { data, error } = await supabase.from("tarif").select("*")

    if (data) {
      // Fungsi pembantu untuk mencari nominal
      const getVal = (komponen: string, angkatan: number) => 
        data.find(t => t.komponen === komponen && t.angkatan === angkatan)?.nominal || 0

      // Map data ke state (Tahun 2025 & 2026)
      const thn = activeMode === "khusus" ? 2025 : parseInt(activeMode)
      
      setTarifMts({
        dapur: getVal("dapur", thn),
        pesantren: getVal("pesantren", thn),
        sekolah: getVal(`sekolah_mts`, thn)
      })
      setTarifMa({
        dapur: getVal("dapur", thn),
        pesantren: getVal("pesantren", thn),
        sekolah: getVal(`sekolah_ma`, thn)
      })
      setTarifTakhosus({
        dapur: getVal("dapur_takhosus", 2025),
        pesantren: getVal("pesantren_takhosus", 2025)
      })
      setTarifPengabdian({
        pesantren: getVal("pesantren_pengabdian", 2025)
      })
    }
    setIsLoading(false)
  }

  useEffect(() => { loadTarifData() }, [activeMode])

  const handleSave = async () => {
    setIsLoading(true)
    const supabase = getSupabase()
    const thn = activeMode === "khusus" ? 2025 : parseInt(activeMode)
    
    // Siapkan data payload sesuai mode aktif
    let payload: any[] = []
    
    if (activeMode !== "khusus") {
      payload = [
        { komponen: 'dapur', angkatan: thn, nominal: Number(tarifMts.dapur) },
        { komponen: 'pesantren', angkatan: thn, nominal: Number(tarifMts.pesantren) },
        { komponen: 'sekolah_mts', angkatan: thn, nominal: Number(tarifMts.sekolah) },
        { komponen: 'sekolah_ma', angkatan: thn, nominal: Number(tarifMa.sekolah) },
      ]
    } else {
      payload = [
        { komponen: 'dapur_takhosus', angkatan: 2025, nominal: Number(tarifTakhosus.dapur) },
        { komponen: 'pesantren_takhosus', angkatan: 2025, nominal: Number(tarifTakhosus.pesantren) },
        { komponen: 'pesantren_pengabdian', angkatan: 2025, nominal: Number(tarifPengabdian.pesantren) },
      ]
    }

    try {
      // Gunakan upsert: Jika komponen + angkatan sudah ada, update. Jika belum, insert.
      // Pastikan di Supabase kolom 'komponen' dan 'angkatan' dijadikan UNIQUE constraint gabungan.
      const { error } = await supabase.from("tarif").upsert(payload, { onConflict: 'komponen,angkatan' })
      
      if (error) throw error
      
      Swal.fire({ icon: 'success', title: 'Tarif Berhasil Diperbarui', timer: 1500, showConfirmButton: false })
      loadTarifData()
    } catch (err: any) {
      Swal.fire("Gagal Menyimpan", err.message, "error")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl max-w-4xl mx-auto overflow-hidden shadow-sm text-black font-sans">
      <div className="bg-sky-900 p-5 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-800 rounded-lg">
            <Settings size={20} className="text-yellow-400" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest">Parameter Biaya</h2>
            <p className="text-[10px] text-sky-300 font-bold uppercase">Manajemen Tarif Syahriah</p>
          </div>
        </div>
        
        <div className="flex bg-sky-950/50 rounded-xl p-1 border border-sky-700">
          {(["2025", "2026", "khusus"] as const).map((mode) => (
            <button 
              key={mode}
              onClick={() => setActiveMode(mode)} 
              className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${activeMode === mode ? 'bg-yellow-400 text-sky-900 shadow-sm' : 'text-sky-200 hover:text-white'}`}
            >
              {mode === 'khusus' ? 'KHUSUS' : `ANGK. ${mode}`}
            </button>
          ))}
        </div>
      </div>

      <div className="p-8">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-sky-600" size={32} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinkronisasi Data...</p>
          </div>
        ) : activeMode === "khusus" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="space-y-5">
              <div className="border-b-2 border-sky-900 pb-2 flex justify-between items-center">
                <h3 className="text-[11px] font-black text-sky-900 uppercase tracking-tighter">Takhosus / Kuliah (2025)</h3>
                <span className="text-[10px] font-black text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                  Total: Rp {(Number(tarifTakhosus.dapur) + Number(tarifTakhosus.pesantren)).toLocaleString()}
                </span>
              </div>
              <InputTarif label="Uang Makan Takhosus" value={tarifTakhosus.dapur} onChange={(v:any) => setTarifTakhosus({...tarifTakhosus, dapur: v})} />
              <InputTarif label="Syahriah Pesantren" value={tarifTakhosus.pesantren} onChange={(v:any) => setTarifTakhosus({...tarifTakhosus, pesantren: v})} />
            </div>

            <div className="space-y-5">
              <div className="border-b-2 border-emerald-600 pb-2 flex justify-between items-center">
                <h3 className="text-[11px] font-black text-emerald-900 uppercase tracking-tighter">Pengabdian (2025)</h3>
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  Total: Rp {Number(tarifPengabdian.pesantren).toLocaleString()}
                </span>
              </div>
              <InputTarif label="Administrasi Pesantren" value={tarifPengabdian.pesantren} onChange={(v:any) => setTarifPengabdian({...tarifPengabdian, pesantren: v})} />
              <p className="text-[9px] text-slate-400 italic leading-relaxed">Note: Santri pengabdian tidak dibebankan iuran dapur dan sekolah.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="space-y-5">
              <div className="border-b-2 border-sky-900 pb-2 flex justify-between items-center">
                <h3 className="text-[11px] font-black text-sky-900 uppercase tracking-tighter">Tarif Reguler MTS</h3>
                <span className="text-[12px] font-black text-slate-900">Rp {(Number(tarifMts.dapur) + Number(tarifMts.pesantren) + Number(tarifMts.sekolah)).toLocaleString()}</span>
              </div>
              <InputTarif label="Uang Makan (Dapur)" value={tarifMts.dapur} onChange={(v:any) => setTarifMts({...tarifMts, dapur: v})} />
              <InputTarif label="Syahriah Pesantren" value={tarifMts.pesantren} onChange={(v:any) => setTarifMts({...tarifMts, pesantren: v})} />
              <InputTarif label="Iuran Sekolah (MTS)" value={tarifMts.sekolah} onChange={(v:any) => setTarifMts({...tarifMts, sekolah: v})} />
            </div>

            <div className="space-y-5">
              <div className="border-b-2 border-yellow-500 pb-2 flex justify-between items-center">
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-tighter">Tarif Reguler MA</h3>
                <span className="text-[12px] font-black text-slate-900">Rp {(Number(tarifMa.dapur) + Number(tarifMa.pesantren) + Number(tarifMa.sekolah)).toLocaleString()}</span>
              </div>
              <InputTarif label="Uang Makan (Dapur)" value={tarifMa.dapur} onChange={(v:any) => {
                setTarifMa({...tarifMa, dapur: v})
                setTarifMts({...tarifMts, dapur: v}) // Dapur biasanya sama per angkatan
              }} />
              <InputTarif label="Syahriah Pesantren" value={tarifMa.pesantren} onChange={(v:any) => {
                setTarifMa({...tarifMa, pesantren: v})
                setTarifMts({...tarifMts, pesantren: v}) // Pesantren biasanya sama per angkatan
              }} />
              <InputTarif label="Iuran Sekolah (MA)" value={tarifMa.sekolah} onChange={(v:any) => setTarifMa({...tarifMa, sekolah: v})} />
            </div>
          </div>
        )}
      </div>
      
      <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
        <div className="flex items-center gap-2 text-slate-400">
          <Coins size={16} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Mata Uang: IDR (Rupiah)</span>
        </div>
        <button 
          disabled={isLoading}
          onClick={handleSave}
          className="bg-sky-900 hover:bg-black text-white font-black py-3 px-10 rounded-xl shadow-lg text-[11px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="animate-spin" size={14}/> : <Save size={14} />} 
          Simpan Data {activeMode.toUpperCase()}
        </button>
      </div>
    </div>
  )
}

function InputTarif({ label, value, onChange }: any) {
  return (
    <div className="group">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-tight ml-1 group-focus-within:text-sky-600 transition-colors">{label}</label>
      <div className="relative mt-1 flex shadow-sm">
        <span className="px-4 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-slate-400 text-[11px] flex items-center font-black">Rp</span>
        <input 
          type="number" 
          className="w-full px-4 py-2.5 border border-slate-200 rounded-r-xl text-sm font-black text-slate-800 focus:border-sky-600 focus:ring-4 focus:ring-sky-50 outline-none transition-all" 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
        />
      </div>
    </div>
  )
}