-- =====================================================================
-- 003 RLS policies, grants, private storage bucket
-- Prinsip: least privilege. anon tidak punya akses data sama sekali.
-- =====================================================================

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from anon;

do $$
declare t text;
begin
  foreach t in array array['tahun_ajaran','profiles','kelas','siswa','orang_tua_siswa','jenis_pelanggaran',
    'tingkat_sanksi','pelanggaran','pelanggaran_status_log','tindak_lanjut','dokumen','template_surat',
    'surat','remisi','notifikasi','push_subscriptions','audit_log'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Helper: drop-then-create agar idempotent.
create or replace function pg_temp.reset_policy(p_table text, p_name text)
returns void language plpgsql as $$
begin execute format('drop policy if exists %I on public.%I', p_name, p_table); end $$;

-- ---------- Master data: baca semua user login, tulis admin ------------
do $$
declare t text;
begin
  foreach t in array array['tahun_ajaran','kelas','jenis_pelanggaran','tingkat_sanksi'] loop
    perform pg_temp.reset_policy(t, t || '_select');
    perform pg_temp.reset_policy(t, t || '_admin_write');
    execute format('create policy %I on public.%I for select to authenticated using (public.app_role() is not null)', t || '_select', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.has_role(''admin'')) with check (public.has_role(''admin''))', t || '_admin_write', t);
  end loop;
end $$;

-- ---------- profiles ---------------------------------------------------
select pg_temp.reset_policy('profiles', 'profiles_select');
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role('admin','bk','kepala_sekolah','guru'));
select pg_temp.reset_policy('profiles', 'profiles_update_self');
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
select pg_temp.reset_policy('profiles', 'profiles_admin_all');
create policy profiles_admin_all on public.profiles for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

-- ---------- siswa ------------------------------------------------------
select pg_temp.reset_policy('siswa', 'siswa_select');
create policy siswa_select on public.siswa for select to authenticated
  using (public.can_view_siswa(id));
select pg_temp.reset_policy('siswa', 'siswa_admin_write');
create policy siswa_admin_write on public.siswa for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

-- ---------- orang_tua_siswa -------------------------------------------
select pg_temp.reset_policy('orang_tua_siswa', 'ortu_select');
create policy ortu_select on public.orang_tua_siswa for select to authenticated
  using (orang_tua_id = auth.uid() or public.is_staff());
select pg_temp.reset_policy('orang_tua_siswa', 'ortu_admin_write');
create policy ortu_admin_write on public.orang_tua_siswa for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

-- ---------- pelanggaran ------------------------------------------------
select pg_temp.reset_policy('pelanggaran', 'pelanggaran_select');
create policy pelanggaran_select on public.pelanggaran for select to authenticated
  using (public.can_view_pelanggaran(siswa_id, pengusul_id, status));
select pg_temp.reset_policy('pelanggaran', 'pelanggaran_insert');
create policy pelanggaran_insert on public.pelanggaran for insert to authenticated
  with check (public.has_role('guru','bk','admin') and pengusul_id = auth.uid());
select pg_temp.reset_policy('pelanggaran', 'pelanggaran_update');
-- Edit field non-status; status hanya via RPC (dijaga trigger).
create policy pelanggaran_update on public.pelanggaran for update to authenticated
  using ((pengusul_id = auth.uid() and status = 'menunggu_persetujuan') or public.has_role('bk','admin'))
  with check ((pengusul_id = auth.uid() and status = 'menunggu_persetujuan') or public.has_role('bk','admin'));
revoke delete on public.pelanggaran from authenticated;

-- ---------- pelanggaran_status_log (read-only; ditulis trigger) ----------
select pg_temp.reset_policy('pelanggaran_status_log', 'status_log_select');
create policy status_log_select on public.pelanggaran_status_log for select to authenticated
  using (exists (select 1 from public.pelanggaran p where p.id = pelanggaran_id));
revoke insert, update, delete on public.pelanggaran_status_log from authenticated;

-- ---------- tindak_lanjut ---------------------------------------------
select pg_temp.reset_policy('tindak_lanjut', 'tl_select');
create policy tl_select on public.tindak_lanjut for select to authenticated
  using (public.can_view_rekam_siswa(siswa_id));
select pg_temp.reset_policy('tindak_lanjut', 'tl_insert');
create policy tl_insert on public.tindak_lanjut for insert to authenticated
  with check (public.has_role('bk','admin'));
select pg_temp.reset_policy('tindak_lanjut', 'tl_update');
create policy tl_update on public.tindak_lanjut for update to authenticated
  using (public.has_role('bk','admin')) with check (public.has_role('bk','admin'));
revoke delete on public.tindak_lanjut from authenticated;

