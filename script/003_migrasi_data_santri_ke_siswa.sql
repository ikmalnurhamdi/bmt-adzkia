-- =====================================================================
--  MTs ADZKIA MOBILE  -  Migrasi Data Santri Lama ke Siswa (Opsional)
--  Jalankan di Supabase SQL Editor JIKA ingin menyalin data santri lama
--  (santri_legacy) ke tabel siswa yang baru.
-- =====================================================================

insert into public.siswa (
  id,
  nis,
  nama_lengkap,
  jenis_kelamin,
  unit,
  tingkat,
  kelas,
  status,
  tahun_masuk,
  tanggal_masuk,
  tanggal_mulai_tagihan,
  nama_wali,
  hp_wali,
  alamat,
  created_at
)
select
  s.id,
  nullif(trim(s.nis), ''),
  upper(trim(s.nama_lengkap)),
  case when upper(s.jenis_kelamin) in ('P', 'PEREMPUAN') then 'P' else 'L' end,
  'MTS',
  case
    when s.kelas ~* '9|IX' then 9
    when s.kelas ~* '8|VIII' then 8
    else 7
  end as tingkat,
  nullif(trim(s.kelas), ''),
  case when coalesce(s.status_aktif, true) then 'aktif' else 'keluar' end,
  coalesce(extract(year from s.tanggal_masuk)::int, extract(year from now())::int),
  coalesce(s.tanggal_masuk, current_date),
  coalesce(s.tanggal_mulai_tagihan, s.tanggal_masuk, current_date),
  nullif(trim(s.nama_wali), ''),
  nullif(trim(s.hp_wali), ''),
  nullif(trim(s.alamat), ''),
  coalesce(s.created_at, now())
from public.santri_legacy s
on conflict (id) do nothing;
