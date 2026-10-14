import { getSupabase } from "@/lib/supabase"
import { APP_NAME, SCHOOL_ADDRESS } from "./config"
import { labelPeriode } from "./constants"
import { rupiah, tanggal } from "@/lib/format"
import type { Kategori, Siswa } from "./types"

interface RowKwitansi {
  periode: number
  jumlah_bayar: number
  tanggal_bayar: string
  no_kwitansi: string | null
  keterangan: string | null
  metode: string
  siswa: Pick<Siswa, "nama_lengkap" | "nis" | "kelas" | "tingkat"> | null
  kategori: Pick<Kategori, "nama" | "tipe_tagihan"> | null
  ta: { nama: string } | null
}

/**
 * Cetak kwitansi A6. Seluruh pembayaran dengan nomor kwitansi yang sama dicetak dalam satu lembar.
 * jsPDF dimuat hanya saat tombol cetak ditekan agar halaman tetap ringan.
 */
export async function cetakKwitansi(ref: { id: string; no_kwitansi: string | null }) {
  const q = getSupabase()
    .from("transaksi_pembayaran")
    .select("periode,jumlah_bayar,tanggal_bayar,no_kwitansi,keterangan,metode,siswa(nama_lengkap,nis,kelas,tingkat),kategori:kategori_pembayaran(nama,tipe_tagihan),ta:tahun_ajaran(nama)")
    .order("created_at")
  const { data, error } = ref.no_kwitansi ? await q.eq("no_kwitansi", ref.no_kwitansi) : await q.eq("id", ref.id)
  if (error) throw error
  const rows = (data ?? []) as unknown as RowKwitansi[]
  if (rows.length === 0) throw new Error("Data transaksi tidak ditemukan")

  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")])
  const doc = new jsPDF("p", "mm", [105, 148])
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  const cx = w / 2
  const first = rows[0]
  const total = rows.reduce((a, r) => a + r.jumlah_bayar, 0)

  doc.setFont("helvetica", "bold").setFontSize(12)
  doc.text(APP_NAME, cx, 12, { align: "center" })
  let y = 16
  if (SCHOOL_ADDRESS) {
    doc.setFont("helvetica", "normal").setFontSize(7)
    doc.text(SCHOOL_ADDRESS, cx, y, { align: "center", maxWidth: w - 20 })
    y += 4
  }
  doc.line(10, y, w - 10, y)
  y += 6
  doc.setFont("helvetica", "bold").setFontSize(9)
  doc.text("BUKTI PEMBAYARAN", cx, y, { align: "center" })
  y += 6

  doc.setFont("helvetica", "normal").setFontSize(8)
  const info: [string, string][] = [
    ["No. Kwitansi", first.no_kwitansi ?? "-"],
    ["Tanggal", tanggal(first.tanggal_bayar)],
    ["Nama", (first.siswa?.nama_lengkap ?? "-").toUpperCase()],
    ["NIS / Kelas", `${first.siswa?.nis ?? "-"} / ${first.siswa?.kelas ?? first.siswa?.tingkat ?? "-"}`],
    ["Tahun Ajaran", first.ta?.nama ?? "-"],
  ]
  info.forEach(([k, v]) => {
    doc.text(`${k}`, 10, y)
    doc.text(`: ${v}`, 34, y)
    y += 4.2
  })

  autoTable(doc, {
    startY: y + 1,
    head: [["Pembayaran", "Jumlah"]],
    body: rows.map((r) => {
      const periode = r.kategori ? labelPeriode(r.kategori.tipe_tagihan, r.periode) : ""
      const label = `${r.kategori?.nama ?? "-"}${periode && periode !== "-" ? ` (${periode})` : ""}${r.keterangan ? `\n${r.keterangan}` : ""}`
      return [label, rupiah(r.jumlah_bayar)]
    }),
    theme: "grid",
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [3, 105, 161], textColor: 255 },
    columnStyles: { 1: { halign: "right", cellWidth: 30 } },
    margin: { left: 10, right: 10 },
  })

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
  doc.setFillColor(241, 245, 249).rect(w - 62, finalY, 52, 11, "F")
  doc.setFont("helvetica", "bold").setFontSize(7).text("TOTAL DITERIMA", w - 59, finalY + 4.5)
  doc.setFontSize(10).text(rupiah(total), w - 13, finalY + 9, { align: "right" })

  doc.setFont("helvetica", "normal").setFontSize(7).text(`Metode: ${first.metode}`, 10, finalY + 5)

  doc.setFont("helvetica", "italic").setFontSize(7).setTextColor(100)
  doc.text("Jazakumullahu khairan katsiran", cx, h - 12, { align: "center" })
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(0)
  doc.text(`Bendahara ${APP_NAME}`, cx, h - 7, { align: "center" })

  doc.save(`Kwitansi_${first.siswa?.nama_lengkap ?? "siswa"}_${first.no_kwitansi ?? first.tanggal_bayar}.pdf`)
}
