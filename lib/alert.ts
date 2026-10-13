/**
 * Pembungkus SweetAlert2 yang dimuat saat dibutuhkan saja (lazy),
 * sehingga tidak membebani bundle awal setiap halaman.
 */
async function swal() {
  return (await import("sweetalert2")).default
}

export async function toast(title: string, icon: "success" | "info" | "warning" | "error" = "success") {
  const Swal = await swal()
  Swal.fire({ icon, title, timer: 1300, showConfirmButton: false, heightAuto: false })
}

export async function warn(title: string, text?: string) {
  const Swal = await swal()
  Swal.fire({ icon: "warning", title, text, heightAuto: false, confirmButtonColor: "#0369a1" })
}

export async function fail(err: unknown, title = "Gagal") {
  const Swal = await swal()
  const text = err instanceof Error ? err.message : typeof err === "object" && err && "message" in err ? String((err as { message: unknown }).message) : String(err)
  Swal.fire({ icon: "error", title, text, heightAuto: false, confirmButtonColor: "#0369a1" })
}

export async function konfirmasi(title: string, text?: string, confirmText = "Ya, lanjutkan", danger = false) {
  const Swal = await swal()
  const res = await Swal.fire({
    title,
    text,
    icon: danger ? "warning" : "question",
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: "Batal",
    confirmButtonColor: danger ? "#dc2626" : "#0369a1",
    heightAuto: false,
  })
  return res.isConfirmed
}
