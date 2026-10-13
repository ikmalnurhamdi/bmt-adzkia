"use client"

import { useCallback, useEffect, useState } from "react"
import { getSupabase } from "./supabase"
import { UNIT } from "./config"
import type { Kategori, TahunAjaran } from "./types"

interface Master {
  tahunAjaran: TahunAjaran[]
  kategori: Kategori[]
}

/**
 * Cache memori untuk data master (tahun ajaran & kategori) yang kecil dan jarang berubah.
 * Perpindahan halaman jadi instan karena tidak query ulang.
 */
let cache: Master | null = null
let inflight: Promise<Master> | null = null

export async function loadMaster(force = false): Promise<Master> {
  if (cache && !force) return cache
  if (inflight && !force) return inflight
  const sb = getSupabase()
  inflight = Promise.all([
    sb.from("tahun_ajaran").select("id,tahun,nama,aktif").order("tahun", { ascending: false }),
    sb.from("kategori_pembayaran").select("*").eq("unit", UNIT).order("urutan").order("nama"),
  ])
    .then(([ta, kat]) => {
      if (ta.error) throw ta.error
      if (kat.error) throw kat.error
      cache = { tahunAjaran: (ta.data ?? []) as TahunAjaran[], kategori: (kat.data ?? []) as Kategori[] }
      return cache
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

export function invalidateMaster() {
  cache = null
}

export function useMaster() {
  const [data, setData] = useState<Master | null>(cache)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async (force = false) => {
    try {
      setData(await loadMaster(force))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data master")
    }
  }, [])

  useEffect(() => {
    if (!cache) reload()
  }, [reload])

  const tahunAjaran = data?.tahunAjaran ?? []
  const kategori = data?.kategori ?? []
  const tahunDefault =
    tahunAjaran.find((t) => t.aktif)?.tahun ?? tahunAjaran[0]?.tahun ?? new Date().getFullYear()

  return {
    ready: data !== null,
    error,
    tahunAjaran,
    kategori,
    kategoriAktif: kategori.filter((k) => k.aktif),
    tahunDefault,
    reload: () => reload(true),
  }
}
