import { APP_NAME, SCHOOL_ADDRESS } from "./config"

/** Ekspor tabel sederhana ke Excel. Library xlsx dimuat hanya saat dipakai. */
export async function exportExcel(filename: string, sheet: string, head: string[], body: (string | number)[][]) {
  const XLSX = await import("xlsx")
  const ws = XLSX.utils.aoa_to_sheet([head, ...body])
  ws["!cols"] = head.map((h, i) => ({ wch: Math.min(40, Math.max(h.length, ...body.map((r) => String(r[i] ?? "").length)) + 2) }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheet.slice(0, 31))
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

interface PdfOpts {
  filename: string
  title: string
  subtitle?: string
  head: string[]
  body: (string | number)[][]
  foot?: (string | number)[][]
  landscape?: boolean
  rightAlignCols?: number[]
}

/** Ekspor tabel ke PDF A4 dengan kop sekolah. jsPDF dimuat hanya saat dipakai. */
export async function exportPdf(o: PdfOpts) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")])
  const doc = new jsPDF(o.landscape ? "l" : "p", "mm", "a4")
  const w = doc.internal.pageSize.getWidth()

  doc.setFont("helvetica", "bold").setFontSize(15)
  doc.text(APP_NAME, w / 2, 14, { align: "center" })
  let y = 19
  if (SCHOOL_ADDRESS) {
    doc.setFont("helvetica", "normal").setFontSize(9)
    doc.text(SCHOOL_ADDRESS, w / 2, y, { align: "center" })
    y += 5
  }
  doc.setLineWidth(0.4).line(14, y, w - 14, y)
  y += 7
  doc.setFont("helvetica", "bold").setFontSize(12).text(o.title, w / 2, y, { align: "center" })
  if (o.subtitle) {
    y += 5.5
    doc.setFont("helvetica", "normal").setFontSize(9.5).text(o.subtitle, w / 2, y, { align: "center" })
  }

  const columnStyles = Object.fromEntries((o.rightAlignCols ?? []).map((c) => [c, { halign: "right" as const }]))
  autoTable(doc, {
    startY: y + 6,
    head: [o.head],
    body: o.body,
    foot: o.foot,
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: [3, 105, 161], textColor: 255, halign: "center" },
    footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: "bold" },
    columnStyles,
    margin: { left: 14, right: 14 },
  })

  doc.setFontSize(8).setFont("helvetica", "italic").setTextColor(120)
  doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, 14, doc.internal.pageSize.getHeight() - 8)
  doc.save(`${o.filename}.pdf`)
}
