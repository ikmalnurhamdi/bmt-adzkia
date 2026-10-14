"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Copy, Save } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { useMaster } from "@/modules/mts/lib/master"
import { fail, toast, warn } from "@/lib/alert"
import { TINGKAT_OPTIONS, tipeLabel } from "@/modules/mts/lib/constants"
import type { Tarif } from "@/modules/mts/lib/types"
import { Spinner, TahunSelect, ui } from "@/modules/mts/components/ui"

const KOLOM = [{ value: 0, label: "Semua tingkat" }, ...TINGKAT_OPTIONS.map((t) => ({ value: t.value, label: `Kelas ${t.label}` }))]
const key = (kid: string, tingkat: number) => `${kid}:${tingkat}`

export default function TarifTab() {
  const { ready, tahunAjaran, kategori, tahunDefault } = useMaster()
  const [tahun, setTahun] = useState<number | null>(null)
  const [tarifDb, setTarifDb] = useState<Tarif[]>([])
  const [nilai, setNilai] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  const aktifTahun = tahun ?? tahunDefault
  const ta = tahunAjaran.find((t) => t.tahun === aktifTahun)
  const kategoriTarif = useMemo(() => kategori.filter((k) => k.tipe_tagihan !== "bebas"), [kategori])

  const muat = useCallback(async () => {
    if (!ta) return
    setLoading(true)
    const { data, error } = await getSupabase().from("tarif_pembayaran").select("*").eq("tahun_ajaran_id", ta.id)
    setLoading(false)
    if (error) return fail(error)
    const list = (data ?? []) as Tarif[]
    setTarifDb(list)
    setNilai(Object.fromEntries(list.map((t) => [key(t.kategori_id, t.tingkat), String(t.nominal)])))
  }, [ta])

  useEffect(() => {
    if (ready) muat()
  }, [ready, muat])

  const salinTahunLalu = async () => {
    const prev = tahunAjaran.filter((t) => t.tahun < aktifTahun).sort((a, b) => b.tahun - a.tahun)[0]
    if (!prev) return warn("Tidak ada tahun sebelumnya")
    const { data, error } = await getSupabase().from("tarif_pembayaran").select("*").eq("tahun_ajaran_id", prev.id)
    if (error) return fail(error)
    const list = (data ?? []) as Tarif[]
    if (list.length === 0) return warn("Tarif tahun sebelumnya kosong")
    setNilai((cur) => ({ ...cur, ...Object.fromEntries(list.map((t) => [key(t.kategori_id, t.tingkat), String(t.nominal)])) }))
    toast(`Tarif ${prev.nama} disalin. Klik Simpan untuk menerapkan.`, "info")
  }

  const simpan = async () => {
    if (!ta) return
    const upserts: Omit<Tarif, "id">[] = []
    const hapusIds: string[] = []

    for (const k of kategoriTarif) {
      for (const c of KOLOM) {
        const n = Number(nilai[key(k.id, c.value)] || 0)
        const ada = tarifDb.find((t) => t.kategori_id === k.id && t.tingkat === c.value)
        if (n > 0) upserts.push({ kategori_id: k.id, tahun_ajaran_id: ta.id, tingkat: c.value, nominal: n })
        else if (ada) hapusIds.push(ada.id)
      }
    }

    setBusy(true)
    const sb = getSupabase()
    const ops = []
    if (upserts.length) ops.push(sb.from("tarif_pembayaran").upsert(upserts, { onConflict: "kategori_id,tahun_ajaran_id,tingkat" }))
    if (hapusIds.length) ops.push(sb.from("tarif_pembayaran").delete().in("id", hapusIds))
    const results = await Promise.all(ops)
    setBusy(false)
    const err = results.find((r) => r.error)?.error
    if (err) return fail(err)
    toast("Tarif tersimpan")
    muat()
  }

  if (!ready) return <Spinner />

  if (!ta) return <p className="text-xs text-slate-500">Buat tahun ajaran terlebih dahulu di tab Tahun Ajaran.</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={ui.label + " mb-0"}>Tahun ajaran</span>
          <TahunSelect value={aktifTahun} onChange={setTahun} tahunAjaran={tahunAjaran} />
        </div>
        <div className="flex gap-2">
          <button className={ui.btnGhost} onClick={salinTahunLalu}><Copy size={14} /> Salin dari tahun lalu</button>
          <button className={ui.btnPrimary} disabled={busy} onClick={simpan}><Save size={14} /> Simpan Tarif</button>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Isi nominal <b>per periode</b> (mis. Bulanan = per bulan, ASAS/ASAT = per semester). Kolom <b>Semua tingkat</b> berlaku umum;
        isi kolom kelas bila tarif berbeda per tingkat (menimpa tarif umum). Kosongkan / 0 = tidak ditagih.
      </p>

      {loading ? <Spinner /> : (
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className={ui.th}>Kategori</th>
                {KOLOM.map((c) => <th key={c.value} className={ui.th}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {kategoriTarif.map((k) => (
                <tr key={k.id} className={k.aktif ? "" : "opacity-50"}>
                  <td className="px-4 py-3">
                    <div className="font-black text-slate-800">{k.nama}</div>
                    <div className="text-[10px] text-slate-400">{tipeLabel(k.tipe_tagihan)}</div>
                  </td>
                  {KOLOM.map((c) => (
                    <td key={c.value} className="px-3 py-2">
                      <div className="flex">
                        <span className="px-2 flex items-center text-[10px] font-black text-slate-400 bg-slate-50 border border-r-0 border-slate-200 rounded-l-xl">Rp</span>
                        <input
                          type="number"
                          min={0}
                          aria-label={`${k.nama} ${c.label}`}
                          value={nilai[key(k.id, c.value)] ?? ""}
                          onChange={(e) => setNilai((cur) => ({ ...cur, [key(k.id, c.value)]: e.target.value }))}
                          className={ui.input + " rounded-l-none min-w-[110px]"}
                          placeholder="0"
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
              {kategoriTarif.length === 0 && (
                <tr><td colSpan={KOLOM.length + 1} className="px-4 py-10 text-center text-slate-400">Belum ada kategori bertarif.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
