"use client"

import { useState } from "react"
import { CheckCircle2, Plus, Trash2 } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { invalidateMaster, useMaster } from "@/modules/mts/lib/master"
import { fail, konfirmasi, toast, warn } from "@/lib/alert"
import { Badge, Spinner, ui } from "@/modules/mts/components/ui"

export default function TahunAjaranTab() {
  const { ready, tahunAjaran, reload } = useMaster()
  const [tahun, setTahun] = useState(String(new Date().getFullYear() + 1))
  const [busy, setBusy] = useState(false)

  const tambah = async (e: React.FormEvent) => {
    e.preventDefault()
    const t = Number(tahun)
    if (!Number.isInteger(t) || t < 2000 || t > 2100) return warn("Tahun tidak valid", "Isi tahun 2000–2100.")
    if (tahunAjaran.some((x) => x.tahun === t)) return warn("Sudah ada", `Tahun ajaran ${t} sudah terdaftar.`)
    setBusy(true)
    const { error } = await getSupabase().from("tahun_ajaran").insert({ tahun: t, nama: String(t), aktif: tahunAjaran.length === 0 })
    setBusy(false)
    if (error) return fail(error)
    invalidateMaster()
    await reload()
    toast("Tahun ajaran ditambahkan")
  }

  const jadikanAktif = async (id: string) => {
    const sb = getSupabase()
    const r1 = await sb.from("tahun_ajaran").update({ aktif: false }).eq("aktif", true)
    if (r1.error) return fail(r1.error)
    const r2 = await sb.from("tahun_ajaran").update({ aktif: true }).eq("id", id)
    if (r2.error) return fail(r2.error)
    invalidateMaster()
    await reload()
    toast("Tahun ajaran aktif diperbarui")
  }

  const hapus = async (id: string, nama: string) => {
    if (!(await konfirmasi(`Hapus tahun ajaran ${nama}?`, "Tarif tahun ini ikut terhapus. Tidak bisa dihapus bila sudah ada transaksi.", "Ya, Hapus", true))) return
    const { error } = await getSupabase().from("tahun_ajaran").delete().eq("id", id)
    if (error) return fail("Tahun ajaran ini sudah dipakai oleh transaksi sehingga tidak dapat dihapus.")
    invalidateMaster()
    await reload()
    toast("Terhapus")
  }

  if (!ready) return <Spinner />

  return (
    <div className="space-y-5 max-w-2xl">
      <p className="text-xs text-slate-500">
        Tahun ajaran mengikuti kalender <b>Januari–Desember</b>. Tahun yang ditandai <b>aktif</b> menjadi pilihan awal di semua halaman.
      </p>

      <form onSubmit={tambah} className="flex items-end gap-2">
        <div>
          <label className={ui.label} htmlFor="ta-tahun">Tambah tahun ajaran</label>
          <input id="ta-tahun" type="number" value={tahun} onChange={(e) => setTahun(e.target.value)} className={ui.input} />
        </div>
        <button disabled={busy} className={ui.btnPrimary}><Plus size={14} /> Tambah</button>
      </form>

      <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
        {tahunAjaran.map((t) => (
          <li key={t.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
            <div className="flex items-center gap-3">
              <span className="text-sm font-black text-slate-800">{t.nama}</span>
              {t.aktif && <Badge tone="emerald">Aktif</Badge>}
            </div>
            <div className="flex items-center gap-2">
              {!t.aktif && (
                <button className={ui.btnGhost} onClick={() => jadikanAktif(t.id)}>
                  <CheckCircle2 size={14} /> Jadikan aktif
                </button>
              )}
              <button aria-label={`Hapus ${t.nama}`} onClick={() => hapus(t.id, t.nama)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg">
                <Trash2 size={15} />
              </button>
            </div>
          </li>
        ))}
        {tahunAjaran.length === 0 && <li className="px-4 py-8 text-center text-xs text-slate-400">Belum ada tahun ajaran.</li>}
      </ul>
    </div>
  )
}
