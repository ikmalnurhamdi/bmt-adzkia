import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import QRCode from "qrcode"

export const BULAN_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
]

export const CURRENT_YEAR = new Date().getFullYear()
export const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 2019 }, (_, i) => 2020 + i)

/** Kategori iuran rutin bulanan (wajib terikat bulan karena dipakai perhitungan tunggakan). */
export const SYAHRIAH_KATEGORI = ["dapur", "pesantren", "sekolah"] as const

export const KATEGORI_LABEL: Record<string, string> = {
  dapur: "Syahriah Dapur",
  pesantren: "Syahriah Pesantren",
  sekolah: "Syahriah Sekolah",
  lainnya: "Pembayaran Lainnya",
}

export const isSyahriah = (kategori: string) => (SYAHRIAH_KATEGORI as readonly string[]).includes(kategori)

export const getKategoriLabel = (kategori: string) =>
  KATEGORI_LABEL[kategori] || (kategori ? kategori.charAt(0).toUpperCase() + kategori.slice(1) : "Pembayaran")

export const formatRupiah = (n: number) => `Rp ${(Number(n) || 0).toLocaleString("id-ID")}`

export const getTargetDinamis = (santri: any, kategori: string, masterTarif: any[]) => {
  if (!santri || masterTarif.length === 0) return 0
  const k = santri.jenjang
  const getNominal = (komp: string) => masterTarif.find(t => t.komponen === komp)?.nominal || 0

  if (k === "MTS PLUS") {
    if (kategori === 'dapur') return getNominal("dapur_mts")
    if (kategori === 'pesantren') return getNominal("pesantren_mts")
    if (kategori === 'sekolah') return getNominal("sekolah_mts")
  } else if (k === "MTS PLUS REVISI") {
    if (kategori === 'dapur') return getNominal("dapur_mts_revisi")
    if (kategori === 'pesantren') return getNominal("pesantren_mts_revisi")
    if (kategori === 'sekolah') return getNominal("sekolah_mts_revisi")
  } else if (k === "MA PLUS") {
    if (kategori === 'dapur') return getNominal("dapur_ma")
    if (kategori === 'pesantren') return getNominal("pesantren_ma")
    if (kategori === 'sekolah') return getNominal("sekolah_ma")
  } else if (k === "MA PLUS REVISI") {
    if (kategori === 'dapur') return getNominal("dapur_ma_revisi")
    if (kategori === 'pesantren') return getNominal("pesantren_ma_revisi")
    if (kategori === 'sekolah') return getNominal("sekolah_ma_revisi")
  } else if (k === "TAKHOSUS/KULIAH") {
    if (kategori === 'dapur') return getNominal("dapur_takhosus")
    if (kategori === 'pesantren') return getNominal("pesantren_takhosus")
  } else if (k === "PENGABDIAN") {
    if (kategori === 'pesantren') return getNominal("pesantren_pengabdian")
  } else if (k === "MTS SAJA" || k === "MA SAJA") {
    if (kategori === 'sekolah') return getNominal(k)
  } else if (k === "SANTRI NON MUKIM") {
    if (kategori === 'pesantren') return getNominal(k)
  }
  return 0
}

export interface SantriRekapInput {
  jenjang?: string | null
  tanggal_masuk?: string | null
  tanggal_mulai_tagihan?: string | null
}

export interface TransaksiRekapInput {
  kategori?: string | null
  bulan?: number | string | null
  tahun?: number | string | null
  jumlah_bayar?: number | string | null
}

export interface TarifItem {
  komponen?: string | null
  nominal?: number | null
}

export interface RekapPeriodeFilter {
  bulan?: number | "semua"
  tahun?: number | "semua"
}

export interface RekapTransaksiSantri {
  totalPembayaran: number
  totalPembayaranSyahriah: number
  totalPembayaranLainnya: number
  jumlahBulan: number
  bulanMenunggak: number
  totalTargetBulanan: number
  totalKewajiban: number
  totalTunggakan: number
  totalLebihBayar: number
  sisaPerKategori: {
    dapur: number
    pesantren: number
    sekolah: number
  }
  belumWajibBayar: boolean
  statusLunas: boolean
}

