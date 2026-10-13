"use client"

import { useState } from "react"
import { ArrowDown, ArrowUp, Pencil, Plus, Save, Trash2 } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { invalidateMaster, useMaster } from "@/lib/master"
import { fail, konfirmasi, toast, warn } from "@/lib/alert"
import { BULAN_NAMES, TIPE_TAGIHAN, tipeLabel } from "@/lib/constants"
import { UNIT } from "@/lib/config"
import type { Kategori, TipeTagihan } from "@/lib/types"
import { Badge, Modal, Spinner, ui } from "@/components/ui"

interface FormState {
  id?: string
  nama: string
  tipe_tagihan: TipeTagihan
  jt1: number
  jt2: number
  untuk_calon: boolean
  aktif: boolean
}

const kosong: FormState = { nama: "", tipe_tagihan: "bulanan", jt1: 12, jt2: 6, untuk_calon: false, aktif: true }

export default function KategoriTab() {
  const { ready, kategori, reload } = useMaster()
  const [form, setForm] = useState<FormState | null>(null)
  const [busy, setBusy] = useState(false)

  const buka = (k?: Kategori) => {
    if (!k) return setForm({ ...kosong })
    setForm({
      id: k.id,
      nama: k.nama,
      tipe_tagihan: k.tipe_tagihan,
      jt1: k.jatuh_tempo?.[0] ?? (k.tipe_tagihan === "semester" ? 12 : 12),
      jt2: k.jatuh_tempo?.[1] ?? 6,
      untuk_calon: k.untuk_calon,
      aktif: k.aktif,
    })
  }

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    const nama = form.nama.trim()
    if (!nama) return warn("Nama kategori wajib diisi")

    const jatuh_tempo =
      form.tipe_tagihan === "semester" ? [form.jt1, form.jt2]
      : form.tipe_tagihan === "tahunan" ? [form.jt1]
      : null

    const payload = { unit: UNIT, nama, tipe_tagihan: form.tipe_tagihan, jatuh_tempo, untuk_calon: form.untuk_calon, aktif: form.aktif }
    setBusy(true)
    const sb = getSupabase()
    const res = form.id
      ? await sb.from("kategori_pembayaran").update(payload).eq("id", form.id)
      : await sb.from("kategori_pembayaran").insert({ ...payload, urutan: (kategori.at(-1)?.urutan ?? 0) + 1 })
    setBusy(false)
    if (res.error) return fail(res.error.code === "23505" ? "Nama kategori sudah dipakai." : res.error)
    invalidateMaster()
    setForm(null)
    await reload()
    toast("Kategori tersimpan")
  }

  const hapus = async (k: Kategori) => {
    if (!(await konfirmasi(`Hapus kategori "${k.nama}"?`, "Tarif & diskon terkait ikut terhapus.", "Ya, Hapus", true))) return
    const { error } = await getSupabase().from("kategori_pembayaran").delete().eq("id", k.id)
    if (error) return fail("Kategori ini sudah dipakai transaksi. Nonaktifkan saja agar tidak muncul lagi.")
    invalidateMaster()
    await reload()
    toast("Kategori dihapus")
  }

  const geser = async (idx: number, arah: -1 | 1) => {
    const a = kategori[idx]
    const b = kategori[idx + arah]
    if (!a || !b) return
    const sb = getSupabase()
    // Tukar nilai urutan (dua query paralel)
    const [r1, r2] = await Promise.all([
      sb.from("kategori_pembayaran").update({ urutan: b.urutan === a.urutan ? b.urutan + arah : b.urutan }).eq("id", a.id),
      sb.from("kategori_pembayaran").update({ urutan: a.urutan }).eq("id", b.id),
    ])
    if (r1.error || r2.error) return fail(r1.error || r2.error)
    invalidateMaster()
    await reload()
  }

  if (!ready) return <Spinner />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500 max-w-xl">
          Tambah, ubah, urutkan, atau nonaktifkan jenis pembayaran sesuai kebutuhan. Tipe tagihan menentukan periode: bulanan (12), semester (ASAS &amp; ASAT), sekali, tahunan, atau bebas.
        </p>
        <button className={ui.btnPrimary} onClick={() => buka()}><Plus size={14} /> Kategori Baru</button>
      </div>

      <div className="overflow-x-auto border border-slate-100 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className={ui.th}>Urut</th>
              <th className={ui.th}>Nama</th>
              <th className={ui.th}>Tipe Tagihan</th>
              <th className={ui.th}>Jatuh Tempo</th>
              <th className={ui.th}>Status</th>
              <th className={`${ui.th} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {kategori.map((k, i) => (
              <tr key={k.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button aria-label="Naik" disabled={i === 0} onClick={() => geser(i, -1)} className="p-1 rounded hover:bg-slate-200 disabled:opacity-20"><ArrowUp size={14} /></button>
                    <button aria-label="Turun" disabled={i === kategori.length - 1} onClick={() => geser(i, 1)} className="p-1 rounded hover:bg-slate-200 disabled:opacity-20"><ArrowDown size={14} /></button>
                  </div>
                </td>
                <td className="px-4 py-3 font-black text-slate-800">
                  {k.nama} {k.untuk_calon && <Badge tone="amber">Calon siswa</Badge>}
                </td>
                <td className="px-4 py-3 font-semibold text-slate-600">{tipeLabel(k.tipe_tagihan)}</td>
                <td className="px-4 py-3 text-slate-500">{jatuhTempoText(k)}</td>
                <td className="px-4 py-3">{k.aktif ? <Badge tone="emerald">Aktif</Badge> : <Badge>Nonaktif</Badge>}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button aria-label={`Ubah ${k.nama}`} onClick={() => buka(k)} className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg"><Pencil size={15} /></button>
                    <button aria-label={`Hapus ${k.nama}`} onClick={() => hapus(k)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {kategori.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Belum ada kategori.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal
          title={form.id ? "Ubah Kategori" : "Kategori Baru"}
          onClose={() => setForm(null)}
          maxWidth="max-w-lg"
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" className={ui.btnGhost} onClick={() => setForm(null)}>Batal</button>
              <button form="form-kategori" disabled={busy} className={ui.btnPrimary}><Save size={14} /> Simpan</button>
            </div>
          }
        >
          <form id="form-kategori" onSubmit={simpan} className="space-y-4">
            <div>
              <label className={ui.label} htmlFor="kat-nama">Nama kategori</label>
              <input id="kat-nama" required autoFocus className={ui.input} value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="mis. Seragam, Study Tour, Infaq Gedung" />
            </div>

            <div>
              <label className={ui.label} htmlFor="kat-tipe">Tipe tagihan</label>
              <select id="kat-tipe" className={ui.input} value={form.tipe_tagihan} onChange={(e) => setForm({ ...form, tipe_tagihan: e.target.value as TipeTagihan })}>
                {TIPE_TAGIHAN.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">{TIPE_TAGIHAN.find((t) => t.value === form.tipe_tagihan)?.hint}</p>
            </div>

            {form.tipe_tagihan === "semester" && (
              <div className="grid grid-cols-2 gap-3">
                <BulanSelect label="ASAS jatuh tempo bulan" value={form.jt1} onChange={(v) => setForm({ ...form, jt1: v })} />
                <BulanSelect label="ASAT jatuh tempo bulan" value={form.jt2} onChange={(v) => setForm({ ...form, jt2: v })} />
              </div>
            )}
            {form.tipe_tagihan === "tahunan" && (
              <BulanSelect label="Jatuh tempo bulan" value={form.jt1} onChange={(v) => setForm({ ...form, jt1: v })} />
            )}

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input type="checkbox" checked={form.untuk_calon} onChange={(e) => setForm({ ...form, untuk_calon: e.target.checked })} />
                Ditagihkan juga ke <b>calon siswa</b> (mis. PPDB)
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input type="checkbox" checked={form.aktif} onChange={(e) => setForm({ ...form, aktif: e.target.checked })} />
                Aktif (tampil di transaksi &amp; tagihan)
              </label>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function jatuhTempoText(k: Kategori) {
  const nm = (m?: number) => (m ? BULAN_NAMES[m - 1] : "-")
  switch (k.tipe_tagihan) {
    case "bulanan": return "Tiap bulan"
    case "semester": return `ASAS: ${nm(k.jatuh_tempo?.[0])} · ASAT: ${nm(k.jatuh_tempo?.[1])}`
    case "tahunan": return nm(k.jatuh_tempo?.[0])
    case "sekali": return "Saat masuk"
    default: return "—"
  }
}

function BulanSelect({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className={ui.label}>{label}</label>
      <select className={ui.input} value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {BULAN_NAMES.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}
      </select>
    </div>
  )
}
