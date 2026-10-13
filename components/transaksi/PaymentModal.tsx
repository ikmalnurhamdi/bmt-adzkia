"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Loader2, Search } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { useMaster } from "@/lib/master"
import { useDebounce } from "@/hooks/useDebounce"
import { fail, konfirmasi, toast, warn } from "@/lib/alert"
import { UNIT } from "@/lib/config"
import { METODE_BAYAR, labelPeriode, tingkatLabel } from "@/lib/constants"
import { angka, buatNoKwitansi, hariIni, rupiah } from "@/lib/format"
import { cetakKwitansi } from "@/lib/kwitansi"
import { cn } from "@/lib/utils"
import type { Kategori, Siswa, TagihanRow } from "@/lib/types"
import { Badge, Modal, Spinner, TahunSelect, ui } from "@/components/ui"

type SiswaPilihan = Pick<Siswa, "id" | "nama_lengkap" | "nis" | "tingkat" | "kelas" | "status">

interface Props {
  onClose: () => void
  onSaved: () => void
}

/** Baris tagihan yang dipilih untuk dibayar: key = kategori:periode */
const rowKey = (kid: string, p: number) => `${kid}:${p}`

export default function PaymentModal({ onClose, onSaved }: Props) {
  const { kategori, tahunAjaran, tahunDefault } = useMaster()

  const [cari, setCari] = useState("")
  const qCari = useDebounce(cari.trim(), 250)
  const [hasilCari, setHasilCari] = useState<SiswaPilihan[]>([])
  const [siswa, setSiswa] = useState<SiswaPilihan | null>(null)

  const [tahun, setTahun] = useState<number | null>(null)
  const aktifTahun = tahun ?? tahunDefault
  const ta = tahunAjaran.find((t) => t.tahun === aktifTahun)

  const [tagihan, setTagihan] = useState<TagihanRow[]>([])
  const [loadingTagihan, setLoadingTagihan] = useState(false)
  const [pilih, setPilih] = useState<Record<string, string>>({}) // key -> nominal (string)
  const [bebasKat, setBebasKat] = useState("")
  const [bebasNominal, setBebasNominal] = useState("")

  const [tanggalBayar, setTanggalBayar] = useState(hariIni())
  const [metode, setMetode] = useState(METODE_BAYAR[0])
  const [keterangan, setKeterangan] = useState("")
  const [busy, setBusy] = useState(false)
  const reqId = useRef(0)

  // Pencarian siswa (server-side, maksimal 6 hasil)
  useEffect(() => {
    if (siswa || qCari.length < 2) return setHasilCari([])
    const s = qCari.replace(/[,()%*]/g, " ")
    let batal = false
    getSupabase()
      .from("siswa")
      .select("id,nama_lengkap,nis,tingkat,kelas,status")
      .eq("unit", UNIT)
      .in("status", ["aktif", "calon"])
      .or(`nama_lengkap.ilike.%${s}%,nis.ilike.%${s}%`)
      .order("nama_lengkap")
      .limit(6)
      .then(({ data }: { data: SiswaPilihan[] | null }) => !batal && setHasilCari(data ?? []))
    return () => {
      batal = true
    }
  }, [qCari, siswa])

  // Muat tagihan siswa pada tahun ajaran terpilih
  const muatTagihan = useCallback(async () => {
    if (!siswa) return
    const id = ++reqId.current
    setLoadingTagihan(true)
    const { data, error } = await getSupabase().rpc("fn_tagihan", { p_tahun: aktifTahun, p_siswa: siswa.id })
    if (id !== reqId.current) return
    setLoadingTagihan(false)
    if (error) return fail(error)
    setTagihan((data ?? []) as TagihanRow[])
    setPilih({})
  }, [siswa, aktifTahun])

  useEffect(() => {
    muatTagihan()
  }, [muatTagihan])

  const katMap = useMemo(() => new Map(kategori.map((k) => [k.id, k])), [kategori])
  const kategoriBebas = kategori.filter((k) => k.aktif && k.tipe_tagihan === "bebas")

  // Kelompokkan tagihan per kategori mengikuti urutan kategori
  const grup = useMemo(() => {
    const m = new Map<string, TagihanRow[]>()
    tagihan.forEach((t) => m.set(t.kategori_id, [...(m.get(t.kategori_id) ?? []), t]))
    return kategori
      .filter((k) => m.has(k.id))
      .map((k) => ({ kategori: k, rows: (m.get(k.id) ?? []).sort((a, b) => a.periode - b.periode) }))
  }, [tagihan, kategori])

  const totalPilih = Object.values(pilih).reduce((a, v) => a + (Number(v) || 0), 0) + (Number(bebasNominal) || 0)

  const toggle = (t: TagihanRow) => {
    const k = rowKey(t.kategori_id, t.periode)
    setPilih((cur) => {
      const next = { ...cur }
      if (k in next) delete next[k]
      else next[k] = String(t.sisa)
      return next
    })
  }

  const pilihSemuaJatuhTempo = () => {
    const next: Record<string, string> = {}
    tagihan.filter((t) => t.jatuh_tempo && t.sisa > 0).forEach((t) => (next[rowKey(t.kategori_id, t.periode)] = String(t.sisa)))
    setPilih(next)
  }

  const simpan = async () => {
    if (!siswa || !ta) return
    const noKw = buatNoKwitansi()
    const base = {
      siswa_id: siswa.id,
      tahun_ajaran_id: ta.id,
      tanggal_bayar: tanggalBayar,
      metode,
      no_kwitansi: noKw,
      keterangan: keterangan.trim() || null,
    }
    const entries: (typeof base & { kategori_id: string; periode: number; jumlah_bayar: number })[] = []

    for (const [k, v] of Object.entries(pilih)) {
      const nominal = Number(v)
      if (!(nominal > 0)) continue
      const [kid, p] = k.split(":")
      entries.push({ ...base, kategori_id: kid, periode: Number(p), jumlah_bayar: nominal })
    }
    if (bebasKat && Number(bebasNominal) > 0) {
      entries.push({ ...base, kategori_id: bebasKat, periode: 1, jumlah_bayar: Number(bebasNominal) })
    }
    if (entries.length === 0) return warn("Belum ada pembayaran", "Centang tagihan atau isi pembayaran bebas.")

    // Peringatan bila nominal melebihi sisa tagihan
    const lebih = entries.some((e) => {
      const t = tagihan.find((x) => x.kategori_id === e.kategori_id && x.periode === e.periode)
      return t && e.jumlah_bayar > t.sisa
    })
    if (lebih && !(await konfirmasi("Nominal melebihi sisa tagihan", "Ada pembayaran yang lebih besar dari sisa tagihan. Tetap simpan?", "Ya, Simpan"))) return

    setBusy(true)
    const { error } = await getSupabase().from("transaksi_pembayaran").insert(entries)
    setBusy(false)
    if (error) return fail(error)

    onSaved()
    const cetak = await konfirmasi(`${entries.length} pembayaran tersimpan`, `Total ${rupiah(entries.reduce((a, e) => a + e.jumlah_bayar, 0))}. Cetak kwitansi sekarang?`, "Cetak Kwitansi")
    if (cetak) await cetakKwitansi({ id: "", no_kwitansi: noKw }).catch(fail)
    onClose()
  }

  return (
    <Modal
      title="Input Pembayaran"
      onClose={onClose}
      maxWidth="max-w-3xl"
      footer={
        siswa && (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase text-slate-400">Total dibayar</p>
              <p className="text-lg font-black text-sky-800 leading-none">{rupiah(totalPilih)}</p>
            </div>
            <div className="flex gap-2">
              <button className={ui.btnGhost} onClick={onClose}>Batal</button>
              <button className={ui.btnPrimary} disabled={busy || totalPilih <= 0} onClick={simpan}>
                {busy ? <Loader2 className="animate-spin" size={14} /> : "Simpan Pembayaran"}
              </button>
            </div>
          </div>
        )
      }
    >
      <div className="space-y-5">
        {/* 1. Pilih siswa */}
        <div className="relative">
          <label className={ui.label}>Siswa / calon siswa</label>
          {siswa ? (
            <div className="flex items-center justify-between bg-sky-50 border border-sky-200 rounded-xl px-4 py-3">
              <div>
                <div className="text-xs font-black uppercase text-slate-800">{siswa.nama_lengkap}</div>
                <div className="text-[10px] text-sky-700 font-semibold mt-0.5">
                  NIS {siswa.nis || "-"} · Kelas {tingkatLabel(siswa.tingkat)}{siswa.kelas ? ` ${siswa.kelas}` : ""}
                  {siswa.status === "calon" && <span className="ml-2"><Badge tone="amber">Calon</Badge></span>}
                </div>
              </div>
              <button className="text-xs font-bold text-red-500 hover:bg-red-50 px-2.5 py-1 rounded-lg" onClick={() => { setSiswa(null); setTagihan([]); setPilih({}) }}>
                Ganti
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input autoFocus className={cn(ui.input, "pl-9 py-2.5")} placeholder="Ketik nama atau NIS (min. 2 huruf)..." value={cari} onChange={(e) => setCari(e.target.value)} />
              </div>
              {hasilCari.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-20 overflow-hidden">
                  {hasilCari.map((s) => (
                    <button key={s.id} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-sky-50 text-left border-b border-slate-50 last:border-0" onClick={() => { setSiswa(s); setCari("") }}>
                      <div>
                        <div className="text-xs font-bold uppercase text-slate-800">{s.nama_lengkap}</div>
                        <div className="text-[10px] text-slate-400">NIS: {s.nis || "—"}</div>
                      </div>
                      <Badge tone={s.status === "calon" ? "amber" : "sky"}>{s.status === "calon" ? "Calon" : `Kelas ${tingkatLabel(s.tingkat)}`}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {siswa && (
          <>
            {/* 2. Tagihan */}
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-slate-500">Tagihan tahun ajaran</span>
                  <TahunSelect value={aktifTahun} onChange={setTahun} tahunAjaran={tahunAjaran} />
                </div>
                <button className="text-[10px] font-black uppercase text-sky-700 hover:underline" onClick={pilihSemuaJatuhTempo}>
                  Pilih semua tunggakan
                </button>
              </div>

              {loadingTagihan ? <Spinner /> : grup.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-slate-400">
                  Tidak ada tagihan. Pastikan tarif tahun {aktifTahun} sudah diisi di Pengaturan.
                </p>
              ) : (
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar divide-y divide-slate-100">
                  {grup.map(({ kategori: k, rows }) => (
                    <div key={k.id}>
                      <div className="px-4 py-1.5 bg-slate-100/60 text-[10px] font-black uppercase tracking-wider text-slate-600">{k.nama}</div>
                      {rows.map((t) => (
                        <TagihanLine
                          key={rowKey(t.kategori_id, t.periode)}
                          t={t}
                          kategori={katMap.get(t.kategori_id)}
                          nominal={pilih[rowKey(t.kategori_id, t.periode)]}
                          onToggle={() => toggle(t)}
                          onNominal={(v) => setPilih((cur) => ({ ...cur, [rowKey(t.kategori_id, t.periode)]: v }))}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Pembayaran bebas */}
            {kategoriBebas.length > 0 && (
              <div className="grid grid-cols-2 gap-3 bg-amber-50/50 border border-amber-100 rounded-xl p-4">
                <div>
                  <label className={ui.label}>Pembayaran lain (bebas)</label>
                  <select className={ui.input} value={bebasKat} onChange={(e) => setBebasKat(e.target.value)}>
                    <option value="">— tidak ada —</option>
                    {kategoriBebas.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                  </select>
                </div>
                <div>
                  <label className={ui.label}>Nominal</label>
                  <input type="number" min={0} className={ui.input} value={bebasNominal} onChange={(e) => setBebasNominal(e.target.value)} disabled={!bebasKat} />
                </div>
              </div>
            )}

            {/* 4. Detail */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className={ui.label}>Tanggal bayar</label>
                <input type="date" className={ui.input} value={tanggalBayar} onChange={(e) => setTanggalBayar(e.target.value)} />
              </div>
              <div>
                <label className={ui.label}>Metode</label>
                <select className={ui.input} value={metode} onChange={(e) => setMetode(e.target.value)}>
                  {METODE_BAYAR.map((m) => <option key={m} value={m} className="capitalize">{m}</option>)}
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className={ui.label}>Keterangan</label>
                <input className={ui.input} value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Opsional" />
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

function TagihanLine({ t, kategori, nominal, onToggle, onNominal }: {
  t: TagihanRow
  kategori?: Kategori
  nominal?: string
  onToggle: () => void
  onNominal: (v: string) => void
}) {
  const lunas = t.sisa <= 0
  const dipilih = nominal !== undefined
  return (
    <div className={cn("flex items-center gap-3 px-4 py-2 text-xs", lunas && "opacity-50", dipilih && "bg-sky-50/60")}>
      <input type="checkbox" aria-label="Pilih" checked={dipilih} disabled={lunas} onChange={onToggle} className="w-4 h-4 accent-sky-700" />
      <div className="flex-1 min-w-0">
        <span className="font-bold text-slate-700">{kategori ? labelPeriode(kategori.tipe_tagihan, t.periode) : t.periode}</span>
        {!t.jatuh_tempo && <span className="ml-2 text-[9px] font-bold text-slate-300 uppercase">belum jatuh tempo</span>}
        {t.diskon > 0 && <span className="ml-2 text-[9px] font-bold text-amber-600 uppercase">diskon {angka(t.diskon)}</span>}
      </div>
      <div className="text-right w-28 text-[10px] text-slate-400 leading-tight">
        {lunas ? <Badge tone="emerald">Lunas</Badge> : (
          <>
            <div>Tagihan {angka(t.target)}</div>
            <div className="font-black text-orange-600">Sisa {angka(t.sisa)}</div>
          </>
        )}
      </div>
      <input
        type="number"
        min={0}
        aria-label="Nominal bayar"
        disabled={!dipilih}
        value={nominal ?? ""}
        onChange={(e) => onNominal(e.target.value)}
        className={cn(ui.input, "w-28 py-1.5 text-right")}
        placeholder="0"
      />
    </div>
  )
}
