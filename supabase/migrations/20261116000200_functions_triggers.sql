-- =====================================================================
-- 002 helper functions, triggers, RPC (state machine, points, audit)
-- =====================================================================

-- ---------- Role helpers (SECURITY DEFINER → bebas rekursi RLS) -------
create or replace function public.app_role()
returns public.user_role
language sql stable security definer set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.aktif
$$;

create or replace function public.has_role(variadic roles public.user_role[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.app_role() = any (roles), false)
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.has_role('admin','bk','kepala_sekolah')
$$;

create or replace function public.is_wali_kelas_siswa(p_siswa uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.siswa s join public.kelas k on k.id = s.kelas_id
    where s.id = p_siswa and k.wali_kelas_id = auth.uid()
  )
$$;

-- Identitas dasar siswa (direktori). Guru boleh melihat direktori untuk mengusulkan.
create or replace function public.can_view_siswa(p_siswa uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case public.app_role()
    when 'admin' then true
    when 'bk' then true
    when 'kepala_sekolah' then true
    when 'guru' then true
    when 'siswa' then exists (select 1 from public.siswa s where s.id = p_siswa and s.profile_id = auth.uid())
    when 'orang_tua' then exists (select 1 from public.orang_tua_siswa o where o.siswa_id = p_siswa and o.orang_tua_id = auth.uid())
    else false
  end
$$;

-- Data kedisiplinan lengkap (poin, tindak lanjut, remisi, dokumen, surat).
create or replace function public.can_view_rekam_siswa(p_siswa uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case public.app_role()
    when 'admin' then true
    when 'bk' then true
    when 'kepala_sekolah' then true
    when 'guru' then public.is_wali_kelas_siswa(p_siswa)
    when 'siswa' then exists (select 1 from public.siswa s where s.id = p_siswa and s.profile_id = auth.uid())
    when 'orang_tua' then exists (select 1 from public.orang_tua_siswa o where o.siswa_id = p_siswa and o.orang_tua_id = auth.uid())
    else false
  end
$$;

create or replace function public.can_view_pelanggaran(p_siswa uuid, p_pengusul uuid, p_status public.status_pelanggaran)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case public.app_role()
    when 'admin' then true
    when 'bk' then true
    when 'kepala_sekolah' then true
    when 'guru' then p_pengusul = auth.uid() or public.is_wali_kelas_siswa(p_siswa)
    when 'siswa' then p_status = 'disahkan' and public.can_view_rekam_siswa(p_siswa)
    when 'orang_tua' then p_status = 'disahkan' and public.can_view_rekam_siswa(p_siswa)
    else false
  end
$$;

-- ---------- updated_at ------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at := now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','siswa','jenis_pelanggaran','pelanggaran','tindak_lanjut','template_surat','surat'] loop
    execute format('drop trigger if exists trg_%1$s_updated_at on public.%1$I', t);
    execute format('create trigger trg_%1$s_updated_at before update on public.%1$I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------- Audit (append-only, strip PII keys from TG_ARGV) ----------
create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_old jsonb; v_new jsonb; v_aksi text := tg_op; k text; v_id text;
begin
  if tg_op in ('UPDATE','DELETE') then v_old := to_jsonb(old); end if;
  if tg_op in ('INSERT','UPDATE') then v_new := to_jsonb(new); end if;
  if tg_nargs > 0 then
    foreach k in array tg_argv loop
      v_old := v_old - k; v_new := v_new - k;
    end loop;
  end if;
  if tg_op = 'UPDATE' and tg_table_name = 'pelanggaran' and v_old->>'status' is distinct from v_new->>'status' then
    v_aksi := 'DECISION:' || (v_new->>'status');
  elsif tg_op = 'UPDATE' and tg_table_name = 'surat' and v_old->>'status' = 'draft' and v_new->>'status' = 'final' then
    v_aksi := 'FINALIZE';
  end if;
  if tg_op = 'UPDATE' and v_old = v_new then return new; end if;
  v_id := coalesce(v_new->>'id', v_old->>'id');
  insert into public.audit_log (tabel, record_id, aksi, oleh, data_lama, data_baru)
  values (tg_table_name, v_id, v_aksi, auth.uid(), v_old, v_new);
  return coalesce(new, old);
end $$;

do $$
declare
  rec record;
begin
  for rec in
    select * from (values
      ('tahun_ajaran', ''), ('profiles', 'no_hp'), ('kelas', ''),
      ('siswa', 'alamat,no_hp_orang_tua'), ('orang_tua_siswa', ''),
      ('jenis_pelanggaran', ''), ('tingkat_sanksi', ''),
      ('pelanggaran', ''), ('tindak_lanjut', ''), ('dokumen', ''),
      ('template_surat', 'isi'), ('surat', 'isi'), ('remisi', '')
    ) as x(tbl, strip)
  loop
    execute format('drop trigger if exists trg_%1$s_audit on public.%1$I', rec.tbl);
    if rec.strip = '' then
      execute format('create trigger trg_%1$s_audit after insert or update or delete on public.%1$I for each row execute function public.audit_row()', rec.tbl);
    else
      execute format('create trigger trg_%1$s_audit after insert or update or delete on public.%1$I for each row execute function public.audit_row(%2$s)',
        rec.tbl, (select string_agg(quote_literal(s), ',') from unnest(string_to_array(rec.strip, ',')) s));
    end if;
  end loop;
end $$;

-- ---------- Notifikasi helpers ----------------------------------------
create or replace function public._notify(p_user uuid, p_judul text, p_isi text, p_tipe text, p_tautan text)
returns void language sql security definer set search_path = ''
as $$
  insert into public.notifikasi (user_id, judul, isi, tipe, tautan)
  select p_user, p_judul, p_isi, p_tipe, p_tautan
  where p_user is not null and p_user is distinct from auth.uid();
$$;

create or replace function public._notify_roles(p_roles public.user_role[], p_judul text, p_isi text, p_tipe text, p_tautan text)
returns void language sql security definer set search_path = ''
as $$
  insert into public.notifikasi (user_id, judul, isi, tipe, tautan)
  select p.id, p_judul, p_isi, p_tipe, p_tautan
  from public.profiles p
  where p.role = any (p_roles) and p.aktif and p.id is distinct from auth.uid();
$$;
revoke execute on function public._notify(uuid, text, text, text, text) from public, anon, authenticated;
revoke execute on function public._notify_roles(public.user_role[], text, text, text, text) from public, anon, authenticated;

-- ---------- Tahun ajaran aktif ----------------------------------------
create or replace function public.tahun_ajaran_aktif_id()
returns uuid language sql stable security definer set search_path = ''
as $$ select id from public.tahun_ajaran where aktif limit 1 $$;

create or replace function public.set_tahun_ajaran_aktif(p_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'Hanya admin yang dapat mengubah tahun ajaran aktif' using errcode = '42501';
  end if;
  if not exists (select 1 from public.tahun_ajaran where id = p_id) then
    raise exception 'Tahun ajaran tidak ditemukan' using errcode = 'P0002';
  end if;
  update public.tahun_ajaran set aktif = false where aktif and id <> p_id;
  update public.tahun_ajaran set aktif = true where id = p_id;
end $$;

-- ---------- State machine pelanggaran ---------------------------------
-- Satu sumber kebenaran transisi; dicerminkan di src/lib/domain/status.ts (diuji).
create or replace function public.transisi_pelanggaran_diizinkan(
  p_dari public.status_pelanggaran, p_ke public.status_pelanggaran,
  p_role public.user_role, p_is_pengusul boolean)
returns boolean language sql immutable set search_path = ''
as $$
  select case
    when p_dari = 'menunggu_persetujuan' and p_ke in ('disetujui','ditolak') then p_role in ('bk','admin')
    when p_dari = 'menunggu_persetujuan' and p_ke = 'dibatalkan' then p_role = 'admin' or p_is_pengusul
    when p_dari = 'disetujui' and p_ke in ('disahkan','ditolak') then p_role in ('kepala_sekolah','admin')
    when p_dari = 'disetujui' and p_ke = 'dibatalkan' then p_role in ('bk','admin')
    when p_dari = 'disahkan' and p_ke = 'dibatalkan' then p_role = 'admin'
    else false
  end
$$;

create or replace function public.ubah_status_pelanggaran(
  p_id uuid, p_status public.status_pelanggaran, p_catatan text default null)
returns public.pelanggaran
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.pelanggaran;
  v_role public.user_role := public.app_role();
begin
  if v_role is null then
    raise exception 'Sesi tidak valid' using errcode = '42501';
  end if;
  select * into v_row from public.pelanggaran where id = p_id for update;
  if not found or not public.can_view_pelanggaran(v_row.siswa_id, v_row.pengusul_id, v_row.status) then
    raise exception 'Pelanggaran tidak ditemukan' using errcode = 'P0002';
  end if;
  if not public.transisi_pelanggaran_diizinkan(v_row.status, p_status, v_role, v_row.pengusul_id = auth.uid()) then
    raise exception 'Transisi % → % tidak diizinkan untuk role %', v_row.status, p_status, v_role using errcode = '42501';
  end if;
  if p_status in ('ditolak','dibatalkan') and coalesce(btrim(p_catatan), '') = '' then
    raise exception 'Catatan wajib diisi untuk penolakan/pembatalan' using errcode = '22023';
  end if;

  perform set_config('app.status_rpc', 'on', true);
  perform set_config('app.status_catatan', coalesce(p_catatan, ''), true);

  update public.pelanggaran set
    status = p_status,
    diputuskan_oleh = case when v_row.status = 'menunggu_persetujuan' then auth.uid() else diputuskan_oleh end,
    diputuskan_pada = case when v_row.status = 'menunggu_persetujuan' then now() else diputuskan_pada end,
    catatan_keputusan = coalesce(nullif(btrim(p_catatan), ''), catatan_keputusan),
    disahkan_pada = case when p_status = 'disahkan' then now() else disahkan_pada end
  where id = p_id
  returning * into v_row;

  perform set_config('app.status_rpc', 'off', true);
  return v_row;
end $$;

create or replace function public.pelanggaran_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_jenis public.jenis_pelanggaran;
  v_siswa public.siswa;
  v_role public.user_role := public.app_role();
begin
  select * into v_jenis from public.jenis_pelanggaran where id = new.jenis_pelanggaran_id;
  if not found or not v_jenis.aktif then
    raise exception 'Jenis pelanggaran tidak valid atau nonaktif' using errcode = '22023';
  end if;
  select * into v_siswa from public.siswa where id = new.siswa_id;
  if not found or v_siswa.status <> 'aktif' then
    raise exception 'Siswa tidak ditemukan atau tidak aktif' using errcode = '22023';
  end if;
  if new.tanggal_kejadian > current_date then
    raise exception 'Tanggal kejadian tidak boleh di masa depan' using errcode = '22023';
  end if;

  -- Jangan percaya client: poin, kelas, tahun ajaran, status, pengusul ditetapkan server.
  new.poin := v_jenis.bobot_poin;
  new.kelas_id := v_siswa.kelas_id;
  new.tahun_ajaran_id := coalesce(
    (select k.tahun_ajaran_id from public.kelas k where k.id = v_siswa.kelas_id),
    public.tahun_ajaran_aktif_id());
  new.status := 'menunggu_persetujuan';
  new.jalur := case when v_role in ('bk','admin') then 'langsung'::public.jalur_pelanggaran else 'usulan'::public.jalur_pelanggaran end;
  if auth.uid() is not null then new.pengusul_id := auth.uid(); end if;
  new.diputuskan_oleh := null; new.diputuskan_pada := null;
  new.catatan_keputusan := null; new.disahkan_pada := null;
  return new;
end $$;

create or replace function public.pelanggaran_before_update()
returns trigger language plpgsql set search_path = ''
as $$
declare v_via_rpc boolean := coalesce(current_setting('app.status_rpc', true), 'off') = 'on';
begin
  if new.status is distinct from old.status
     or new.diputuskan_oleh is distinct from old.diputuskan_oleh
     or new.diputuskan_pada is distinct from old.diputuskan_pada
     or new.disahkan_pada is distinct from old.disahkan_pada then
    if not v_via_rpc then
      raise exception 'Status hanya dapat diubah melalui ubah_status_pelanggaran()' using errcode = '42501';
    end if;
    return new;
  end if;

  if v_via_rpc then return new; end if;

  -- Edit data biasa hanya saat menunggu persetujuan.
  if old.status <> 'menunggu_persetujuan' then
    raise exception 'Arsip terkunci: pelanggaran yang sudah diputuskan tidak dapat diedit' using errcode = '42501';
  end if;
  new.siswa_id := old.siswa_id;
  new.pengusul_id := old.pengusul_id;
  new.kelas_id := old.kelas_id;
  new.tahun_ajaran_id := old.tahun_ajaran_id;
  new.jalur := old.jalur;
  new.catatan_keputusan := old.catatan_keputusan;
  if new.jenis_pelanggaran_id is distinct from old.jenis_pelanggaran_id then
    select j.bobot_poin into new.poin from public.jenis_pelanggaran j where j.id = new.jenis_pelanggaran_id and j.aktif;
    if new.poin is null then
      raise exception 'Jenis pelanggaran tidak valid atau nonaktif' using errcode = '22023';
    end if;
  else
    new.poin := old.poin; -- snapshot poin tidak bisa diubah langsung
  end if;
  return new;
end $$;

create or replace function public.pelanggaran_after_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_nama text; v_link text := '/arsip/' || new.id;
begin
  select nama_lengkap into v_nama from public.siswa where id = new.siswa_id;
  if tg_op = 'INSERT' then
    insert into public.pelanggaran_status_log (pelanggaran_id, status_dari, status_ke, oleh, catatan)
    values (new.id, null, new.status, auth.uid(), 'Usulan dibuat');
    perform public._notify_roles(array['bk','admin']::public.user_role[],
      'Usulan pelanggaran baru', coalesce(v_nama, 'Siswa') || ' — menunggu peninjauan', 'usulan', v_link);
  elsif new.status is distinct from old.status then
    insert into public.pelanggaran_status_log (pelanggaran_id, status_dari, status_ke, oleh, catatan)
    values (new.id, old.status, new.status, auth.uid(), nullif(current_setting('app.status_catatan', true), ''));
    perform public._notify(new.pengusul_id, 'Status usulan diperbarui',
      coalesce(v_nama, 'Siswa') || ': ' || replace(new.status::text, '_', ' '), 'status', v_link);
    if new.status = 'disetujui' then
      perform public._notify_roles(array['kepala_sekolah']::public.user_role[],
        'Menunggu pengesahan', coalesce(v_nama, 'Siswa') || ' — telah disetujui BK', 'pengesahan', v_link);
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_pelanggaran_before_insert on public.pelanggaran;
create trigger trg_pelanggaran_before_insert before insert on public.pelanggaran
  for each row execute function public.pelanggaran_before_insert();
drop trigger if exists trg_pelanggaran_before_update on public.pelanggaran;
create trigger trg_pelanggaran_before_update before update on public.pelanggaran
  for each row execute function public.pelanggaran_before_update();
drop trigger if exists trg_pelanggaran_after_change on public.pelanggaran;
create trigger trg_pelanggaran_after_change after insert or update on public.pelanggaran
  for each row execute function public.pelanggaran_after_change();

-- ---------- Perhitungan poin (satu sumber kebenaran) -------------------
-- Total poin = Σ poin pelanggaran berstatus 'disahkan' pada tahun ajaran.
-- Remisi = Σ remisi yang tanggalnya dalam rentang tahun ajaran.
-- Poin bersih = total − remisi (tidak pernah negatif: dijaga trigger remisi).
create or replace function public._poin_bersih(p_siswa uuid, p_ta uuid)
returns table (total_poin integer, total_remisi integer, poin_bersih integer)
language sql stable security definer set search_path = ''
as $$
  with ta as (select tanggal_mulai, tanggal_selesai from public.tahun_ajaran where id = p_ta),
  p as (select coalesce(sum(poin), 0)::int s from public.pelanggaran
        where siswa_id = p_siswa and tahun_ajaran_id = p_ta and status = 'disahkan'),
  r as (select coalesce(sum(jumlah_poin), 0)::int s from public.remisi, ta
        where siswa_id = p_siswa and tanggal between ta.tanggal_mulai and ta.tanggal_selesai)
  select p.s, r.s, p.s - r.s from p, r
$$;
revoke execute on function public._poin_bersih(uuid, uuid) from public, anon, authenticated;

create or replace function public.rekap_poin_siswa(p_tahun_ajaran_id uuid, p_siswa_id uuid default null)
returns table (siswa_id uuid, total_poin integer, total_remisi integer, poin_bersih integer)
language sql stable security definer set search_path = ''
as $$
  with ta as (select tanggal_mulai, tanggal_selesai from public.tahun_ajaran where id = p_tahun_ajaran_id),
  p as (select pl.siswa_id, sum(pl.poin)::int s from public.pelanggaran pl
        where pl.tahun_ajaran_id = p_tahun_ajaran_id and pl.status = 'disahkan'
          and (p_siswa_id is null or pl.siswa_id = p_siswa_id)
        group by pl.siswa_id),
  r as (select rm.siswa_id, sum(rm.jumlah_poin)::int s from public.remisi rm, ta
        where rm.tanggal between ta.tanggal_mulai and ta.tanggal_selesai
          and (p_siswa_id is null or rm.siswa_id = p_siswa_id)
        group by rm.siswa_id)
  select s.id, coalesce(p.s, 0), coalesce(r.s, 0), coalesce(p.s, 0) - coalesce(r.s, 0)
  from public.siswa s
  left join p on p.siswa_id = s.id
  left join r on r.siswa_id = s.id
  where (p_siswa_id is null or s.id = p_siswa_id)
    and (p.s is not null or r.s is not null or p_siswa_id is not null)
    and public.can_view_rekam_siswa(s.id)
$$;

-- ---------- Tindak lanjut ---------------------------------------------
create or replace function public.tindak_lanjut_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_jenis public.jenis_sanksi;
begin
  if auth.uid() is not null then new.dibuat_oleh := auth.uid(); end if;
  if new.tingkat_sanksi_id is not null then
    select jenis into v_jenis from public.tingkat_sanksi where id = new.tingkat_sanksi_id and aktif;
    if v_jenis is null then raise exception 'Tingkat sanksi tidak valid' using errcode = '22023'; end if;
    new.jenis := coalesce(new.jenis, v_jenis);
  end if;
  select bp.poin_bersih into new.total_poin_saat_dibuat
  from public._poin_bersih(new.siswa_id, public.tahun_ajaran_aktif_id()) bp;
  return new;
end $$;

create or replace function public.tindak_lanjut_before_update()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.total_poin_saat_dibuat := old.total_poin_saat_dibuat; -- snapshot
  new.dibuat_oleh := old.dibuat_oleh;
  new.siswa_id := old.siswa_id;
  if old.status in ('selesai','dibatalkan') and new.status is distinct from old.status then
    raise exception 'Tindak lanjut yang sudah % tidak dapat diubah statusnya', old.status using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists trg_tindak_lanjut_before_insert on public.tindak_lanjut;
create trigger trg_tindak_lanjut_before_insert before insert on public.tindak_lanjut
  for each row execute function public.tindak_lanjut_before_insert();
drop trigger if exists trg_tindak_lanjut_before_update on public.tindak_lanjut;
create trigger trg_tindak_lanjut_before_update before update on public.tindak_lanjut
  for each row execute function public.tindak_lanjut_before_update();

-- ---------- Dokumen ---------------------------------------------------
create or replace function public.dokumen_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null then new.diunggah_oleh := auth.uid(); end if;
  if new.pelanggaran_id is not null and not exists (
    select 1 from public.pelanggaran where id = new.pelanggaran_id and siswa_id = new.siswa_id) then
    raise exception 'Pelanggaran tidak sesuai dengan siswa' using errcode = '22023';
  end if;
  if new.tindak_lanjut_id is not null and not exists (
    select 1 from public.tindak_lanjut where id = new.tindak_lanjut_id and siswa_id = new.siswa_id) then
    raise exception 'Tindak lanjut tidak sesuai dengan siswa' using errcode = '22023';
  end if;
  if new.storage_path not like ('siswa/' || new.siswa_id::text || '/%') then
    raise exception 'Path penyimpanan tidak valid' using errcode = '22023';
  end if;
  return new;
end $$;
drop trigger if exists trg_dokumen_before_insert on public.dokumen;
create trigger trg_dokumen_before_insert before insert on public.dokumen
  for each row execute function public.dokumen_before_insert();

-- ---------- Remisi ----------------------------------------------------
create or replace function public.remisi_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_ta uuid; v_bersih integer;
begin
  if auth.uid() is not null then new.dicatat_oleh := auth.uid(); end if;
  if not exists (select 1 from public.dokumen d where d.id = new.surat_dokumen_id and d.siswa_id = new.siswa_id) then
    raise exception 'Dokumen surat pendukung harus milik siswa yang sama' using errcode = '22023';
  end if;
  select id into v_ta from public.tahun_ajaran
   where new.tanggal between tanggal_mulai and tanggal_selesai order by aktif desc limit 1;
  if v_ta is null then
    raise exception 'Tanggal remisi di luar tahun ajaran yang terdaftar' using errcode = '22023';
  end if;
  select bp.poin_bersih into v_bersih from public._poin_bersih(new.siswa_id, v_ta) bp;
  if new.jumlah_poin > coalesce(v_bersih, 0) then
    raise exception 'Remisi (%) melebihi poin bersih siswa (%)', new.jumlah_poin, coalesce(v_bersih, 0) using errcode = '22023';
  end if;
  return new;
end $$;
drop trigger if exists trg_remisi_before_insert on public.remisi;
create trigger trg_remisi_before_insert before insert on public.remisi
  for each row execute function public.remisi_before_insert();

-- ---------- Surat -----------------------------------------------------
create sequence if not exists public.surat_nomor_seq;

create or replace function public.surat_before_write()
returns trigger language plpgsql set search_path = ''
as $$
declare v_via_rpc boolean := coalesce(current_setting('app.surat_rpc', true), 'off') = 'on';
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then new.dibuat_oleh := auth.uid(); end if;
    new.status := 'draft'; new.nomor_surat := null; new.difinalisasi_pada := null;
    return new;
  end if;
  if not v_via_rpc then
    if old.status <> 'draft' then
      raise exception 'Surat % tidak dapat diubah', old.status using errcode = '42501';
    end if;
    if new.status = 'final' or new.nomor_surat is distinct from old.nomor_surat
       or new.difinalisasi_pada is distinct from old.difinalisasi_pada then
      raise exception 'Finalisasi hanya melalui finalisasi_surat()' using errcode = '42501';
    end if;
  end if;
  new.dibuat_oleh := old.dibuat_oleh; new.siswa_id := old.siswa_id;
  return new;
end $$;
drop trigger if exists trg_surat_before_write on public.surat;
create trigger trg_surat_before_write before insert or update on public.surat
  for each row execute function public.surat_before_write();

create or replace function public.finalisasi_surat(p_id uuid)
returns public.surat language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.surat;
  v_romawi text[] := array['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
begin
  if not public.has_role('bk','admin') then
    raise exception 'Hanya BK/admin yang dapat memfinalisasi surat' using errcode = '42501';
  end if;
  select * into v_row from public.surat where id = p_id for update;
  if not found then raise exception 'Surat tidak ditemukan' using errcode = 'P0002'; end if;
  if v_row.status <> 'draft' then raise exception 'Hanya surat draft yang dapat difinalisasi' using errcode = '22023'; end if;
  perform set_config('app.surat_rpc', 'on', true);
  update public.surat set
    status = 'final',
    nomor_surat = lpad(nextval('public.surat_nomor_seq')::text, 3, '0') || '/BK/'
      || v_romawi[extract(month from now())::int] || '/' || extract(year from now())::int,
    difinalisasi_pada = now()
  where id = p_id returning * into v_row;
  perform set_config('app.surat_rpc', 'off', true);
  return v_row;
end $$;

-- ---------- Profiles --------------------------------------------------
create or replace function public.profiles_guard()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if (new.role is distinct from old.role or new.aktif is distinct from old.aktif or new.id is distinct from old.id)
     and auth.uid() is not null and not public.has_role('admin') then
    raise exception 'Hanya admin yang dapat mengubah role/status akun' using errcode = '42501';
  end if;
  if old.id = auth.uid() and new.role is distinct from old.role then
    raise exception 'Tidak dapat mengubah role akun sendiri' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists trg_profiles_guard on public.profiles;
create trigger trg_profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();

-- Profil otomatis dari auth.users. Role HANYA dari raw_app_meta_data
-- (hanya bisa diset service role), default 'siswa' (least privilege).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, nama_lengkap, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'nama_lengkap', ''), split_part(new.email, '@', 1)),
    coalesce((new.raw_app_meta_data->>'role')::public.user_role, 'siswa')
  )
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- View arsip (security_invoker → RLS berlaku) ----------------
create or replace view public.v_arsip_pelanggaran with (security_invoker = true) as
select
  p.id, p.siswa_id, p.kelas_id, p.tahun_ajaran_id, p.jenis_pelanggaran_id,
  p.poin, p.tanggal_kejadian, p.deskripsi, p.jalur, p.status,
  p.pengusul_id, p.diputuskan_pada, p.disahkan_pada, p.created_at,
  s.nis, s.nama_lengkap as siswa_nama,
  k.nama as kelas_nama, k.tingkat,
  j.kode, j.pasal, j.nama as jenis_nama,
  pr.nama_lengkap as pengusul_nama
from public.pelanggaran p
join public.siswa s on s.id = p.siswa_id
left join public.kelas k on k.id = p.kelas_id
join public.jenis_pelanggaran j on j.id = p.jenis_pelanggaran_id
left join public.profiles pr on pr.id = p.pengusul_id;

-- ---------- Dashboard (security invoker: cakupan mengikuti RLS) --------
create or replace function public.dashboard_ringkasan(p_tahun_ajaran_id uuid)
returns jsonb language sql stable security invoker set search_path = ''
as $$
  with pl as (
    select p.*, k.tingkat, j.pasal, j.kode
    from public.pelanggaran p
    left join public.kelas k on k.id = p.kelas_id
    join public.jenis_pelanggaran j on j.id = p.jenis_pelanggaran_id
    where p.tahun_ajaran_id = p_tahun_ajaran_id
  ),
  sah as (select * from pl where status = 'disahkan'),
  rekap as (select * from public.rekap_poin_siswa(p_tahun_ajaran_id))
  select jsonb_build_object(
    'total_siswa_aktif', (select count(*) from public.siswa s
        join public.kelas k on k.id = s.kelas_id
        where s.status = 'aktif' and k.tahun_ajaran_id = p_tahun_ajaran_id),
    'pelanggaran_sah', (select count(*) from sah),
    'pelanggaran_semua', (select count(*) from pl where status not in ('ditolak','dibatalkan')),
    'menunggu_keputusan', (select count(*) from pl where status = 'menunggu_persetujuan'),
    'menunggu_pengesahan', (select count(*) from pl where status = 'disetujui'),
    'total_poin_sah', (select coalesce(sum(poin), 0) from sah),
    'total_poin_bersih', (select coalesce(sum(poin_bersih), 0) from rekap),
    'tindak_lanjut_berjalan', (select count(*) from public.tindak_lanjut t
        where t.status in ('direncanakan','berjalan')),
    'tren_bulanan', coalesce((select jsonb_agg(x order by x.bulan) from (
        select to_char(date_trunc('month', tanggal_kejadian), 'YYYY-MM') as bulan,
               count(*) filter (where status = 'disahkan') as disahkan,
               count(*) filter (where status in ('menunggu_persetujuan','disetujui')) as proses,
               coalesce(sum(poin) filter (where status = 'disahkan'), 0) as poin
        from pl where status not in ('ditolak','dibatalkan') group by 1) x), '[]'::jsonb),
    'distribusi_pasal', coalesce((select jsonb_agg(x order by x.jumlah desc) from (
        select pasal, count(*) as jumlah, sum(poin) as poin
        from pl where status not in ('ditolak','dibatalkan') group by pasal) x), '[]'::jsonb),
    'distribusi_status', coalesce((select jsonb_agg(x) from (
        select status, count(*) as jumlah from pl group by status) x), '[]'::jsonb),
    'per_tingkat', coalesce((select jsonb_agg(x order by x.tingkat) from (
        select tingkat, count(*) as jumlah, coalesce(sum(poin), 0) as poin
        from sah where tingkat is not null group by tingkat) x), '[]'::jsonb)
  )
$$;
