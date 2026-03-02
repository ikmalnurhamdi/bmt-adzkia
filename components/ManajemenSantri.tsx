"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { 
  Plus, Pencil, Trash2, Search, Users, 
  AlertCircle, Utensils, Phone, 
  UserCircle, MapPin, Loader2, Save, X 
} from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import Swal from "sweetalert2"
import { cn } from "@/lib/utils"

const DAFTAR_DAPUR = ["Dapur Umi", "Dapur Qais", "Dapur Hamka"]

export default function ManajemenSantri({ onUpdate }: { onUpdate: () => void }) {
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
    jenjang: "MTS",
    kelas: "",
    id_dapur: "",
    alamat: "",
    nama_wali: "",
    hp_wali: "",
    is_pip: false,
    status_aktif: true,
    tanggal_masuk: new Date().toISOString().split("T")[0],
    mulai_bulan_ini: false, // State tambahan untuk checkbox
  })

  const [previewTarif, setPreviewTarif] = useState(0)

  useEffect(() => {
    setMounted(true)
    loadSantri()
  }, [])

  // Logika Estimasi Tarif Otomatis
  useEffect(() => {
    const hitungEstimasi = () => {
      const tahun = new Date(formData.tanggal_masuk).getFullYear()
      const jenjang = formData.jenjang
      let tarif = 0
      if (tahun >= 2026) {
        if (jenjang === "MTS") tarif = 350000
        else if (jenjang === "MA") tarif = 360000
        else if (jenjang === "TAKHOSUS") tarif = 290000
        else if (jenjang === "PENGABDIAN") tarif = 40000
      } else {
        if (jenjang === "MTS") tarif = 330000
        else if (jenjang === "MA") tarif = 340000
        else if (jenjang === "TAKHOSUS") tarif = 290000
        else if (jenjang === "PENGABDIAN") tarif = 40000
      }
      setPreviewTarif(tarif)
    }
    hitungEstimasi()
  }, [formData.tanggal_masuk, formData.jenjang])

  async function loadSantri() {
    setIsLoading(true)
    const { data } = await getSupabase()
      .from("santri")
      .select("*")
      .order("nama_lengkap", { ascending: true })
    setSantriList(data || [])
    setIsLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const supabase = getSupabase()
    
    const isPengabdian = formData.jenjang === "PENGABDIAN"
    
    // LOGIKA TANGGAL TAGIHAN:
    // Jika checkbox dicentang, isi kolom tanggal_mulai_tagihan dengan tanggal hari ini
    const tanggalMulaiTagihan = formData.mulai_bulan_ini 
      ? new Date().toISOString().split("T")[0] 
      : null;

    const payload = {
      ...formData,
      id_dapur: isPengabdian ? "" : formData.id_dapur,
      nama_lengkap: formData.nama_lengkap.toUpperCase(),
      nis: formData.nis ? parseInt(formData.nis.toString()) : null,
      tanggal_mulai_tagihan: tanggalMulaiTagihan // Kolom baru di DB
    }

    // Hapus key UI sementara agar tidak error saat insert ke Supabase
    delete (payload as any).mulai_bulan_ini;

    try {
      if (editingSantri) {
        await supabase.from("santri").update(payload).eq("id", editingSantri.id)
      } else {
        await supabase.from("santri").insert([payload])
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
      jenjang: s.jenjang,
      kelas: s.kelas || "",
      id_dapur: s.id_dapur || "",
      alamat: s.alamat || "",
      nama_wali: s.nama_wali || "",
      hp_wali: s.hp_wali || "",
      is_pip: s.is_pip || false,
      status_aktif: s.status_aktif ?? true,
      tanggal_masuk: s.tanggal_masuk,
      mulai_bulan_ini: !!s.tanggal_mulai_tagihan, // Centang jika kolom sudah terisi
    })
    setIsDialogOpen(true)
  }

  async function handleDelete(id: string) {
    const result = await Swal.fire({
      title: 'Hapus Santri?',
      text: "Data keuangan santri ini juga akan terhapus!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Ya, Hapus'
    })
    if (result.isConfirmed) {
      await getSupabase().from("santri").delete().eq("id", id)
      loadSantri()
      onUpdate()
    }
  }

  function resetForm() {
    setFormData({
      nama_lengkap: "", nis: "", jenis_kelamin: "L", jenjang: "MTS", kelas: "", id_dapur: "", alamat: "",
      nama_wali: "", hp_wali: "", is_pip: false, status_aktif: true,
      tanggal_masuk: new Date().toISOString().split("T")[0],
      mulai_bulan_ini: false
    })
    setEditingSantri(null)
  }

  const filteredSantri = useMemo(() => {
    return santriList.filter(s => 
      s.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.nis && s.nis.toString().includes(searchTerm)) ||
      (s.nama_wali && s.nama_wali.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }, [santriList, searchTerm])

  if (!mounted) return null

  return (
    <div className="space-y-4 text-black font-sans">
      
      {/* HEADER RINGKAS */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-sky-100 p-2 rounded-lg text-sky-600">
            <Users size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-sky-900 uppercase tracking-tighter leading-none">Data Santri</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pesantren Al-Hidayah Cisadap</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right border-r border-slate-100 pr-6">
            <p className="text-[8px] font-black text-slate-400 uppercase">Total Terdaftar</p>
            <p className="text-sm font-black text-slate-800">{santriList.length} Santri</p>
          </div>
          <button 
            onClick={() => { resetForm(); setIsDialogOpen(true); }}
            className="bg-sky-800 hover:bg-sky-900 text-white font-black px-5 py-2 rounded-lg shadow-md flex items-center gap-2 text-[10px] uppercase transition-all active:scale-95"
          >
            <Plus size={14} /> Input Santri
          </button>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Cari Nama, NIS, atau Nama Wali..."
            className="w-full pl-10 pr-4 py-1.5 rounded-md border border-slate-200 focus:border-sky-500 text-[11px] font-bold outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* TABEL DATA */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-black">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#1e293b] text-slate-100 uppercase text-[9px] font-black tracking-widest sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 border-r border-slate-700">Profil Santri</th>
                <th className="px-4 py-4 text-center border-r border-slate-700">Jenjang / Kelas</th>
                <th className="px-4 py-4 text-center border-r border-slate-700">Tanggal Masuk</th>
                <th className="px-4 py-4 border-r border-slate-700 text-center">Unit Dapur</th>
                <th className="px-4 py-4 border-r border-slate-700">Kontak Wali</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-sky-600" /></td></tr>
              ) : filteredSantri.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "p-2 border rounded-lg mt-1 shrink-0 shadow-sm",
                        s.jenis_kelamin === 'P' ? "bg-pink-50 border-pink-100 text-pink-500" : "bg-blue-50 border-blue-100 text-blue-500"
                      )}>
                        <UserCircle size={18} />
                      </div>
                      <div className="space-y-1">
                        <div className="font-black text-[11px] uppercase text-slate-900 leading-tight">{s.nama_lengkap}</div>
                        <div className="flex items-center gap-2">
                          <div className="text-[9px] font-bold text-sky-600 uppercase tracking-tighter leading-none">NIS: {s.nis || "-"}</div>
                          <span className={cn(
                            "text-[8px] font-black px-1.5 py-0.5 rounded-full leading-none uppercase",
                            s.jenis_kelamin === 'L' ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"
                          )}>
                            {s.jenis_kelamin === 'P' ? "SANTRIAH" : "SANTRI"}
                          </span>
                        </div>
                        <div className="flex items-start gap-1 mt-1 max-w-[180px]">
                          <MapPin size={10} className="text-slate-400 shrink-0 mt-0.5" />
                          <p className="text-[9px] font-medium text-slate-500 leading-tight italic line-clamp-2">{s.alamat || "Alamat belum diisi"}</p>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <div className="text-[9px] font-black text-sky-700 bg-sky-100 px-2 py-0.5 rounded inline-block uppercase mb-1">{s.jenjang}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase block">Kelas: {s.kelas || "-"}</div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <div className="text-[10px] font-black text-slate-700 uppercase leading-none">
                      {s.tanggal_masuk ? new Date(s.tanggal_masuk).toLocaleDateString('id-ID', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      }) : "-"}
                    </div>
                    <div className="text-[8px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">Registrasi</div>
                  </td>

                  <td className="px-4 py-3 font-black text-slate-600 text-[10px] uppercase text-center">
                    {s.jenjang === "PENGABDIAN" ? (
                      <span className="text-slate-300">-</span>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5">
                        <Utensils size={12} className="text-orange-400" /> {s.id_dapur || "PENDING"}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="text-[10px] font-black text-slate-800 uppercase flex items-center gap-1.5">
                      <UserCircle size={12} className="text-slate-400" /> {s.nama_wali || "-"}
                    </div>
                    <div className="text-[9px] font-bold text-emerald-600 flex items-center gap-1.5 mt-0.5">
                      <Phone size={10} /> {s.hp_wali || "-"}
                    </div>
                  </td>

                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => handleEdit(s)} className="p-1.5 text-sky-600 hover:bg-sky-50 rounded border border-sky-100 transition-all shadow-sm"><Pencil size={14}/></button>
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded border border-red-100 transition-all shadow-sm"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL REGISTRASI */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsDialogOpen(false)}></div>
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative z-10 overflow-hidden border border-slate-200">
            <div className="bg-sky-900 p-4 text-white flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest leading-none">{editingSantri ? "Perbarui Profil" : "Registrasi Santri"}</h3>
              <button onClick={() => setIsDialogOpen(false)}><X size={18} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[80vh] overflow-y-auto custom-scrollbar text-black">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nama Lengkap</label>
                <input required className="w-full px-4 py-2 border border-slate-200 rounded-xl text-[11px] font-black uppercase focus:border-sky-600 outline-none" 
                  value={formData.nama_lengkap} onChange={(e) => setFormData({...formData, nama_lengkap: e.target.value})} />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Jenis Kelamin</label>
                <div className="flex gap-2">
                  {['L', 'P'].map((jk) => (
                    <button
                      key={jk}
                      type="button"
                      onClick={() => setFormData({ ...formData, jenis_kelamin: jk })}
                      className={cn(
                        "flex-1 py-2 rounded-xl border-2 text-[10px] font-black transition-all",
                        formData.jenis_kelamin === jk
                          ? "border-sky-600 bg-sky-50 text-sky-700 shadow-sm"
                          : "border-slate-50 bg-slate-50/50 text-slate-400 hover:border-slate-200"
                      )}
                    >
                      {jk === 'L' ? "LAKI-LAKI" : "PEREMPUAN"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Alamat Lengkap</label>
                <textarea required placeholder="Dusun, Desa, RT/RW, Kecamatan..." className="w-full px-4 py-2 border border-slate-200 rounded-xl text-[11px] font-bold focus:border-sky-600 outline-none min-h-[60px] resize-none"
                  value={formData.alamat} onChange={(e) => setFormData({ ...formData, alamat: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">NIS (Nomor Induk Santri)</label>
                <input type="number" required className="w-full px-4 py-2 border border-slate-200 rounded-xl text-[11px] font-black focus:border-sky-600 outline-none" 
                  value={formData.nis} onChange={(e) => setFormData({...formData, nis: e.target.value})} />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Kelas</label>
                <input required className="w-full px-4 py-2 border border-slate-200 rounded-xl text-[11px] font-black uppercase focus:border-sky-600 outline-none" 
                  value={formData.kelas} onChange={(e) => setFormData({...formData, kelas: e.target.value})} />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Jenjang Pendidikan</label>
                <select className="w-full px-4 py-2 border border-slate-200 rounded-xl text-[11px] font-black outline-none bg-white"
                  value={formData.jenjang} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({
                      ...formData, 
                      jenjang: val, 
                      id_dapur: val === "PENGABDIAN" ? "" : formData.id_dapur
                    })
                  }}>
                  <option value="MTS">MTS PLUS</option>
                  <option value="MA">MA PLUS</option>
                  <option value="TAKHOSUS">TAKHOSUS / KULIAH</option>
                  <option value="PENGABDIAN">PENGABDIAN</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Dapur Penerima (DPU)</label>
                <select 
                  required={formData.jenjang !== "PENGABDIAN"} 
                  disabled={formData.jenjang === "PENGABDIAN"}
                  className={cn(
                    "w-full px-4 py-2 border rounded-xl text-[11px] font-black outline-none transition-all",
                    formData.jenjang === "PENGABDIAN" 
                      ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed" 
                      : "bg-white border-slate-200 text-black"
                  )}
                  value={formData.id_dapur} 
                  onChange={(e) => setFormData({...formData, id_dapur: e.target.value})}>
                  <option value="">{formData.jenjang === "PENGABDIAN" ? "TIDAK MAKAN DI DAPUR" : "Pilih Unit Dapur..."}</option>
                  {DAFTAR_DAPUR.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-sky-700 uppercase ml-1">Tanggal Masuk</label>
                <input type="date" required className="w-full px-4 py-2 border border-sky-100 bg-sky-50/50 rounded-xl text-[11px] font-black outline-none" 
                  value={formData.tanggal_masuk} onChange={(e) => setFormData({...formData, tanggal_masuk: e.target.value})} />
              </div>

              {/* CHECKBOX TAGIHAN MULAI BULAN INI */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300 self-end">
                <input 
                  type="checkbox" 
                  id="mulai_bulan_ini"
                  className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer transition-all"
                  checked={formData.mulai_bulan_ini}
                  onChange={(e) => setFormData({...formData, mulai_bulan_ini: e.target.checked})}
                />
                <label htmlFor="mulai_bulan_ini" className="text-[10px] font-black text-slate-600 uppercase cursor-pointer select-none">
                  Tagihan dimulai Bulan Ini
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nama Wali Santri</label>
                <input required className="w-full px-4 py-2 border border-slate-200 rounded-xl text-[11px] font-black uppercase focus:border-sky-600 outline-none" 
                  value={formData.nama_wali} onChange={(e) => setFormData({...formData, nama_wali: e.target.value})} />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">No. WhatsApp Wali</label>
                <input required className="w-full px-4 py-2 border border-slate-200 rounded-xl text-[11px] font-black focus:border-sky-600 outline-none" 
                  value={formData.hp_wali} onChange={(e) => setFormData({...formData, hp_wali: e.target.value})} />
              </div>

              <div className="md:col-span-2 flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl mt-2">
                <div className="flex items-center gap-2 text-emerald-700">
                  <AlertCircle size={14} />
                  <span className="text-[9px] font-black uppercase">Estimasi Kewajiban Bulanan:</span>
                </div>
                <span className="text-sm font-black text-emerald-900">Rp {previewTarif.toLocaleString('id-ID')}</span>
              </div>

              <div className="md:col-span-2 flex justify-end gap-2 pt-4 border-t border-slate-100 mt-2">
                <button type="button" onClick={() => setIsDialogOpen(false)} className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase hover:text-slate-600">Batal</button>
                <button type="submit" className="px-6 py-2 bg-sky-800 text-white font-black rounded-lg shadow-md hover:bg-sky-900 transition-all text-[10px] uppercase flex items-center gap-2">
                  <Save size={14} /> {editingSantri ? "Update Profil" : "Registrasi Sekarang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  )
}