const parseYearMonth = (dateStr?: string | null): { year: number; month: number } | null => {
  if (!dateStr) return null
  const match = String(dateStr).match(/^(\d{4})-(\d{2})/)
  if (match) {
    const year = Number(match[1])
    const month = Number(match[2])
    if (year > 0 && month >= 1 && month <= 12) return { year, month }
  }
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

/**
 * Menghitung rekap kewajiban & tunggakan bulanan seorang santri.
 * - Default (tanpa filter bulan/tahun): menghitung keseluruhan transaksi & akumulasi bulan wajib s/d bulan berjalan.
 * - Dengan filter bulan & tahun: menghitung transaksi, kewajiban, dan tunggakan khusus untuk periode yang dipilih.
 * - Kewajiban bulanan hanya berasal dari 3 kategori syahriah wajib: dapur, pesantren, sekolah.
 * - Tunggakan dihitung per bulan aktif dan per kategori wajib (tidak saling menutup antar kategori/bulan).
 * - Pembayaran kategori "lainnya" (di luar syahriah) TIDAK mempengaruhi kewajiban, tunggakan, atau lebih bayar bulanan.
 */
export const hitungRekapTransaksiSantri = (
  santri: SantriRekapInput | null | undefined,
  transaksiSantri: TransaksiRekapInput[],
  masterTarif: TarifItem[],
  referenceDate: Date = new Date(),
  filter?: RekapPeriodeFilter
): RekapTransaksiSantri | null => {
  if (!santri) return null

  const filterTahun = filter?.tahun && filter.tahun !== "semua" ? Number(filter.tahun) : null
  const filterBulan = filter?.bulan && filter.bulan !== "semua" ? Number(filter.bulan) : null

  const targetPerKategori: Record<(typeof SYAHRIAH_KATEGORI)[number], number> = {
    dapur: getTargetDinamis(santri, "dapur", masterTarif),
    pesantren: getTargetDinamis(santri, "pesantren", masterTarif),
    sekolah: getTargetDinamis(santri, "sekolah", masterTarif),
  }
  const totalTargetBulanan = targetPerKategori.dapur + targetPerKategori.pesantren + targetPerKategori.sekolah

  // Saring transaksi sesuai filter periode (jika dipilih)
  const scopedTransaksi = transaksiSantri.filter(trx => {
    const tahun = Number(trx?.tahun)
    const bulan = Number(trx?.bulan)
    if (filterTahun !== null && tahun !== filterTahun) return false
    if (filterBulan !== null && bulan !== filterBulan) return false
    return true
  })

  // Pisahkan total pembayaran syahriah vs lainnya dan agregasi syahriah per (tahun, bulan, kategori)
  let totalPembayaranSyahriah = 0
  let totalPembayaranLainnya = 0
  const syahriahMap = new Map<string, number>()

  for (const trx of scopedTransaksi) {
    const jumlah = Number(trx?.jumlah_bayar) || 0
    const kat = String(trx?.kategori || "").toLowerCase()
    if (isSyahriah(kat)) {
      totalPembayaranSyahriah += jumlah
      const tahun = Number(trx?.tahun)
      const bulan = Number(trx?.bulan)
      if (tahun > 0 && bulan >= 1 && bulan <= 12) {
        const key = `${tahun}-${bulan}-${kat}`
        syahriahMap.set(key, (syahriahMap.get(key) || 0) + jumlah)
      }
    } else {
      totalPembayaranLainnya += jumlah
    }
  }

  const totalPembayaran = totalPembayaranSyahriah + totalPembayaranLainnya

  // Tentukan daftar bulan wajib bayar sesuai periode yang dipilih
  const startYM = parseYearMonth(santri.tanggal_mulai_tagihan || santri.tanggal_masuk)
  const startIdx = startYM ? startYM.year * 12 + (startYM.month - 1) : null
  const nowIdx = referenceDate.getFullYear() * 12 + referenceDate.getMonth()

  const activeMonths: Array<{ year: number; month: number }> = []
  let belumWajibBayar = false

  if (startIdx !== null) {
    if (filterTahun !== null && filterBulan !== null) {
      // Filter bulan & tahun spesifik
      const selectedIdx = filterTahun * 12 + (filterBulan - 1)
      if (selectedIdx >= startIdx) {
        activeMonths.push({ year: filterTahun, month: filterBulan })
      } else {
        belumWajibBayar = true
      }
    } else if (filterTahun !== null) {
      // Filter tahun spesifik (semua bulan pada tahun tsb yang sudah wajib)
      const yearStartIdx = filterTahun * 12
      const yearEndIdx = filterTahun * 12 + 11
      const effStart = Math.max(startIdx, yearStartIdx)
      const effEnd = Math.min(nowIdx, yearEndIdx)
      if (effEnd >= effStart) {
        for (let idx = effStart; idx <= effEnd; idx++) {
          activeMonths.push({ year: Math.floor(idx / 12), month: (idx % 12) + 1 })
        }
      } else if (yearEndIdx < startIdx) {
        belumWajibBayar = true
      }
    } else if (filterBulan !== null) {
      // Fallback jika hanya bulan yang diisi
      if (nowIdx >= startIdx) {
        for (let idx = startIdx; idx <= nowIdx; idx++) {
          const month = (idx % 12) + 1
          if (month === filterBulan) {
            activeMonths.push({ year: Math.floor(idx / 12), month })
          }
        }
      }
    } else {
      // Default: semua periode (dari mulai wajib bayar s/d bulan berjalan)
      if (nowIdx >= startIdx) {
        for (let idx = startIdx; idx <= nowIdx; idx++) {
          activeMonths.push({ year: Math.floor(idx / 12), month: (idx % 12) + 1 })
        }
      } else {
        belumWajibBayar = true
      }
    }
  }

  let bulanMenunggak = 0
  let totalTunggakan = 0
  let totalLebihBayar = 0
  const sisaPerKategori = { dapur: 0, pesantren: 0, sekolah: 0 }
  const activeKeys = new Set<string>()

  for (const { year: th, month: bl } of activeMonths) {
    let tunggakanBulanIni = 0

    for (const kat of SYAHRIAH_KATEGORI) {
      const key = `${th}-${bl}-${kat}`
      activeKeys.add(key)
      const target = targetPerKategori[kat]
      const bayar = syahriahMap.get(key) || 0
      const sisa = Math.max(0, target - bayar)
      const lebih = Math.max(0, bayar - target)

      sisaPerKategori[kat] += sisa
      tunggakanBulanIni += sisa
      totalTunggakan += sisa
      totalLebihBayar += lebih
    }

    if (tunggakanBulanIni > 0) {
      bulanMenunggak += 1
    }
  }

  // Pembayaran syahriah untuk bulan di luar periode wajib (misalnya bayar bulan depan di muka)
  // dicatat sebagai lebih bayar syahriah tanpa mengurangi tunggakan bulan wajib sebelumnya.
  for (const [key, bayar] of syahriahMap.entries()) {
    if (!activeKeys.has(key) && bayar > 0) {
      totalLebihBayar += bayar
    }
  }

  const jumlahBulan = activeMonths.length
  const totalKewajiban = totalTargetBulanan * jumlahBulan

  return {
    totalPembayaran,
    totalPembayaranSyahriah,
    totalPembayaranLainnya,
    jumlahBulan,
    bulanMenunggak,
    totalTargetBulanan,
    totalKewajiban,
    totalTunggakan,
    totalLebihBayar,
    sisaPerKategori,
    belumWajibBayar,
    statusLunas: totalKewajiban > 0 && totalTunggakan === 0,
  }
}

export const cetakKwitansiPDF = async (s: any, filterBulan: number, filterTahun: number, pembayaranList: any[], masterTarif: any[]) => {
  const doc = new jsPDF('p', 'mm', [105, 148])
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const centerX = pageWidth / 2

  const detailSyahriah = SYAHRIAH_KATEGORI.map(cat => {
    const target = getTargetDinamis(s, cat, masterTarif)
    const trx = pembayaranList.filter(p => p.santri_id === s.id && p.kategori === cat)
    const terbayar = trx.reduce((a, b) => a + b.jumlah_bayar, 0)
    const sisa = Math.max(0, target - terbayar)
    const isLunas = terbayar >= target || target === 0
    const cicilan = trx.length > 1 ? ` (${trx.length}x cicilan)` : ""
    return {
      nama: KATEGORI_LABEL[cat],
      terbayar,
      target,
      keterangan: isLunas ? `LUNAS${cicilan}` : `SISA: Rp ${sisa.toLocaleString()}${cicilan}`,
    }
  }).filter(d => d.terbayar > 0 || d.target > 0)

  // Pembayaran di luar syahriah ditampilkan per transaksi beserta keterangannya
  const detailLainnya = pembayaranList
    .filter(p => p.santri_id === s.id && !isSyahriah(p.kategori) && p.jumlah_bayar > 0)
    .map(p => ({
      nama: getKategoriLabel(p.kategori),
      terbayar: p.jumlah_bayar,
      target: 0,
      keterangan: p.keterangan || "-",
    }))

  const detailBayar = [...detailSyahriah, ...detailLainnya]
  const totalTerbayar = detailBayar.reduce((a, b) => a + b.terbayar, 0)
  const qrText = `VAL-BMT ADZKIA: ${s.nama_lengkap} | Rp ${totalTerbayar.toLocaleString()} | ${BULAN_NAMES[filterBulan - 1]} ${filterTahun}`
  const qrDataUrl = await QRCode.toDataURL(qrText)

  doc.setFont("helvetica", "bold").setFontSize(11)
  doc.text("PONPES AL-HIDAYAH CISADAP", centerX, 12, { align: "center" })
  doc.setFontSize(7).setFont("helvetica", "normal")
  doc.text("Jl. Cisadap No. 01, Kec. Ciamis, Kab. Ciamis, Jawa Barat", centerX, 16, { align: "center" })
  doc.line(10, 19, pageWidth - 10, 19)
  doc.setFont("helvetica", "bold").text("BUKTI PEMBAYARAN", centerX, 26, { align: "center" })

  doc.setFontSize(8).setFont("helvetica", "normal")
  doc.text(`TANGGAL : ${new Date().toLocaleDateString('id-ID')}`, 10, 34)
  doc.text(`NAMA       : ${s.nama_lengkap.toUpperCase()}`, 10, 38)
  doc.text(`KELAS      : ${s.jenjang} - ${s.kelas}`, 10, 42)
  doc.text(`PERIODE  : ${BULAN_NAMES[filterBulan - 1]} ${filterTahun}`, 10, 46)

  autoTable(doc, {
    startY: 50,
    head: [['Jenis Iuran', 'Jumlah Bayar', 'Keterangan']],
    body: detailBayar.map(d => [d.nama, `Rp ${d.terbayar.toLocaleString()}`, d.keterangan]),
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
    margin: { left: 10, right: 10 }
  })

  const finalY = (doc as any).lastAutoTable.finalY + 8
  doc.addImage(qrDataUrl, 'PNG', 10, finalY, 20, 20)
  doc.setFontSize(6).setFont("helvetica", "italic").text("Scan untuk validasi data", 10, finalY + 23)
  doc.setFillColor(241, 245, 249).rect(pageWidth - 60, finalY + 25, 50, 12, 'F')
  doc.setFontSize(7).setFont("helvetica", "bold").text("TOTAL DITERIMA:", pageWidth - 57, finalY + 29)
  doc.setFontSize(10).text(`Rp ${totalTerbayar.toLocaleString()}`, pageWidth - 13, finalY + 34, { align: "right" })

  const footerY = pageHeight - 10
  doc.setFontSize(8).setFont("helvetica", "italic").setTextColor(100).text("Jazakumullahu khairan katsiran", centerX, footerY, { align: "center" })
  doc.setFontSize(9).setFont("helvetica", "bold").setTextColor(0).text("BMT ADZKIA", centerX, footerY + 5, { align: "center" })

  doc.save(`Kwitansi_${s.nama_lengkap}_${BULAN_NAMES[filterBulan - 1]}.pdf`)
}

/** Satu baris transaksi untuk cetak riwayat tahunan. */
export interface RiwayatCetakRow {
  tanggal: Date | null
  bulan: number
  tahun: number
  kategori: string
  keterangan: string
  jumlah: number
}

/** 0,5 pt dikonversi ke milimeter (1 pt = 25,4 / 72 mm). */
const GARIS_05PT = (0.5 * 25.4) / 72

/**
 * Cetak riwayat transaksi tahunan santri ke PDF A4 (portrait)
 * berupa tabel sederhana bergaya dokumen Word: garis hitam 0,5 pt, tanpa warna latar.
 */
export const cetakRiwayatTahunanPDF = (santri: any, tahun: number, rows: RiwayatCetakRow[]) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 20
  const centerX = pageWidth / 2

  // ── Kop ──
  doc.setTextColor(0)
  doc.setFont("helvetica", "bold").setFontSize(13)
  doc.text("PONPES AL-HIDAYAH CISADAP", centerX, 18, { align: "center" })
  doc.setFont("helvetica", "normal").setFontSize(9)
  doc.text("BMT ADZKIA · Jl. Cisadap No. 01, Kec. Ciamis, Kab. Ciamis, Jawa Barat", centerX, 23.5, { align: "center" })
  doc.setLineWidth(GARIS_05PT).setDrawColor(0)
  doc.line(marginX, 27, pageWidth - marginX, 27)

  doc.setFont("helvetica", "bold").setFontSize(11)
  doc.text(`RIWAYAT TRANSAKSI SANTRI TAHUN ${tahun}`, centerX, 35, { align: "center" })

  // ── Identitas santri ──
  doc.setFont("helvetica", "normal").setFontSize(9.5)
  const identitas: [string, string][] = [
    ["Nama", String(santri?.nama_lengkap || "-").toUpperCase()],
    ["NIS", String(santri?.nis || "-")],
    ["Jenjang / Kelas", `${santri?.jenjang || "-"} / ${santri?.kelas || "-"}`],
  ]
  identitas.forEach(([label, value], i) => {
    const y = 44 + i * 5.5
    doc.text(label, marginX, y)
    doc.text(`: ${value}`, marginX + 30, y)
  })

  // ── Tabel transaksi ──
  const sorted = [...rows].sort((a, b) =>
    a.bulan - b.bulan || (a.tanggal?.getTime() || 0) - (b.tanggal?.getTime() || 0)
  )
  const total = sorted.reduce((a, r) => a + (r.jumlah || 0), 0)

  const garis = { lineWidth: GARIS_05PT, lineColor: [0, 0, 0] as [number, number, number] }

  autoTable(doc, {
    startY: 62,
    margin: { left: marginX, right: marginX, top: 20, bottom: 20 },
    theme: "grid",
    head: [["No", "Tanggal Bayar", "Periode", "Jenis Pembayaran", "Keterangan", "Jumlah (Rp)"]],
    body: sorted.map((r, i) => [
      String(i + 1),
      r.tanggal ? r.tanggal.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-",
      `${BULAN_NAMES[r.bulan - 1] ?? "-"} ${r.tahun}`,
      getKategoriLabel(r.kategori),
      r.keterangan || "-",
      (r.jumlah || 0).toLocaleString("id-ID"),
    ]),
    foot: [[
      { content: "TOTAL", colSpan: 5, styles: { halign: "right" } },
      { content: total.toLocaleString("id-ID"), styles: { halign: "right" } },
    ]],
    showFoot: "lastPage",
    styles: {
      font: "helvetica",
      fontSize: 9,
      textColor: 0,
      fillColor: false,
      cellPadding: { top: 1.6, bottom: 1.6, left: 2, right: 2 },
      valign: "middle",
      overflow: "linebreak",
      ...garis,
    },
    headStyles: { fontStyle: "bold", halign: "center", fillColor: false, textColor: 0, ...garis },
    footStyles: { fontStyle: "bold", fillColor: false, textColor: 0, ...garis },
    tableLineWidth: GARIS_05PT,
    tableLineColor: [0, 0, 0],
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { halign: "center", cellWidth: 25 },
      2: { cellWidth: 28 },
      3: { cellWidth: 35 },
      4: { cellWidth: "auto" },
      5: { halign: "right", cellWidth: 28 },
    },
  })

  // ── Tanda tangan ──
  let y = (doc as any).lastAutoTable.finalY + 12
  if (y + 35 > pageHeight - 20) {
    doc.addPage()
    y = 30
  }
  const ttdX = pageWidth - marginX - 55
  const tglCetak = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
  doc.setFont("helvetica", "normal").setFontSize(9.5)
  doc.text(`Ciamis, ${tglCetak}`, ttdX, y)
  doc.text("Bendahara BMT ADZKIA,", ttdX, y + 5.5)
  doc.text("(.................................)", ttdX, y + 28)

  // ── Nomor halaman ──
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(0)
    doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - marginX, pageHeight - 10, { align: "right" })
    doc.text(`Dicetak: ${tglCetak}`, marginX, pageHeight - 10)
  }

  const namaFile = String(santri?.nama_lengkap || "Santri").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_")
  doc.save(`Riwayat_Transaksi_${namaFile}_${tahun}.pdf`)
}