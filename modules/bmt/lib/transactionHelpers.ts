import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import QRCode from "qrcode"

export const BULAN_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
]

export const CURRENT_YEAR = new Date().getFullYear()
export const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 2019 }, (_, i) => 2020 + i)

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

export const cetakKwitansiPDF = async (s: any, filterBulan: number, filterTahun: number, pembayaranList: any[], masterTarif: any[]) => {
  const doc = new jsPDF('p', 'mm', [105, 148])
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const centerX = pageWidth / 2

  const categories = ["dapur", "pesantren", "sekolah"]
  const detailBayar = categories.map(cat => {
    const target = getTargetDinamis(s, cat, masterTarif)
    const terbayar = pembayaranList.filter(p => p.santri_id === s.id && p.kategori === cat).reduce((a, b) => a + b.jumlah_bayar, 0)
    return {
      nama: cat === 'dapur' ? "Syahriah Dapur" : cat === 'pesantren' ? "Syahriah Pesantren" : "Syahriah Sekolah",
      terbayar, target,
      sisa: Math.max(0, target - terbayar),
      isLunas: terbayar >= target || target === 0
    }
  }).filter(d => d.terbayar > 0 || d.target > 0)

  const totalTerbayar = detailBayar.reduce((a, b) => a + b.terbayar, 0)
  const qrText = `VAL-BMT ADZKIA: ${s.nama_lengkap} | Rp ${totalTerbayar.toLocaleString()} | ${BULAN_NAMES[filterBulan - 1]} ${filterTahun}`
  const qrDataUrl = await QRCode.toDataURL(qrText)

  doc.setFont("helvetica", "bold").setFontSize(11)
  doc.text("PONPES AL-HIDAYAH CISADAP", centerX, 12, { align: "center" })
  doc.setFontSize(7).setFont("helvetica", "normal")
  doc.text("Jl. Cisadap No. 01, Kec. Ciamis, Kab. Ciamis, Jawa Barat", centerX, 16, { align: "center" })
  doc.line(10, 19, pageWidth - 10, 19)
  doc.setFont("helvetica", "bold").text("BUKTI PEMBAYARAN SYAHRIAH", centerX, 26, { align: "center" })

  doc.setFontSize(8).setFont("helvetica", "normal")
  doc.text(`TANGGAL : ${new Date().toLocaleDateString('id-ID')}`, 10, 34)
  doc.text(`NAMA       : ${s.nama_lengkap.toUpperCase()}`, 10, 38)
  doc.text(`KELAS      : ${s.jenjang} - ${s.kelas}`, 10, 42)
  doc.text(`PERIODE  : ${BULAN_NAMES[filterBulan - 1]} ${filterTahun}`, 10, 46)

  autoTable(doc, {
    startY: 50,
    head: [['Jenis Iuran', 'Jumlah Bayar', 'Keterangan']],
    body: detailBayar.map(d => [d.nama, `Rp ${d.terbayar.toLocaleString()}`, d.isLunas ? 'LUNAS' : `SISA: Rp ${d.sisa.toLocaleString()}`]),
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