-- ---------- dokumen ----------------------------------------------------
select pg_temp.reset_policy('dokumen', 'dokumen_select');
create policy dokumen_select on public.dokumen for select to authenticated
  using (
    public.can_view_rekam_siswa(siswa_id)
    or diunggah_oleh = auth.uid()
    or (pelanggaran_id is not null and public.has_role('guru') and exists (
        select 1 from public.pelanggaran p where p.id = pelanggaran_id and p.pengusul_id = auth.uid()))
  );
select pg_temp.reset_policy('dokumen', 'dokumen_insert');
create policy dokumen_insert on public.dokumen for insert to authenticated
  with check (
    diunggah_oleh = auth.uid() and (
      public.has_role('bk','admin')
      or (public.has_role('guru') and pelanggaran_id is not null and exists (
          select 1 from public.pelanggaran p where p.id = pelanggaran_id
            and p.pengusul_id = auth.uid() and p.status = 'menunggu_persetujuan'))
    ));
revoke update, delete on public.dokumen from authenticated;

-- ---------- template_surat --------------------------------------------
select pg_temp.reset_policy('template_surat', 'template_select');
create policy template_select on public.template_surat for select to authenticated
  using (public.is_staff());
select pg_temp.reset_policy('template_surat', 'template_admin_write');
create policy template_admin_write on public.template_surat for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

-- ---------- surat ------------------------------------------------------
select pg_temp.reset_policy('surat', 'surat_select');
create policy surat_select on public.surat for select to authenticated
  using (public.is_staff() or (status = 'final' and public.can_view_rekam_siswa(siswa_id)));
select pg_temp.reset_policy('surat', 'surat_insert');
create policy surat_insert on public.surat for insert to authenticated
  with check (public.has_role('bk','admin') and dibuat_oleh = auth.uid());
select pg_temp.reset_policy('surat', 'surat_update');
create policy surat_update on public.surat for update to authenticated
  using (public.has_role('bk','admin') and status = 'draft')
  with check (public.has_role('bk','admin') and status in ('draft','dibatalkan'));
revoke delete on public.surat from authenticated;

-- ---------- remisi -----------------------------------------------------
select pg_temp.reset_policy('remisi', 'remisi_select');
create policy remisi_select on public.remisi for select to authenticated
  using (public.can_view_rekam_siswa(siswa_id));
select pg_temp.reset_policy('remisi', 'remisi_insert');
create policy remisi_insert on public.remisi for insert to authenticated
  with check (public.has_role('bk','admin') and dicatat_oleh = auth.uid());
revoke update, delete on public.remisi from authenticated;

-- ---------- notifikasi -------------------------------------------------
select pg_temp.reset_policy('notifikasi', 'notif_select_own');
create policy notif_select_own on public.notifikasi for select to authenticated
  using (user_id = auth.uid());
select pg_temp.reset_policy('notifikasi', 'notif_update_own');
create policy notif_update_own on public.notifikasi for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke insert, update, delete on public.notifikasi from authenticated;
grant update (dibaca_at) on public.notifikasi to authenticated;

-- ---------- push_subscriptions ----------------------------------------
select pg_temp.reset_policy('push_subscriptions', 'push_own');
create policy push_own on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- audit_log (append-only, baca terbatas) ---------------------
select pg_temp.reset_policy('audit_log', 'audit_select');
create policy audit_select on public.audit_log for select to authenticated
  using (public.has_role('admin','kepala_sekolah'));
revoke insert, update, delete, truncate on public.audit_log from authenticated;

-- ---------- RPC grants -------------------------------------------------
grant execute on function public.ubah_status_pelanggaran(uuid, public.status_pelanggaran, text) to authenticated;
grant execute on function public.finalisasi_surat(uuid) to authenticated;
grant execute on function public.set_tahun_ajaran_aktif(uuid) to authenticated;
grant execute on function public.rekap_poin_siswa(uuid, uuid) to authenticated;
grant execute on function public.dashboard_ringkasan(uuid) to authenticated;
grant select on public.v_arsip_pelanggaran to authenticated;

-- ---------- Storage: bucket privat ------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('arsip-dokumen', 'arsip-dokumen', false, 10485760,
        array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists arsip_dokumen_select on storage.objects;
create policy arsip_dokumen_select on storage.objects for select to authenticated
  using (bucket_id = 'arsip-dokumen' and (
    owner_id = auth.uid()::text
    or exists (select 1 from public.dokumen d where d.storage_path = name)));

drop policy if exists arsip_dokumen_insert on storage.objects;
create policy arsip_dokumen_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'arsip-dokumen'
    and (storage.foldername(name))[1] = 'siswa'
    and public.has_role('guru','bk','admin'));

-- Hanya untuk rollback upload yang gagal dicatat (object tanpa metadata).
drop policy if exists arsip_dokumen_delete_orphan on storage.objects;
create policy arsip_dokumen_delete_orphan on storage.objects for delete to authenticated
  using (bucket_id = 'arsip-dokumen' and owner_id = auth.uid()::text
    and not exists (select 1 from public.dokumen d where d.storage_path = name));
