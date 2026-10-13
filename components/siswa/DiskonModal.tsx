"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { useMaster } from "@/lib/master"
import { fail, konfirmasi, toast, warn } from "@/lib/alert"
import { angka } from "@/lib/format"
import type { Diskon, Siswa } from "@/lib/types"
import { Modal, Spinner, ui } from "@/components/ui"

export default function DiskonModal({ siswa, onClose }: { siswa: Siswa; onClose: () => void }) {
  const { kategori, tahunAjaran } = useMaster()
  const [list, setList] = useState<Diskon[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [f, setF] = useState({ kategori_id: "", tahun_ajaran_id: "", tipe: "persen" as "persen" | "nominal", nilai: "", keterangan: "" })

  const muat = useCallback(async () => {
    const { data, error } = await getSupabase().from("diskon_siswa").select("*").eq("siswa_id", siswa.id).order("created_at")
    setLoading(false)
    if (error) return fail(error)
    setList((data ?? []) as Diskon[])
  }, [siswa.id])

  useEffect(() => {
    muat()
  }, [muat])

  const tambah = async (e: React.FormEvent) => {
    e.preventDefault()
    const nilai = Number(f.nilai)
    if (!(nilai > 0)) return warn("Nilai diskon harus lebih dari 0")
    if (f.tipe === "persen" && nilai > 100) return warn("Persen maksimal 100")
    setBusy(true)
    const { error } = await getSupabase().from("diskon_siswa").insert({
      siswa_id: siswa.id,
      kategori_id: f.kategori_id || null,
      tahun_ajaran_id: f.tahun_ajaran_id || null,
      tipe: f.tipe,
      nilai,
      keterangan: f.keterangan.trim() || null,
    })
    setBusy(false)
    if (error) return fail(error)
    setF({ ...f, nilai: "", keterangan: "" })
    toast("Diskon ditambahkan")
    muat()
  }

  const hapus = async (id: string) => {
    if (!(await konfirmasi("Hapus diskon ini?", undefined, "Ya, Hapus", true))) return
    const { error } = await getSupabase().from("diskon_siswa").delete().eq("id", id)
    if (error) return fail(error)
    muat()
  }

  const namaKategori = (id: string | null) => (id ? kategori.find((k) => k.id === id)?.nama ?? "?" : "Semua kategori")
  const namaTahun = (id: string | null) => (id ? tahunAjaran.find((t) => t.id === id)?.nama ?? "?" : "Semua tahun")

  return (
    <Modal title={`Diskon / Beasiswa · ${siswa.nama_lengkap}`} onClose={onClose} maxWidth="max-w-xl">
      <div className="space-y-5">
        <form onSubmit={tambah} className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-100 rounded-xl p-4">
          <div>
            <label className={ui.label}>Kategori</label>
            <select className={ui.input} value={f.kategori_id} onChange={(e) => setF({ ...f, kategori_id: e.target.value })}>
              <option value="">Semua kategori</option>
              {kategori.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
          </div>
          <div>
            <label className={ui.label}>Tahun ajaran</label>
            <select className={ui.input} value={f.tahun_ajaran_id} onChange={(e) => setF({ ...f, tahun_ajaran_id: e.target.value })}>
              <option value="">Semua tahun</option>
              {tahunAjaran.map((t) => <option key={t.id} value={t.id}>{t.nama}</option>)}
            </select>
          </div>
          <div>
            <label className={ui.label}>Jenis potongan</label>
            <select className={ui.input} value={f.tipe} onChange={(e) => setF({ ...f, tipe: e.target.value as "persen" | "nominal" })}>
              <option value="persen">Persen (%)</option>
              <option value="nominal">Nominal (Rp) per periode</option>
            </select>
          </div>
          <div>
            <label className={ui.label}>Nilai</label>
            <input type="number" min={1} className={ui.input} value={f.nilai} onChange={(e) => setF({ ...f, nilai: e.target.value })} placeholder={f.tipe === "persen" ? "mis. 50" : "mis. 25000"} />
          </div>
          <div className="col-span-2">
            <label className={ui.label}>Keterangan</label>
            <input className={ui.input} value={f.keterangan} onChange={(e) => setF({ ...f, keterangan: e.target.value })} placeholder="mis. Beasiswa yatim / PIP" />
          </div>
          <div className="col-span-2 flex justify-end">
            <button disabled={busy} className={ui.btnPrimary}><Plus size={14} /> Tambah Diskon</button>
          </div>
        </form>

        {loading ? <Spinner /> : list.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-4">Belum ada diskon untuk siswa ini.</p>
        ) : (
          <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
            {list.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3 text-xs">
                <div className="min-w-0">
                  <div className="font-black text-slate-800">
                    {d.tipe === "persen" ? `${d.nilai}%` : `Rp ${angka(d.nilai)}`} · {namaKategori(d.kategori_id)}
                  </div>
                  <div className="text-[10px] text-slate-400">{namaTahun(d.tahun_ajaran_id)}{d.keterangan ? ` · ${d.keterangan}` : ""}</div>
                </div>
                <button aria-label="Hapus diskon" onClick={() => hapus(d.id)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
