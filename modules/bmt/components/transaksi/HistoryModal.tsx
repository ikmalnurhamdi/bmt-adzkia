"use client"

import { useState, useMemo, useEffect } from "react"
import { X, History, Loader2, Calendar, Wallet, Receipt, CheckCircle2, Clock, Printer, Pencil } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import Swal from "sweetalert2"
import { cn } from "@/lib/utils"
import {
  BULAN_NAMES, YEAR_OPTIONS, getTargetDinamis, getKategoriLabel, isSyahriah, formatRupiah,
  cetakRiwayatTahunanPDF, RiwayatCetakRow,
} from "@/modules/bmt/lib/transactionHelpers"

interface HistoryModalProps {
  isOpen: boolean
  onClose: () => void
  santriList: any[]
  masterTarif: any[]
  onUpdate?: () => void
}

type StatusTone = "lunas" | "cicilan" | "info"

interface RiwayatItem {
  id: string
  bulan: number
  kategori: string
  jumlah: number
  tanggal: Date | null
  judul: string
  deskripsi: string
  status: string
  tone: StatusTone
}

const KATEGORI_STYLE: Record<string, string> = {
  dapur: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pesantren: "bg-sky-50 text-sky-700 border-sky-200",
  sekolah: "bg-violet-50 text-violet-700 border-violet-200",
  lainnya: "bg-amber-50 text-amber-700 border-amber-200",
}

const TONE_STYLE: Record<StatusTone, string> = {
  lunas: "text-emerald-600",
  cicilan: "text-orange-600",
  info: "text-slate-500",
}

