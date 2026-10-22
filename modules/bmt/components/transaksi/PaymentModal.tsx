"use client"

import { useState, useMemo, useEffect } from "react"
import { X, Banknote, Loader2, CheckCircle2, Info, CalendarOff, Calendar } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import Swal from "sweetalert2"
import { cn } from "@/lib/utils"
import {
  BULAN_NAMES, CURRENT_YEAR, YEAR_OPTIONS, getTargetDinamis, getKategoriLabel, formatRupiah,
} from "@/modules/bmt/lib/transactionHelpers"

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  santriList: any[]
  masterTarif: any[]
  onSuccessSave: () => void
}

type NominalKey = "nominal_dapur" | "nominal_pesantren" | "nominal_sekolah" | "nominal_total" | "nominal_lainnya"

const EMPTY_NOMINALS: Record<NominalKey, string> = {
  nominal_dapur: "",
  nominal_pesantren: "",
  nominal_sekolah: "",
  nominal_total: "",
  nominal_lainnya: "",
}

/** Jenjang yang hanya membayar satu komponen iuran (diinput sebagai "Nominal Total"). */
const JENJANG_PAKET_TUNGGAL = ["MTS SAJA", "MA SAJA", "SANTRI NON MUKIM"]

const getTodayString = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export default function PaymentModal({ isOpen, onClose, santriList, masterTarif, onSuccessSave }: PaymentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchSantriInModal, setSearchSantriInModal] = useState("")
  const [selectedSantri, setSelectedSantri] = useState<any | null>(null)
  const [selectedTahunBayar, setSelectedTahunBayar] = useState(CURRENT_YEAR)
  const [tanggalBayar, setTanggalBayar] = useState(getTodayString())

  // Bulan bersifat OPSIONAL. null = tanpa bulan (hanya untuk pembayaran lainnya).
  const [selectedBulan, setSelectedBulan] = useState<number | null>(new Date().getMonth() + 1)

  const [catatan, setCatatan] = useState("")
  const [keteranganLainnya, setKeteranganLainnya] = useState("")
  const [santriHistory, setSantriHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [nominals, setNominals] = useState(EMPTY_NOMINALS)

  useEffect(() => {
    if (selectedSantri) loadSantriHistory(selectedSantri.id)
    else setSantriHistory([])
  }, [selectedSantri])

  async function loadSantriHistory(santriId: string) {
    setLoadingHistory(true)
    const { data } = await getSupabase()
      .from("transaksi_pembayaran_v2")
      .select("*")
      .eq("santri_id", santriId)
      .order("created_at", { ascending: false })
    setSantriHistory(data || [])
    setLoadingHistory(false)
  }

  const filteredSantriForModal = useMemo(() => {
    if (!searchSantriInModal) return []
    return santriList.filter(s =>
      s.nama_lengkap?.toLowerCase().includes(searchSantriInModal.toLowerCase()) ||
      (s.nis && s.nis.toString().includes(searchSantriInModal))
    ).slice(0, 6)
  }, [santriList, searchSantriInModal])

  const isPaketTunggal = !!selectedSantri && JENJANG_PAKET_TUNGGAL.includes(selectedSantri.jenjang)
  const kategoriPaketTunggal = selectedSantri?.jenjang === "SANTRI NON MUKIM" ? "pesantren" : "sekolah"
  const hasBulan = selectedBulan !== null

  /** Status tagihan satu kategori syahriah pada bulan & tahun yang dipilih (mendukung cicilan). */
  const getStatus = (kategori: string) => {
    const target = getTargetDinamis(selectedSantri, kategori, masterTarif)
    const trx = hasBulan
      ? santriHistory.filter(p => p.kategori === kategori && p.bulan === selectedBulan && p.tahun === selectedTahunBayar)
      : []
    const terbayar = trx.reduce((a, b) => a + (b.jumlah_bayar || 0), 0)
    return { target, terbayar, sisa: Math.max(0, target - terbayar), jumlahCicilan: trx.length, isLunas: target > 0 && terbayar >= target }
  }

  const toggleBulan = (bulan: number) => {
    setSelectedBulan(prev => (prev === bulan ? null : bulan))
  }

  const setNominal = (key: NominalKey, value: string) => setNominals(prev => ({ ...prev, [key]: value }))

  const resetForm = () => {
    setNominals(EMPTY_NOMINALS)
    setCatatan("")
    setKeteranganLainnya("")
    setTanggalBayar(getTodayString())
  }

  const handleClose = () => {
    resetForm()
    setSelectedSantri(null)
    setSearchSantriInModal("")
    onClose()
  }

  const handleSimpanBayar = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedSantri) {
      Swal.fire("Perhatian", "Pilih santri terlebih dahulu.", "warning")
      return
    }

    // Kumpulkan nominal syahriah per kategori
    const syahriahInput: { kategori: string; jumlah: number }[] = isPaketTunggal
      ? [{ kategori: kategoriPaketTunggal, jumlah: Number(nominals.nominal_total) }]
      : [
          { kategori: "dapur", jumlah: Number(nominals.nominal_dapur) },
          { kategori: "pesantren", jumlah: Number(nominals.nominal_pesantren) },
          { kategori: "sekolah", jumlah: Number(nominals.nominal_sekolah) },
        ]
    const syahriahEntries = syahriahInput.filter(x => x.jumlah > 0)
    const nominalLainnya = Number(nominals.nominal_lainnya)

    if (syahriahEntries.length > 0 && !hasBulan) {
      Swal.fire("Perhatian", "Pembayaran syahriah (dapur/pesantren/sekolah) wajib memilih bulan.", "warning")
      return
    }
    if (nominalLainnya > 0 && !keteranganLainnya.trim()) {
      Swal.fire("Perhatian", "Isi keterangan untuk pembayaran lainnya (misal: seragam, buku, kitab).", "warning")
      return
    }
    if (syahriahEntries.length === 0 && !(nominalLainnya > 0)) {
      Swal.fire("Perhatian", "Isi minimal satu nominal pembayaran terlebih dahulu.", "warning")
      return
    }

    // Peringatan lunak bila nominal melebihi sisa tagihan bulan tersebut
    const lebih = syahriahEntries
      .map(x => ({ ...x, status: getStatus(x.kategori) }))
      .filter(x => x.status.target > 0 && x.jumlah > x.status.sisa)
    if (lebih.length > 0) {
      const res = await Swal.fire({
        title: "Nominal melebihi sisa tagihan",
        html: lebih
          .map(x => `<div style="font-size:13px">${getKategoriLabel(x.kategori)}: input <b>${formatRupiah(x.jumlah)}</b>, sisa <b>${formatRupiah(x.status.sisa)}</b></div>`)
          .join(""),
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Tetap Simpan",
        cancelButtonText: "Periksa Lagi",
        confirmButtonColor: "#0369a1",
      })
      if (!res.isConfirmed) return
    }

    const now = new Date()
    const timestampBayar = new Date(`${tanggalBayar}T12:00:00`).toISOString()

    const allEntries: any[] = syahriahEntries.map(x => ({
      santri_id: selectedSantri.id,
      kategori: x.kategori,
      bulan: selectedBulan,
      tahun: selectedTahunBayar,
      jumlah_bayar: x.jumlah,
      keterangan: catatan.trim() || null,
      created_at: timestampBayar,
    }))

    if (nominalLainnya > 0) {
      // Tanpa bulan → dicatat pada periode tanggal transaksi agar tetap muncul di monitoring & laporan.
      allEntries.push({
        santri_id: selectedSantri.id,
        kategori: "lainnya",
        bulan: selectedBulan ?? now.getMonth() + 1,
        tahun: hasBulan ? selectedTahunBayar : now.getFullYear(),
        jumlah_bayar: nominalLainnya,
        keterangan: keteranganLainnya.trim(),
        created_at: timestampBayar,
      })
    }

    setIsSubmitting(true)
    try {
      const { error } = await getSupabase().from("transaksi_pembayaran_v2").insert(allEntries)
      if (error) throw error
      Swal.fire({ icon: "success", title: `${allEntries.length} transaksi berhasil disimpan`, timer: 1500, showConfirmButton: false })
      onSuccessSave()
      loadSantriHistory(selectedSantri.id)
      resetForm()
    } catch (err: any) {
      Swal.fire("Gagal", err.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const periodeLainnya = hasBulan
    ? `${BULAN_NAMES[(selectedBulan as number) - 1]} ${selectedTahunBayar}`
    : `${BULAN_NAMES[new Date().getMonth()]} ${new Date().getFullYear()} (tanggal transaksi)`

  /** Input nominal syahriah + status tagihan bulan terpilih (render function agar input tidak kehilangan fokus). */
  const renderSyahriahInput = (label: string, kategori: string, field: NominalKey) => {
    const st = getStatus(kategori)
    return (
      <div key={field} className="space-y-1">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{label}</label>
        <input
          type="number"
          min={0}
          disabled={!hasBulan}
          value={nominals[field]}
          onChange={e => setNominal(field, e.target.value)}
          className="w-full px-3 py-2 border rounded-xl text-xs focus:border-sky-500 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
          placeholder={hasBulan ? "Rp" : "Pilih bulan dulu"}
        />
        {hasBulan && (st.target > 0 || st.terbayar > 0) && (
          <div className="text-[9px] leading-tight space-y-0.5">
            {st.isLunas ? (
              <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                <CheckCircle2 size={10} /> Lunas{st.jumlahCicilan > 1 ? ` (${st.jumlahCicilan}x bayar)` : ""}
              </span>
            ) : (
              <>
                <div className="text-slate-500">
                  Tagihan {formatRupiah(st.target)}
                  {st.terbayar > 0 && <> · dibayar {formatRupiah(st.terbayar)} ({st.jumlahCicilan}x)</>}
                </div>
                <button
                  type="button"
                  onClick={() => setNominal(field, String(st.sisa))}
                  className="font-bold text-sky-600 hover:underline"
                >
                  Sisa {formatRupiah(st.sisa)} · isi otomatis
                </button>
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  const riwayatTerakhir = santriHistory.slice(0, 5)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 relative z-10 overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="bg-sky-800 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Banknote size={18} />
            <h2 className="text-sm font-black uppercase tracking-wide">Input Pembayaran</h2>
          </div>
          <button onClick={handleClose} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Content Form */}
        <div className={cn("overflow-y-auto flex-1 p-6", !selectedSantri && "min-h-[380px]")}>
          <form onSubmit={handleSimpanBayar} className="space-y-5">
            <div className="space-y-1.5 relative">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Nama Santri</label>
              {selectedSantri ? (
                <div className="flex items-center justify-between bg-sky-50 border border-sky-200 rounded-xl px-4 py-3">
                  <div>
                    <div className="text-xs font-black uppercase text-slate-800">{selectedSantri.nama_lengkap}</div>
                    <div className="text-[10px] text-sky-600 font-semibold mt-0.5">{selectedSantri.jenjang} · Kelas {selectedSantri.kelas}</div>
                  </div>
                  <button type="button" onClick={() => { setSelectedSantri(null); resetForm() }} className="text-xs font-bold text-red-500 hover:bg-red-50 px-2.5 py-1 rounded-lg">Ganti</button>
                </div>
              ) : (
                <>
                  <input
                    type="text" placeholder="Ketik nama atau NIS..."
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none bg-slate-50 focus:border-slate-300 transition-colors"
                    value={searchSantriInModal} onChange={e => setSearchSantriInModal(e.target.value)}
                  />
                  {filteredSantriForModal.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-50 overflow-hidden">
                      {filteredSantriForModal.map(s => (
                        <div key={s.id} onClick={() => { setSelectedSantri(s); setSearchSantriInModal("") }} className="flex items-center justify-between px-4 py-2.5 hover:bg-sky-50 cursor-pointer border-b border-slate-50">
                          <div>
                            <div className="text-xs font-bold uppercase text-slate-800">{s.nama_lengkap}</div>
                            <div className="text-[10px] text-slate-400">NIS: {s.nis || "—"}</div>
                          </div>
                          <span className="text-[9px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">{s.jenjang}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {selectedSantri && (
              <div className="space-y-5">
                {/* Bagian Input Periode & Tanggal Bayar */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <Calendar size={11} className="text-sky-600" /> Tanggal Riil Setor / Bayar
                      </label>
                      <input
                        type="date"
                        value={tanggalBayar}
                        onChange={e => setTanggalBayar(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 border rounded-lg text-xs font-bold bg-white outline-none focus:border-sky-500 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Tahun Pembayaran</label>
                      <select
                        value={selectedTahunBayar}
                        onChange={e => setSelectedTahunBayar(Number(e.target.value))}
                        disabled={!hasBulan}
                        className="w-full mt-1 text-xs font-bold border rounded-lg px-3 py-1.5 bg-white disabled:opacity-50 outline-none"
                      >
                        {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                        Pilih Bulan <span className="normal-case font-semibold text-slate-400">(opsional)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setSelectedBulan(null)}
                        className={cn(
                          "inline-flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border transition-colors",
                          !hasBulan ? "bg-amber-500 text-white border-amber-600" : "bg-white text-slate-500 hover:bg-amber-50"
                        )}
                      >
                        <CalendarOff size={10} /> Tanpa Bulan
                      </button>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                      {BULAN_NAMES.map((b, i) => {
                        const bulanNumber = i + 1
                        const isSelected = selectedBulan === bulanNumber
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => toggleBulan(bulanNumber)}
                            className={cn(
                              "py-1.5 rounded-lg text-[10px] font-bold border transition-colors",
                              isSelected ? "bg-sky-700 text-white border-sky-800 shadow-inner" : "bg-white text-slate-500 hover:bg-sky-50"
                            )}
                          >
                            {b.slice(0, 3)}
                          </button>
                        )
                      })}
                    </div>
                    <p className={cn(
                      "text-[9px] mt-2 flex items-start gap-1.5 leading-snug",
                      hasBulan ? "text-slate-400" : "text-amber-700"
                    )}>
                      <Info size={11} className="shrink-0 mt-px" />
                      {hasBulan
                        ? "Satu bulan bisa diinput berkali-kali (cicilan). Klik bulan terpilih untuk membatalkan."
                        : "Tanpa bulan hanya untuk Pembayaran Lainnya. Syahriah dapur/pesantren/sekolah tetap wajib memilih bulan."}
                    </p>
                  </div>
                </div>

                {/* Bagian Input Nominal Syahriah */}
                <div className="space-y-3">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Syahriah {hasBulan && <span className="text-sky-600">· {BULAN_NAMES[(selectedBulan as number) - 1]} {selectedTahunBayar}</span>}
                  </div>
                  {isPaketTunggal ? (
                    <div className="grid grid-cols-2 gap-3">
                      {renderSyahriahInput("Nominal Total (Iuran)", kategoriPaketTunggal, "nominal_total")}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {renderSyahriahInput("Dapur", "dapur", "nominal_dapur")}
                      {renderSyahriahInput("Pesantren", "pesantren", "nominal_pesantren")}
                      {renderSyahriahInput("Sekolah", "sekolah", "nominal_sekolah")}
                    </div>
                  )}
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Catatan Syahriah</label>
                    <input
                      type="text"
                      disabled={!hasBulan}
                      value={catatan}
                      onChange={e => setCatatan(e.target.value)}
                      className="w-full px-4 py-2.5 border rounded-xl text-xs focus:border-sky-500 outline-none disabled:bg-slate-100"
                      placeholder="Opsional, misal: dititipkan wali, transfer, dll."
                    />
                  </div>
                </div>

                {/* Bagian Pembayaran Lainnya */}
                <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[10px] font-black text-amber-700 uppercase tracking-wider">Pembayaran Lainnya</div>
                    <span className="text-[9px] text-amber-700/80 text-right">Dicatat periode: <b>{periodeLainnya}</b></span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-amber-600 uppercase tracking-wider">Nominal</label>
                      <input
                        type="number"
                        min={0}
                        value={nominals.nominal_lainnya}
                        onChange={e => setNominal("nominal_lainnya", e.target.value)}
                        className="w-full px-3 py-2 border border-amber-200 bg-white rounded-xl text-xs focus:border-amber-500 outline-none"
                        placeholder="Rp"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[9px] font-black text-amber-600 uppercase tracking-wider">
                        Keterangan {Number(nominals.nominal_lainnya) > 0 && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={keteranganLainnya}
                        onChange={e => setKeteranganLainnya(e.target.value)}
                        className="w-full px-3 py-2 border border-amber-200 bg-white rounded-xl text-xs focus:border-amber-500 outline-none"
                        placeholder="Misal: seragam, buku, kitab, daftar ulang..."
                      />
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full bg-sky-700 hover:bg-sky-800 disabled:opacity-60 text-white font-black text-xs uppercase py-3 rounded-xl flex justify-center items-center gap-2 transition-colors">
                  {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : "Simpan Pembayaran"}
                </button>

                {/* Riwayat singkat */}
                <div className="border-t pt-4">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">5 Transaksi Terakhir</div>
                  {loadingHistory ? (
                    <div className="flex justify-center py-3"><Loader2 size={14} className="animate-spin text-slate-400" /></div>
                  ) : riwayatTerakhir.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">Belum ada transaksi.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {riwayatTerakhir.map(t => (
                        <li key={t.id} className="flex items-center justify-between py-1.5 text-[10px]">
                          <div className="min-w-0">
                            <span className="font-bold text-slate-700">{getKategoriLabel(t.kategori)}</span>
                            <span className="text-slate-400"> · {t.kategori === "lainnya" ? (t.keterangan || "-") : `${BULAN_NAMES[t.bulan - 1]} ${t.tahun}`}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-slate-400">{t.created_at ? new Date(t.created_at).toLocaleDateString("id-ID") : ""}</span>
                            <span className="font-bold text-slate-800">{formatRupiah(t.jumlah_bayar)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>

      </div>
    </div>
  )
}