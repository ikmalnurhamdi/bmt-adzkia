import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Fungsi 'cn' (class name) digunakan untuk menggabungkan Tailwind classes
 * dan mencegah konflik class yang bertabrakan.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Fungsi opsional jika Anda membutuhkan pencatatan log ke database
 */
export async function simpanLog(aksi: string, deskripsi: string) {
  // Implementasi log bisa ditambahkan di sini nanti
  console.log(`[LOG] ${aksi}: ${deskripsi}`);
}