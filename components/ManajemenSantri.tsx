"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { 
  Plus, Pencil, Trash2, Search, Users, 
  Utensils, Phone, UserCircle, MapPin, 
  Loader2, Save, X, Banknote, CalendarCheck
} from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import Swal from "sweetalert2"
import { cn } from "@/lib/utils"

const DAFTAR_DAPUR = ["Dapur Umi", "Dapur Qais", "Dapur Hamka"]
const KATEGORI_NON_MUKIM = ["MTS SAJA", "MA SAJA", "SANTRI NON MUKIM", "PENGABDIAN"]

export default function ManajemenSantri({ onUpdate }: { onUpdate: () => void }) {
  const [listTarifDB, setListTarifDB] = useState<any[]>([])
  const [mounted, setMounted] = useState(false)
  const [santriList, setSantriList] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [editingSantri, setEditingSantri] = useState<any | null>(null)

  const [formData, setFormData] = useState({
    nama_lengkap: "",
    nis: "",
    jenis_kelamin: "L",
    alamat: "",
    jenjang: "MTS PLUS", 
    nama_wali: "",
    hp_wali: "",
    kelas: "",
    id_dapur: "",
    status_aktif: true,
    tanggal_masuk: new Date().toISOString().split("T")[0],
    mulai_bulan_ini: false, 
  })

  const [previewTarif, setPreviewTarif] = useState(0)

  useEffect(() => {
    setMounted(true)
    loadSantri()
    fetchTarifSesuaiDB()
  }, [])

  const fetchTarifSesuaiDB = async () => {
    const { data } = await getSupabase().from("tarif").select("*").eq("angkatan", 2026)
    if (data) setListTarifDB(data)
  }

  useEffect(() => {
    const hitungTotal = () => {
      const k = formData.jenjang 
      let total = 0
      const getNominal = (komp: string) => listTarifDB.find(t => t.komponen === komp)?.nominal || 0

      if (k === "MTS PLUS") {
        total = getNominal("dapur_mts") + getNominal("pesantren_mts") + getNominal("sekolah_mts")
      } else if (k === "MTS PLUS REVISI") {
        total = getNominal("dapur_mts_revisi") + getNominal("pesantren_mts_revisi") + getNominal("sekolah_mts_revisi")
      } else if (k === "MA PLUS") {
        total = getNominal("dapur_ma") + getNominal("pesantren_ma") + getNominal("sekolah_ma")
      } else if (k === "MA PLUS REVISI") {
        total = getNominal("dapur_ma_revisi") + getNominal("pesantren_ma_revisi") + getNominal("sekolah_ma_revisi")
      } else if (k === "TAKHOSUS/KULIAH") {
        total = getNominal("dapur_takhosus") + getNominal("pesantren_takhosus")
      } else if (k === "PENGABDIAN") {
        total = getNominal("pesantren_pengabdian")
      } else {
        total = getNominal(k)
      }
      setPreviewTarif(total)
    }
    if (listTarifDB.length > 0) hitungTotal()
  }, [formData.jenjang, listTarifDB])

  async function loadSantri() {
    setIsLoading(true)
    const { data } = await getSupabase().from("santri").select("*").order("nama_lengkap", { ascending: true })
    setSantriList(data || [])
    setIsLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const isLuar = KATEGORI_NON_MUKIM.includes(formData.jenjang)
    const payload = {
      ...formData,
      id_dapur: isLuar ? "" : formData.id_dapur,
      nama_lengkap: formData.nama_lengkap.toUpperCase(),
      nis: formData.nis ? parseInt(formData.nis.toString()) : null,
      tanggal_mulai_tagihan: formData.mulai_bulan_ini ? new Date().toISOString().split("T")[0] : null
    }
    delete (payload as any).mulai_bulan_ini;

    try {
      if (editingSantri) {
        await getSupabase().from("santri").update(payload).eq("id", editingSantri.id)
      } else {
        await getSupabase().from("santri").insert([payload])
      }
      setIsDialogOpen(false)
      resetForm()
      loadSantri()
      onUpdate()
      Swal.fire({ icon: 'success', title: 'Data Tersimpan', showConfirmButton: false, timer: 1000 })
    } catch (error: any) {
      Swal.fire("Gagal", error.message, "error")
    }
  }

  function handleEdit(s: any) {
    setEditingSantri(s)
    setFormData({
      nama_lengkap: s.nama_lengkap,
      nis: s.nis?.toString() || "",
      jenis_kelamin: s.jenis_kelamin || "L",
      alamat: s.alamat || "",
      jenjang: s.jenjang || "MTS PLUS",
      nama_wali: s.nama_wali || "",
      hp_wali: s.hp_wali || "",
      kelas: s.kelas || "",
      id_dapur: s.id_dapur || "",
      status_aktif: s.status_aktif ?? true,
      tanggal_masuk: s.tanggal_masuk,
      mulai_bulan_ini: !!s.tanggal_mulai_tagihan, 
    })
    setIsDialogOpen(true)
  }

  function resetForm() {
    setFormData({
      nama_lengkap: "", nis: "", jenis_kelamin: "L", alamat: "", jenjang: "MTS PLUS", 
      nama_wali: "", hp_wali: "", kelas: "", id_dapur: "", status_aktif: true,
      tanggal_masuk: new Date().toISOString().split("T")[0],
      mulai_bulan_ini: false
    })
    setEditingSantri(null)
  }

  async function handleDelete(id: string, nama: string) {
  const result = await Swal.fire({
    title: 'Hapus Santri?',
    text: `Data ${nama} akan dihapus permanen dari sistem.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Ya, Hapus!',
    cancelButtonText: 'Batal'
  })

  if (result.isConfirmed) {
    try {
      const { error } = await getSupabase().from("santri").delete().eq("id", id)
      if (error) throw error
      
      Swal.fire({ icon: 'success', title: 'Terhapus', timer: 1000, showConfirmButton: false })
      loadSantri() // Refresh data
      onUpdate()   // Update stats dashboard
    } catch (error: any) {
      Swal.fire("Gagal", error.message, "error")
    }
  }
}

  const filteredSantri = useMemo(() => {
    return santriList.filter(s => 
      s.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.nis && s.nis.toString().includes(searchTerm))
    )
  }, [santriList, searchTerm])

  if (!mounted) return null

  return (
    <div className="space-y-4 text-black font-sans">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-sky-100 p-2 rounded-lg text-sky-600"><Users size={24} /></div>
          <div>
            <h2 className="text-xl font-black text-sky-900 uppercase tracking-tighter leading-none">Data Santri</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sistem Administrasi Pesantren</p>
          </div>
        </div>
        <button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-sky-800 text-white font-black px-5 py-2 rounded-lg text-[10px] uppercase transition-all active:scale-95 flex items-center gap-2 shadow-md">
          <Plus size={14} /> Registrasi Santri
        </button>
      </div>

      {/* TOOLBAR */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input type="text" placeholder="Cari Nama atau NIS..." className="w-full pl-10 pr-4 py-1.5 rounded-md border text-[11px] font-bold outline-none focus:border-sky-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-black">
  <div className="overflow-x-auto max-h-[550px] overflow-y-auto custom-scrollbar">
    <table className="w-full text-left border-collapse">
      <thead className="bg-[#1e293b] text-white uppercase text-[9px] font-black tracking-widest sticky top-0 z-10">
        <tr>
          <th className="px-6 py-4 border-r border-slate-700">Profil Lengkap Santri</th>
          <th className="px-4 py-4 border-r border-slate-700 text-center">Kategori / Kelas</th>
          <th className="px-4 py-4 border-r border-slate-700">Informasi Orang Tua</th>
          <th className="px-4 py-4 border-r border-slate-700 text-center">Tanggal Masuk</th>
          <th className="px-4 py-4 border-r border-slate-700 text-center">Unit Dapur</th>
          <th className="px-6 py-4 text-right">Aksi</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {isLoading ? (
          <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-sky-600" /></td></tr>
        ) : filteredSantri.map((s) => (
          <tr key={s.id} className="hover:bg-slate-50 transition-colors">
            {/* KOLOM PROFIL GABUNGAN */}
            <td className="px-6 py-4 border-r border-slate-50">
              <div className="flex flex-col">
                <div className="font-black text-[11px] uppercase text-slate-900 leading-none">{s.nama_lengkap}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] font-bold text-sky-600 bg-sky-50 px-1 rounded">NIS: {s.nis || "-"}</span>
                  <span className={cn(
                    "text-[9px] font-black px-1 rounded",
                    s.jenis_kelamin === 'P' ? "text-pink-500 bg-pink-50" : "text-blue-500 bg-blue-50"
                  )}>
                    {s.jenis_kelamin === 'L' ? 'SANTRI' : 'SANTRIAH'}
                  </span>
                </div>
                <div className="flex items-start gap-1 mt-1.5 opacity-70">
                  <MapPin size={10} className="mt-0.5 shrink-0" />
                  <span className="text-[9px] font-medium leading-tight line-clamp-1 italic">{s.alamat || "Alamat belum diisi"}</span>
                </div>
              </div>
            </td>

            {/* KATEGORI / KELAS */}
            <td className="px-4 py-4 text-center border-r border-slate-50">
              <div className="text-[9px] font-black text-sky-700 bg-sky-50 px-2 py-0.5 rounded inline-block uppercase border border-sky-100">{s.jenjang}</div>
              <div className="text-[10px] font-black text-slate-500 uppercase block mt-1">KELAS: {s.kelas || "-"}</div>
            </td>

            {/* INFORMASI ORANG TUA */}
            <td className="px-4 py-4 border-r border-slate-50">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <UserCircle size={14} className="text-slate-400" />
                  <span className="text-[10px] font-black uppercase text-slate-700">{s.nama_wali || "-"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-emerald-100 p-0.5 rounded text-emerald-600">
                    <Phone size={10} strokeWidth={3} />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700">{s.hp_wali || "-"}</span>
                </div>
              </div>
            </td>

            {/* TANGGAL MASUK */}
            <td className="px-4 py-4 text-center border-r border-slate-50">
               <div className="text-[10px] font-black text-slate-600">
                 {s.tanggal_masuk ? new Date(s.tanggal_masuk).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}
               </div>
            </td>

            {/* UNIT DAPUR */}
            <td className="px-4 py-4 text-center font-black text-slate-600 text-[10px] uppercase border-r border-slate-50">
              {KATEGORI_NON_MUKIM.includes(s.jenjang) ? (
                <span className="text-slate-300 text-[8px] bg-slate-50 px-2 py-1 rounded">NON-MUKIM</span>
              ) : (
                <div className="flex items-center justify-center gap-1.5">
                  <Utensils size={12} className="text-orange-400" /> 
                  <span>{s.id_dapur || "PENDING"}</span>
                </div>
              )}
            </td>

            {/* AKSI */}
            <td className="px-6 py-4 text-right">
              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => handleEdit(s)} 
                  className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg border border-sky-100 transition-all active:scale-90"
                >
                  <Pencil size={14}/>
                </button>
                <button 
                  onClick={() => handleDelete(s.id, s.nama_lengkap)} 
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg border border-red-100 transition-all active:scale-90"
                >
                  <Trash2 size={14}/>
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>

      {/* FORM MODAL - SESUAI PERMINTAAN */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsDialogOpen(false)}></div>
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative z-10 overflow-hidden border">
            <div className="bg-sky-900 p-4 text-white flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest">{editingSantri ? "Edit Data Santri" : "Formulir Pendaftaran"}</h3>
              <button onClick={() => setIsDialogOpen(false)}><X size={18} /></button>
            </div>
            
           <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[80vh] overflow-y-auto text-black custom-scrollbar">
  {/* NAMA LENGKAP */}
  <div className="md:col-span-2 space-y-1">
    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nama Lengkap</label>
    <input required className="w-full px-4 py-2 border rounded-xl text-[11px] font-black uppercase focus:border-sky-600 outline-none" 
      value={formData.nama_lengkap} onChange={(e) => setFormData({...formData, nama_lengkap: e.target.value})} />
  </div>

  {/* NIS */}
  <div className="space-y-1">
    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">NIS (Nomor Induk Santri)</label>
    <input type="number" required className="w-full px-4 py-2 border rounded-xl text-[11px] font-black focus:border-sky-600 outline-none" 
      value={formData.nis} onChange={(e) => setFormData({...formData, nis: e.target.value})} />
  </div>

  {/* JENIS KELAMIN */}
  <div className="space-y-1">
    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Jenis Kelamin</label>
    <select className="w-full px-4 py-2 border rounded-xl text-[11px] font-black outline-none"
      value={formData.jenis_kelamin} onChange={(e) => setFormData({...formData, jenis_kelamin: e.target.value})}>
      <option value="L">LAKI-LAKI</option>
      <option value="P">PEREMPUAN</option>
    </select>
  </div>

  {/* ALAMAT */}
  <div className="md:col-span-2 space-y-1">
    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Alamat Lengkap</label>
    <textarea required className="w-full px-4 py-2 border rounded-xl text-[11px] font-bold focus:border-sky-600 outline-none min-h-[60px] resize-none" 
      value={formData.alamat} onChange={(e) => setFormData({...formData, alamat: e.target.value})} />
  </div>

  {/* KATEGORI SANTRI */}
  <div className="md:col-span-2 space-y-1">
    <label className="text-[9px] font-black text-sky-700 uppercase ml-1">Kategori Santri / Jenjang</label>
    <select className="w-full px-4 py-2 border-2 border-sky-100 rounded-xl text-[11px] font-black outline-none bg-sky-50/30 text-sky-900"
      value={formData.jenjang} 
      onChange={(e) => {
        const val = e.target.value;
        const isLuar = KATEGORI_NON_MUKIM.includes(val);
        setFormData({...formData, jenjang: val, id_dapur: isLuar ? "" : formData.id_dapur})
      }}>
      <option value="MTS PLUS">MTS PLUS</option>
      <option value="MTS PLUS REVISI">MTS PLUS REVISI</option>
      <option value="MA PLUS">MA PLUS</option>
      <option value="MA PLUS REVISI">MA PLUS REVISI</option>
      <option value="MTS SAJA">MTS SAJA</option>
      <option value="MA SAJA">MA SAJA</option>
      <option value="SANTRI NON MUKIM">SANTRI NON MUKIM</option>
      <option value="TAKHOSUS/KULIAH">TAKHOSUS/KULIAH</option>
      <option value="PENGABDIAN">PENGABDIAN</option>
    </select>
  </div>

  {/* NAMA WALI */}
  <div className="space-y-1">
    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nama Wali Santri</label>
    <input required className="w-full px-4 py-2 border rounded-xl text-[11px] font-black focus:border-sky-600 outline-none" 
      value={formData.nama_wali} onChange={(e) => setFormData({...formData, nama_wali: e.target.value})} />
  </div>

  {/* WHATSAPP WALI */}
  <div className="space-y-1">
    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">WhatsApp Wali</label>
    <input required className="w-full px-4 py-2 border rounded-xl text-[11px] font-black focus:border-sky-600 outline-none" 
      value={formData.hp_wali} onChange={(e) => setFormData({...formData, hp_wali: e.target.value})} />
  </div>

  {/* KELAS */}
  <div className="space-y-1">
    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Kelas</label>
    <input required className="w-full px-4 py-2 border rounded-xl text-[11px] font-black uppercase focus:border-sky-600 outline-none" 
      value={formData.kelas} onChange={(e) => setFormData({...formData, kelas: e.target.value})} />
  </div>

  {/* UNIT DAPUR */}
  <div className="space-y-1">
    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Pilih Unit Dapur</label>
    <select 
      required={!KATEGORI_NON_MUKIM.includes(formData.jenjang)} 
      disabled={KATEGORI_NON_MUKIM.includes(formData.jenjang)}
      className={cn(
        "w-full px-4 py-2 border rounded-xl text-[11px] font-black outline-none transition-all",
        KATEGORI_NON_MUKIM.includes(formData.jenjang) ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-white"
      )}
      value={formData.id_dapur} 
      onChange={(e) => setFormData({...formData, id_dapur: e.target.value})}>
      <option value="">{KATEGORI_NON_MUKIM.includes(formData.jenjang) ? "TIDAK MUKIM" : "Pilih Dapur..."}</option>
      {DAFTAR_DAPUR.map(d => <option key={d} value={d}>{d}</option>)}
    </select>
  </div>

  {/* TANGGAL MASUK (BARU) */}
  <div className="space-y-1">
    <label className="text-[9px] font-black text-sky-700 uppercase ml-1">Tanggal Masuk / Registrasi</label>
    <input type="date" required className="w-full px-4 py-2 border border-sky-100 bg-sky-50/50 rounded-xl text-[11px] font-black outline-none focus:border-sky-600" 
      value={formData.tanggal_masuk} onChange={(e) => setFormData({...formData, tanggal_masuk: e.target.value})} />
  </div>

  {/* CHECKBOX OTOMATIS BULAN INI */}
  <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-center gap-3 h-[42px] self-end">
    <input 
      type="checkbox" 
      id="mulai_bulan_ini"
      className="w-4 h-4 rounded border-amber-300 text-sky-800 focus:ring-sky-600 cursor-pointer"
      checked={formData.mulai_bulan_ini}
      onChange={(e) => setFormData({...formData, mulai_bulan_ini: e.target.checked})}
    />
    <label htmlFor="mulai_bulan_ini" className="cursor-pointer select-none">
      <div className="text-[9px] font-black text-amber-900 uppercase leading-none">Tagihan Mulai Bulan Ini</div>
      <p className="text-[7px] font-bold text-amber-600 uppercase mt-0.5">Abaikan tunggakan lama</p>
    </label>
  </div>

  {/* PREVIEW TARIF */}
  <div className="md:col-span-2 flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl mt-2">
    <div className="flex items-center gap-2 text-emerald-700">
      <Banknote size={14} />
      <span className="text-[9px] font-black uppercase tracking-widest">Kewajiban Bulanan ({formData.jenjang}):</span>
    </div>
    <span className="text-sm font-black text-emerald-900 font-mono tracking-tighter">Rp {previewTarif.toLocaleString('id-ID')}</span>
  </div>

  <div className="md:col-span-2 flex justify-end gap-2 pt-4 border-t">
    <button type="button" onClick={() => setIsDialogOpen(false)} className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase">Batal</button>
    <button type="submit" className="px-6 py-2 bg-sky-800 text-white font-black rounded-lg text-[10px] uppercase flex items-center gap-2 shadow-md hover:bg-sky-900 transition-all active:scale-95">
      <Save size={14} /> {editingSantri ? "Simpan Perubahan" : "Daftarkan Santri"}
    </button>
  </div>
</form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  )
}