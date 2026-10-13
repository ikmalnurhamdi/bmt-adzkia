-- =====================================================================
--  MTs ADZKIA MOBILE  -  Skema Keuangan Sekolah
--  Jalankan SEKALI di Supabase > SQL Editor.
--  Aman dijalankan ulang (idempotent) setelah langkah arsip selesai.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. ARSIPKAN TABEL LAMA (data pesantren tidak dihapus)
-- ---------------------------------------------------------------------
alter table if exists public.log_uang_jajan        rename to log_uang_jajan_legacy;
alter table if exists public.transaksi_pembayaran_v2 rename to transaksi_pembayaran_v2_legacy;
alter table if exists public.keuangan_operasional  rename to keuangan_operasional_legacy;
alter table if exists public.tarif                 rename to tarif_legacy;
alter table if exists public.santri                rename to santri_legacy;

-- ---------------------------------------------------------------------
-- 1. TAHUN AJARAN  (kalender Januari - Desember)
-- ---------------------------------------------------------------------
create table if not exists public.tahun_ajaran (
  id         uuid primary key default gen_random_uuid(),
  tahun      integer not null unique check (tahun between 2000 and 2100),
  nama       text    not null,
  aktif      boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. KATEGORI PEMBAYARAN (dinamis, diatur admin)
--    tipe_tagihan : sekali | bulanan | semester | tahunan | bebas
--    jatuh_tempo  : bulan (1-12) kapan tiap periode mulai ditagih
--                   semester -> {bulan ASAS, bulan ASAT}; tahunan -> {bulan}
--    untuk_calon  : ikut ditagihkan ke calon siswa (mis. PPDB)
-- ---------------------------------------------------------------------
create table if not exists public.kategori_pembayaran (
  id           uuid primary key default gen_random_uuid(),
  unit         text    not null default 'MTS',
  nama         text    not null,
  tipe_tagihan text    not null check (tipe_tagihan in ('sekali','bulanan','semester','tahunan','bebas')),
  jatuh_tempo  integer[],
  untuk_calon  boolean not null default false,
  urutan       integer not null default 0,
  aktif        boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (unit, nama)
);

-- ---------------------------------------------------------------------
-- 3. TARIF per kategori x tahun ajaran (tingkat 0 = semua tingkat)
-- ---------------------------------------------------------------------
create table if not exists public.tarif_pembayaran (
  id              uuid primary key default gen_random_uuid(),
  kategori_id     uuid not null references public.kategori_pembayaran(id) on delete cascade,
  tahun_ajaran_id uuid not null references public.tahun_ajaran(id)       on delete cascade,
  tingkat         smallint not null default 0 check (tingkat between 0 and 12),
  nominal         bigint   not null default 0 check (nominal >= 0),
  unique (kategori_id, tahun_ajaran_id, tingkat)
);

-- ---------------------------------------------------------------------
-- 4. SISWA (termasuk calon siswa PPDB: status = 'calon')
-- ---------------------------------------------------------------------
create table if not exists public.siswa (
  id                    uuid primary key default gen_random_uuid(),
  nis                   text,
  nisn                  text,
  nama_lengkap          text    not null,
  jenis_kelamin         text    check (jenis_kelamin in ('L','P')),
  unit                  text    not null default 'MTS',
  tingkat               smallint not null default 7 check (tingkat between 1 and 12),
  kelas                 text,
  status                text    not null default 'aktif' check (status in ('calon','aktif','lulus','keluar')),
  tahun_masuk           integer not null default (extract(year from now())::int),
  tanggal_masuk         date    not null default current_date,
  tanggal_mulai_tagihan date    not null default current_date,
  nama_wali             text,
  hp_wali               text,
  alamat                text,
  asal_sekolah          text,
  catatan               text,
  created_at            timestamptz not null default now()
);
create unique index if not exists ux_siswa_nis    on public.siswa (nis) where nis is not null and nis <> '';
create index        if not exists ix_siswa_status on public.siswa (status, nama_lengkap);

-- ---------------------------------------------------------------------
-- 5. DISKON / BEASISWA per siswa
--    kategori_id NULL = semua kategori, tahun_ajaran_id NULL = semua tahun
-- ---------------------------------------------------------------------
create table if not exists public.diskon_siswa (
  id              uuid primary key default gen_random_uuid(),
  siswa_id        uuid not null references public.siswa(id) on delete cascade,
  kategori_id     uuid references public.kategori_pembayaran(id) on delete cascade,
  tahun_ajaran_id uuid references public.tahun_ajaran(id)       on delete cascade,
  tipe            text   not null check (tipe in ('persen','nominal')),
  nilai           bigint not null check (nilai > 0),
  keterangan      text,
  created_at      timestamptz not null default now()
);
create index if not exists ix_diskon_siswa on public.diskon_siswa (siswa_id);

-- ---------------------------------------------------------------------
-- 6. TRANSAKSI PEMBAYARAN (mendukung cicilan)
--    periode: bulan (1-12) utk bulanan, 1/2 utk semester (1=ASAS, 2=ASAT), 1 selainnya
-- ---------------------------------------------------------------------
create table if not exists public.transaksi_pembayaran (
  id              uuid primary key default gen_random_uuid(),
  siswa_id        uuid not null references public.siswa(id) on delete cascade,
  kategori_id     uuid not null references public.kategori_pembayaran(id) on delete restrict,
  tahun_ajaran_id uuid not null references public.tahun_ajaran(id)       on delete restrict,
  periode         smallint not null default 1,
  jumlah_bayar    bigint   not null check (jumlah_bayar > 0),
  tanggal_bayar   date     not null default current_date,
  metode          text     not null default 'tunai',
  no_kwitansi     text,
  keterangan      text,
  created_at      timestamptz not null default now()
);
create index if not exists ix_trx_siswa_ta  on public.transaksi_pembayaran (siswa_id, tahun_ajaran_id);
create index if not exists ix_trx_tanggal   on public.transaksi_pembayaran (tanggal_bayar desc);
create index if not exists ix_trx_kwitansi  on public.transaksi_pembayaran (no_kwitansi);
create index if not exists ix_trx_ta_kat    on public.transaksi_pembayaran (tahun_ajaran_id, kategori_id);

-- ---------------------------------------------------------------------
-- 7. KAS OPERASIONAL (pemasukan lain & pengeluaran sekolah)
-- ---------------------------------------------------------------------
create table if not exists public.kas_operasional (
  id         uuid primary key default gen_random_uuid(),
  tanggal    date   not null default current_date,
  jenis      text   not null check (jenis in ('pemasukan','pengeluaran')),
  nominal    bigint not null check (nominal > 0),
  keterangan text   not null,
  created_at timestamptz not null default now()
);
create index if not exists ix_kas_tanggal on public.kas_operasional (tanggal desc);

-- ---------------------------------------------------------------------
-- 8. FUNGSI: hitung tagihan di database (cepat, satu sumber kebenaran)
--    Satu baris = satu siswa x kategori x periode yang memiliki tarif > 0
-- ---------------------------------------------------------------------
create or replace function public.fn_tagihan(p_tahun integer, p_siswa uuid default null)
returns table (
  siswa_id          uuid,
  kategori_id       uuid,
  periode           integer,
  jatuh_tempo_bulan integer,
  tarif             bigint,
  diskon            bigint,
  target            bigint,
  bayar             bigint,
  sisa              bigint,
  jatuh_tempo       boolean
)
language sql stable
as $$
  with ta as (
    select id, tahun from public.tahun_ajaran where tahun = p_tahun
  ),
  per as (
    select k.id as kategori_id, k.unit, k.tipe_tagihan, k.untuk_calon, g.p as periode,
           coalesce(
             k.jatuh_tempo[g.p],
             case k.tipe_tagihan
               when 'bulanan'  then g.p
               when 'semester' then (case g.p when 1 then 12 else 6 end)
               when 'tahunan'  then 12
               else 1
             end
           ) as due_bulan
    from public.kategori_pembayaran k
    cross join lateral generate_series(
      1,
      case k.tipe_tagihan when 'bulanan' then 12 when 'semester' then 2 else 1 end
    ) as g(p)
    where k.aktif and k.tipe_tagihan <> 'bebas'
  ),
  base as (
    select s.id as sid, per.kategori_id, per.periode, per.due_bulan, ta.id as ta_id, ta.tahun,
           coalesce((
             select t.nominal
             from public.tarif_pembayaran t
             where t.kategori_id = per.kategori_id
               and t.tahun_ajaran_id = ta.id
               and t.tingkat in (0, s.tingkat)
             order by t.tingkat desc
             limit 1
           ), 0) as tarif
    from public.siswa s
    join ta on true
    join per on per.unit = s.unit
            and (s.status = 'aktif' or (s.status = 'calon' and per.untuk_calon))
    where (p_siswa is null or s.id = p_siswa)
      and (per.tipe_tagihan <> 'sekali' or s.tahun_masuk = ta.tahun)
      and (
        case when per.tipe_tagihan = 'bulanan'
             then make_date(ta.tahun, per.periode, 1) >= date_trunc('month', s.tanggal_mulai_tagihan)::date
             else ta.tahun >= extract(year from s.tanggal_mulai_tagihan)::int
        end
      )
  ),
  hitung as (
    select b.*,
           coalesce((
             select sum(case when d.tipe = 'persen' then b.tarif * d.nilai / 100 else d.nilai end)
             from public.diskon_siswa d
             where d.siswa_id = b.sid
               and (d.kategori_id is null or d.kategori_id = b.kategori_id)
               and (d.tahun_ajaran_id is null or d.tahun_ajaran_id = b.ta_id)
           ), 0) as pot
    from base b
    where b.tarif > 0
  ),
  pay as (
    select tp.siswa_id as sid, tp.kategori_id, tp.periode, sum(tp.jumlah_bayar) as bayar
    from public.transaksi_pembayaran tp
    where tp.tahun_ajaran_id = (select id from ta)
      and (p_siswa is null or tp.siswa_id = p_siswa)
    group by tp.siswa_id, tp.kategori_id, tp.periode
  )
  select h.sid,
         h.kategori_id,
         h.periode::int,
         h.due_bulan::int,
         h.tarif::bigint,
         least(h.tarif, h.pot)::bigint,
         (h.tarif - least(h.tarif, h.pot))::bigint,
         coalesce(p.bayar, 0)::bigint,
         greatest(0, h.tarif - least(h.tarif, h.pot) - coalesce(p.bayar, 0))::bigint,
         (
           h.tahun < extract(year from (now() at time zone 'Asia/Jakarta'))::int
           or (
             h.tahun = extract(year from (now() at time zone 'Asia/Jakarta'))::int
             and h.due_bulan <= extract(month from (now() at time zone 'Asia/Jakarta'))::int
           )
         )
  from hitung h
  left join pay p
    on p.sid = h.sid and p.kategori_id = h.kategori_id and p.periode = h.periode
$$;

-- ---------------------------------------------------------------------
-- 9. FUNGSI: daftar tunggakan per siswa (hanya periode yang sudah jatuh tempo)
-- ---------------------------------------------------------------------
create or replace function public.fn_tunggakan(p_tahun integer)
returns table (
  siswa_id     uuid,
  nama_lengkap text,
  nis          text,
  tingkat      smallint,
  kelas        text,
  status       text,
  nama_wali    text,
  hp_wali      text,
  total_sisa   bigint,
  rincian      jsonb
)
language sql stable
as $$
  with t as (
    select * from public.fn_tagihan(p_tahun) where jatuh_tempo and sisa > 0
  ),
  agg as (
    select t.siswa_id as sid, t.kategori_id as kid, count(*)::int as jml, sum(t.sisa)::bigint as sisa
    from t
    group by t.siswa_id, t.kategori_id
  )
  select s.id, s.nama_lengkap, s.nis, s.tingkat, s.kelas, s.status, s.nama_wali, s.hp_wali,
         sum(a.sisa)::bigint,
         jsonb_agg(
           jsonb_build_object('kategori_id', a.kid, 'nama', k.nama, 'jumlah_periode', a.jml, 'sisa', a.sisa)
           order by k.urutan
         )
  from agg a
  join public.siswa s on s.id = a.sid
  join public.kategori_pembayaran k on k.id = a.kid
  group by s.id
  order by sum(a.sisa) desc, s.nama_lengkap
$$;

-- ---------------------------------------------------------------------
-- 10. FUNGSI: ringkasan dashboard (satu panggilan, tanpa tarik data mentah)
-- ---------------------------------------------------------------------
create or replace function public.fn_ringkasan(p_tahun integer)
returns jsonb
language sql stable
as $$
  with ta as (
    select id from public.tahun_ajaran where tahun = p_tahun
  ),
  tg as (
    select * from public.fn_tagihan(p_tahun)
  ),
  kat as (
    select k.id, k.nama, k.urutan,
           coalesce(sum(tg.target) filter (where tg.jatuh_tempo), 0)::bigint as tagihan,
           coalesce(sum(tg.bayar), 0)::bigint                                as bayar,
           coalesce(sum(tg.sisa)   filter (where tg.jatuh_tempo), 0)::bigint as tunggakan
    from public.kategori_pembayaran k
    left join tg on tg.kategori_id = k.id
    where k.aktif
    group by k.id
  ),
  bln as (
    select extract(month from tp.tanggal_bayar)::int as bulan, sum(tp.jumlah_bayar)::bigint as total
    from public.transaksi_pembayaran tp
    where tp.tahun_ajaran_id = (select id from ta)
    group by 1
  )
  select jsonb_build_object(
    'siswa_aktif', (select count(*) from public.siswa where status = 'aktif'),
    'calon',       (select count(*) from public.siswa where status = 'calon'),
    'pemasukan',   coalesce((select sum(jumlah_bayar) from public.transaksi_pembayaran
                              where tahun_ajaran_id = (select id from ta)), 0),
    'tagihan',     coalesce((select sum(tagihan)   from kat), 0),
    'tunggakan',   coalesce((select sum(tunggakan) from kat), 0),
    'kategori',    coalesce((select jsonb_agg(jsonb_build_object(
                       'id', id, 'nama', nama, 'tagihan', tagihan, 'bayar', bayar, 'tunggakan', tunggakan
                     ) order by urutan) from kat), '[]'::jsonb),
    'per_bulan',   coalesce((select jsonb_agg(jsonb_build_object('bulan', bulan, 'total', total)
                                              order by bulan) from bln), '[]'::jsonb),
    'kas_masuk',   coalesce((select sum(nominal) from public.kas_operasional
                              where jenis = 'pemasukan'   and extract(year from tanggal) = p_tahun), 0),
    'kas_keluar',  coalesce((select sum(nominal) from public.kas_operasional
                              where jenis = 'pengeluaran' and extract(year from tanggal) = p_tahun), 0)
  )
$$;

-- ---------------------------------------------------------------------
-- 11. FUNGSI: rekap pemasukan per kategori (berdasarkan tanggal bayar)
--     p_bulan NULL = satu tahun penuh
-- ---------------------------------------------------------------------
create or replace function public.fn_rekap_kategori(p_tahun integer, p_bulan integer default null)
returns table (kategori_id uuid, nama text, jumlah integer, total bigint)
language sql stable
as $$
  select k.id, k.nama, count(*)::int, sum(tp.jumlah_bayar)::bigint
  from public.transaksi_pembayaran tp
  join public.kategori_pembayaran k on k.id = tp.kategori_id
  where extract(year from tp.tanggal_bayar) = p_tahun
    and (p_bulan is null or extract(month from tp.tanggal_bayar) = p_bulan)
  group by k.id, k.nama, k.urutan
  order by k.urutan
$$;

-- ---------------------------------------------------------------------
-- 12. ROW LEVEL SECURITY: hanya user login (admin) yang boleh akses
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'tahun_ajaran','kategori_pembayaran','tarif_pembayaran','siswa',
    'diskon_siswa','transaksi_pembayaran','kas_operasional'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "admin_all" on public.%I', t);
    execute format(
      'create policy "admin_all" on public.%I for all to authenticated using (true) with check (true)', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 13. DATA AWAL: tahun ajaran berjalan + kategori MTs
--     (Tarif sengaja dikosongkan: isi lewat menu Pengaturan > Tarif)
-- ---------------------------------------------------------------------
insert into public.tahun_ajaran (tahun, nama, aktif)
values (extract(year from now())::int, extract(year from now())::int::text, true)
on conflict (tahun) do nothing;

insert into public.kategori_pembayaran (unit, nama, tipe_tagihan, jatuh_tempo, untuk_calon, urutan) values
  ('MTS', 'PPDB',              'sekali',   null,        true,  1),
  ('MTS', 'Bulanan',           'bulanan',  null,        false, 2),
  ('MTS', 'ASAS/ASAT',         'semester', '{12,6}',    false, 3),
  ('MTS', 'Biaya Akhir Tahun', 'tahunan',  '{12}',      false, 4)
on conflict (unit, nama) do nothing;