export default function HistoryModal({ isOpen, onClose, santriList, masterTarif, onUpdate }: HistoryModalProps) {
  const [searchSantri, setSearchSantri] = useState("")
  const [selectedSantri, setSelectedSantri] = useState<any | null>(null)
  const [selectedTahun, setSelectedTahun] = useState(new Date().getFullYear())
  const [filterKategori, setFilterKategori] = useState<string>("semua")
  const [pembayaranHistory, setPembayaranHistory] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)

  // Ambil riwayat pembayaran ketika santri atau tahun diubah
  useEffect(() => {
    setFilterKategori("semua")
    if (selectedSantri) {
      fetchHistory()
    } else {
      setPembayaranHistory([])
    }
  }, [selectedSantri, selectedTahun])

  async function fetchHistory() {
    setIsLoadingHistory(true)
    const { data } = await getSupabase()
      .from("transaksi_pembayaran_v2")
      .select("*")
      .eq("santri_id", selectedSantri.id)
      .eq("tahun", selectedTahun)
      .gt("jumlah_bayar", 0) // hanya transaksi yang benar-benar dibayarkan
      .order("created_at", { ascending: true })
    setPembayaranHistory(data || [])
    setIsLoadingHistory(false)
  }

  const filteredSantri = useMemo(() => {
    if (!searchSantri) return []
    return santriList.filter(s =>
      s.nama_lengkap.toLowerCase().includes(searchSantri.toLowerCase()) ||
      (s.nis && s.nis.toString().includes(searchSantri))
    ).slice(0, 5)
  }, [santriList, searchSantri])

  /**
   * Ubah transaksi mentah menjadi riwayat yang mudah dibaca.
   * Syahriah: dihitung kumulatif per bulan+kategori → "Bayar penuh", "Cicilan ke-n · sisa", atau "Pelunasan".
   * Lainnya : tampilkan keterangan yang diinput admin.
   */
  const riwayat = useMemo<RiwayatItem[]>(() => {
    if (!selectedSantri) return []
    const kumulatif = new Map<string, { total: number; ke: number }>()

    return pembayaranHistory.map(p => {
      const periode = `${BULAN_NAMES[p.bulan - 1] ?? "-"} ${p.tahun}`
      const tanggal = p.created_at ? new Date(p.created_at) : null
      const base = { id: p.id, bulan: p.bulan, kategori: p.kategori, jumlah: p.jumlah_bayar, tanggal }

      if (!isSyahriah(p.kategori)) {
        return {
          ...base,
          judul: p.keterangan?.trim() || getKategoriLabel(p.kategori),
          deskripsi: `${getKategoriLabel(p.kategori)} · dicatat periode ${periode}`,
          status: "Dibayar",
          tone: "info" as StatusTone,
        }
      }

      const key = `${p.bulan}-${p.kategori}`
      const prev = kumulatif.get(key) || { total: 0, ke: 0 }
      const now = { total: prev.total + p.jumlah_bayar, ke: prev.ke + 1 }
      kumulatif.set(key, now)

      const target = getTargetDinamis(selectedSantri, p.kategori, masterTarif)
      let status: string
      let tone: StatusTone

      if (target <= 0) {
        status = "Pembayaran tercatat"
        tone = "info"
      } else if (prev.total >= target) {
        status = "Pembayaran tambahan (bulan ini sudah lunas)"
        tone = "info"
      } else if (now.total >= target) {
        status = now.ke === 1 ? "Lunas · bayar penuh" : `Lunas · pelunasan cicilan ke-${now.ke}`
        tone = "lunas"
      } else {
        status = `Cicilan ke-${now.ke} · sisa ${formatRupiah(target - now.total)}`
        tone = "cicilan"
      }

      return {
        ...base,
        judul: `${getKategoriLabel(p.kategori)} bulan ${periode}`,
        deskripsi: p.keterangan?.trim() ? `Catatan: ${p.keterangan.trim()}` : "",
        status,
        tone,
      }
    })
  }, [pembayaranHistory, selectedSantri, masterTarif])

  const kategoriTersedia = useMemo(() => {
    const counts = new Map<string, number>()
    riwayat.forEach(r => counts.set(r.kategori, (counts.get(r.kategori) || 0) + 1))
    const order = ["dapur", "pesantren", "sekolah", "lainnya"]
    return Array.from(counts.entries()).sort((a, b) => {
      const ia = order.indexOf(a[0]); const ib = order.indexOf(b[0])
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
  }, [riwayat])

  const riwayatTampil = useMemo(
    () => (filterKategori === "semua" ? riwayat : riwayat.filter(r => r.kategori === filterKategori)),
    [riwayat, filterKategori]
  )

  const groupedByBulan = useMemo(() => {
    const groups = new Map<number, RiwayatItem[]>()
    riwayatTampil.forEach(r => {
      if (!groups.has(r.bulan)) groups.set(r.bulan, [])
      groups.get(r.bulan)!.push(r)
    })
    return Array.from(groups.entries()).sort((a, b) => a[0] - b[0])
  }, [riwayatTampil])

  const ringkasan = useMemo(() => {
    const total = riwayat.reduce((a, r) => a + r.jumlah, 0)
    const syahriah = riwayat.filter(r => isSyahriah(r.kategori)).reduce((a, r) => a + r.jumlah, 0)
    return { total, syahriah, lainnya: total - syahriah, jumlah: riwayat.length }
  }, [riwayat])

  const handleCetakPDF = () => {
    if (!selectedSantri || riwayat.length === 0) return
    setIsPrinting(true)
    try {
      const rows: RiwayatCetakRow[] = riwayat.map(r => {
        let ket = r.status
        if (!isSyahriah(r.kategori)) {
          ket = r.judul || "-"
        } else if (r.deskripsi) {
          ket = `${r.status} (${r.deskripsi})`
        }
        return {
          tanggal: r.tanggal,
          bulan: r.bulan,
          tahun: selectedTahun,
          kategori: r.kategori,
          keterangan: ket,
          jumlah: r.jumlah,
        }
      })
      cetakRiwayatTahunanPDF(selectedSantri, selectedTahun, rows)
    } catch (err: any) {
      console.error("Gagal mencetak PDF riwayat tahunan:", err)
    } finally {
      setIsPrinting(false)
    }
  }

  const handleUbahTanggal = async (r: RiwayatItem) => {
    const tglAwal = r.tanggal
      ? `${r.tanggal.getFullYear()}-${String(r.tanggal.getMonth() + 1).padStart(2, "0")}-${String(r.tanggal.getDate()).padStart(2, "0")}`
      : new Date().toISOString().slice(0, 10)

    const { value: newDate } = await Swal.fire({
      title: "Ubah Tanggal Bayar",
      html: `
        <div style="font-size: 13px; color: #475569; margin-bottom: 12px; text-align: left;">
          Pilih tanggal riil saat uang disetorkan/diterima untuk transaksi:<br>
          <span style="font-weight: bold; color: #0f172a;">${r.judul}</span> (${formatRupiah(r.jumlah)})
        </div>
        <input type="date" id="swal-date" class="swal2-input" style="font-size: 14px; margin: 0 auto; width: 85%; display: block;" value="${tglAwal}" />
      `,
      showCancelButton: true,
      confirmButtonText: "Simpan Perubahan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#0284c7",
      cancelButtonColor: "#94a3b8",
      focusConfirm: false,
      preConfirm: () => {
        const input = document.getElementById("swal-date") as HTMLInputElement
        if (!input?.value) {
          Swal.showValidationMessage("Pilih tanggal terlebih dahulu")
          return false
        }
        return input.value
      },
    })

    if (newDate) {
      try {
        const timestamp = new Date(`${newDate}T12:00:00`).toISOString()
        const { error } = await getSupabase()
          .from("transaksi_pembayaran_v2")
          .update({ created_at: timestamp })
          .eq("id", r.id)

        if (error) throw error

        Swal.fire({
          icon: "success",
          title: "Tanggal bayar berhasil diubah",
          timer: 1200,
          showConfirmButton: false,
        })
        fetchHistory()
        onUpdate?.()
      } catch (err: any) {
        Swal.fire("Gagal", err.message, "error")
      }
    }
  }

  const handleUbahTanggalBatch = async (items: RiwayatItem[], bulan: number) => {
    const tglAwal = items[0]?.tanggal
      ? `${items[0].tanggal.getFullYear()}-${String(items[0].tanggal.getMonth() + 1).padStart(2, "0")}-${String(items[0].tanggal.getDate()).padStart(2, "0")}`
      : new Date().toISOString().slice(0, 10)

    const { value: newDate } = await Swal.fire({
      title: "Ubah Tanggal Transaksi",
      html: `
        <div style="font-size: 13px; color: #475569; margin-bottom: 12px; text-align: left;">
          Sesuaikan tanggal riil untuk <b>semua (${items.length}) transaksi</b> di bulan <b>${BULAN_NAMES[bulan - 1]} ${selectedTahun}</b>:
        </div>
        <input type="date" id="swal-batch-date" class="swal2-input" style="font-size: 14px; margin: 0 auto; width: 85%; display: block;" value="${tglAwal}" />
      `,
      showCancelButton: true,
      confirmButtonText: "Simpan Semua",
      cancelButtonText: "Batal",
      confirmButtonColor: "#0284c7",
      cancelButtonColor: "#94a3b8",
      focusConfirm: false,
      preConfirm: () => {
        const input = document.getElementById("swal-batch-date") as HTMLInputElement
        if (!input?.value) {
          Swal.showValidationMessage("Pilih tanggal terlebih dahulu")
          return false
        }
        return input.value
      },
    })

    if (newDate) {
      try {
        const timestamp = new Date(`${newDate}T12:00:00`).toISOString()
        const ids = items.map(x => x.id)
        const { error } = await getSupabase()
          .from("transaksi_pembayaran_v2")
          .update({ created_at: timestamp })
          .in("id", ids)

        if (error) throw error

        Swal.fire({
          icon: "success",
          title: `${ids.length} transaksi berhasil diperbarui`,
          timer: 1200,
          showConfirmButton: false,
        })
        fetchHistory()
        onUpdate?.()
      } catch (err: any) {
        Swal.fire("Gagal", err.message, "error")
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 relative z-10 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header Modal */}
        <div className="bg-slate-800 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <History size={18} className="text-sky-400" />
            <h2 className="text-sm font-black uppercase tracking-wide">Riwayat Transaksi Tahunan</h2>
          </div>
          <div className="flex items-center gap-2">
            {selectedSantri && riwayat.length > 0 && (
              <button
                type="button"
                onClick={handleCetakPDF}
                disabled={isPrinting}
                className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                title="Cetak PDF tabel A4 format Word"
              >
                {isPrinting ? <Loader2 size={13} className="animate-spin" /> : <Printer size={13} />}
                <span>Cetak PDF (A4)</span>
              </button>
            )}
            <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Konten Utama */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* Baris Pencarian & Pilih Tahun */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2 space-y-1.5 relative">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Cari Santri</label>
              {selectedSantri ? (
                <div className="flex items-center justify-between bg-slate-50 border rounded-xl px-4 py-2">
                  <div>
                    <div className="text-xs font-black uppercase text-slate-800">{selectedSantri.nama_lengkap}</div>
                    <div className="text-[10px] text-sky-600 font-semibold mt-0.5">{selectedSantri.jenjang} · Kelas {selectedSantri.kelas}</div>
                  </div>
                  <button type="button" onClick={() => setSelectedSantri(null)} className="text-xs font-bold text-red-500 hover:bg-red-50 px-2.5 py-1 rounded-lg">Ganti</button>
                </div>
              ) : (
                <>
                  <input
                    type="text" placeholder="Ketik nama atau NIS santri..."
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none bg-slate-50 focus:border-slate-400"
                    value={searchSantri} onChange={e => setSearchSantri(e.target.value)}
                  />
                  {filteredSantri.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-50 overflow-hidden">
                      {filteredSantri.map(s => (
                        <div key={s.id} onClick={() => { setSelectedSantri(s); setSearchSantri("") }} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-50">
                          <div>
                            <div className="text-xs font-bold uppercase text-slate-800">{s.nama_lengkap}</div>
                            <div className="text-[10px] text-slate-400">NIS: {s.nis || "—"}</div>
                          </div>
                          <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{s.jenjang}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Tahun Riwayat</label>
              <select
                value={selectedTahun}
                onChange={e => setSelectedTahun(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 outline-none"
              >
                {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {!selectedSantri ? (
            <div className="py-16 border border-dashed rounded-xl flex flex-col items-center justify-center text-slate-400 bg-slate-50">
              <Calendar size={32} className="text-slate-300 mb-2" />
              <p className="text-xs font-semibold">Silakan pilih santri terlebih dahulu untuk melihat riwayat transaksi</p>
            </div>
          ) : isLoadingHistory ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="animate-spin text-slate-600" size={24} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Menyusun Riwayat Tahunan...</span>
            </div>
          ) : riwayat.length === 0 ? (
            <div className="py-16 border border-dashed rounded-xl flex flex-col items-center justify-center text-slate-400 bg-slate-50">
              <Receipt size={32} className="text-slate-300 mb-2" />
              <p className="text-xs font-semibold">Belum ada transaksi yang dibayarkan pada tahun {selectedTahun}</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Ringkasan */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-800 text-white rounded-xl p-3">
                  <div className="text-[9px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1"><Wallet size={10} /> Total Dibayar</div>
                  <div className="text-sm font-black mt-1">{formatRupiah(ringkasan.total)}</div>
                </div>
                <div className="bg-slate-50 border rounded-xl p-3">
                  <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Jumlah Transaksi</div>
                  <div className="text-sm font-black text-slate-800 mt-1">{ringkasan.jumlah}x</div>
                </div>
                <div className="bg-sky-50 border border-sky-100 rounded-xl p-3">
                  <div className="text-[9px] font-black uppercase tracking-wider text-sky-600">Syahriah</div>
                  <div className="text-sm font-black text-sky-800 mt-1">{formatRupiah(ringkasan.syahriah)}</div>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <div className="text-[9px] font-black uppercase tracking-wider text-amber-600">Lainnya</div>
                  <div className="text-sm font-black text-amber-800 mt-1">{formatRupiah(ringkasan.lainnya)}</div>
                </div>
              </div>

              {/* Filter kategori dinamis & Tombol Cetak */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFilterKategori("semua")}
                    className={cn(
                      "text-[10px] font-bold px-3 py-1 rounded-full border transition-colors",
                      filterKategori === "semua" ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    Semua ({riwayat.length})
                  </button>
                  {kategoriTersedia.map(([kat, count]) => (
                    <button
                      key={kat}
                      type="button"
                      onClick={() => setFilterKategori(kat)}
                      className={cn(
                        "text-[10px] font-bold px-3 py-1 rounded-full border transition-colors",
                        filterKategori === kat ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      {getKategoriLabel(kat)} ({count})
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleCetakPDF}
                  disabled={isPrinting}
                  className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                >
                  {isPrinting ? <Loader2 size={13} className="animate-spin" /> : <Printer size={13} />}
                  <span>Cetak PDF (A4)</span>
                </button>
              </div>

              {/* Daftar riwayat per bulan */}
              <div className="space-y-4">
                {groupedByBulan.map(([bulan, items]) => {
                  const subtotal = items.reduce((a, r) => a + r.jumlah, 0)
                  return (
                    <section key={bulan} className="border rounded-xl overflow-hidden shadow-sm">
                      <header className="bg-slate-100 px-4 py-2.5 flex items-center justify-between">
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                          {BULAN_NAMES[bulan - 1]} {selectedTahun}
                          <span className="ml-2 font-semibold normal-case text-slate-400">{items.length} transaksi</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleUbahTanggalBatch(items, bulan)}
                              className="inline-flex items-center gap-1 text-[9px] font-bold text-sky-700 hover:text-sky-900 bg-white hover:bg-sky-50 px-2 py-0.5 rounded-md border border-slate-200 transition-colors shadow-2xs"
                              title="Ubah tanggal untuk semua transaksi di bulan ini sekaligus"
                            >
                              <Pencil size={9} /> Set Tanggal Semua
                            </button>
                          )}
                          <div className="text-[11px] font-black text-slate-700">{formatRupiah(subtotal)}</div>
                        </div>
                      </header>
                      <ul className="divide-y">
                        {items.map(r => (
                          <li key={r.id} className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50/60">
                            <span className={cn(
                              "shrink-0 mt-0.5 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border",
                              KATEGORI_STYLE[r.kategori] || "bg-slate-50 text-slate-600 border-slate-200"
                            )}>
                              {isSyahriah(r.kategori) ? r.kategori : "lainnya"}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-slate-800 break-words">{r.judul}</div>
                              {r.deskripsi && <div className="text-[10px] text-slate-500 mt-0.5 break-words">{r.deskripsi}</div>}
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-[10px]">
                                <span className={cn("inline-flex items-center gap-1 font-bold", TONE_STYLE[r.tone])}>
                                  {r.tone === "cicilan" ? <Clock size={10} /> : <CheckCircle2 size={10} />}
                                  {r.status}
                                </span>
                                {r.tanggal && (
                                  <span className="text-slate-500 font-medium">
                                    Dibayar {r.tanggal.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleUbahTanggal(r)}
                                  className="inline-flex items-center gap-1 text-[9px] font-bold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 px-1.5 py-0.5 rounded border border-sky-200 transition-colors"
                                  title="Ubah tanggal riil transaksi ini"
                                >
                                  <Pencil size={9} /> Ubah Tanggal
                                </button>
                              </div>
                            </div>
                            <div className="shrink-0 text-xs font-black text-slate-800">{formatRupiah(r.jumlah)}</div>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}