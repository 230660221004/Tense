create or replace function public.ubah_pengajuan_remisi(p_id uuid, p_alasan text, p_dokumen uuid default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare r public.remisi_pengajuan;
begin
  select * into r from public.remisi_pengajuan where id = p_id for update;
  if not found then raise exception 'Pengajuan tidak ditemukan' using errcode = 'P0002'; end if;
  if r.diajukan_oleh is distinct from auth.uid() then
    raise exception 'Hanya pengaju yang dapat mengubah pengajuan' using errcode = '42501';
  end if;
  if r.status not in ('diajukan','perlu_perbaikan') then
    raise exception 'Pengajuan yang sudah diverifikasi tidak dapat diubah' using errcode = '22023';
  end if;
  if p_alasan is null or length(btrim(p_alasan)) = 0 then
    raise exception 'Alasan wajib diisi' using errcode = '22023';
  end if;
  if p_dokumen is not null and not exists (
      select 1 from public.dokumen d where d.id = p_dokumen and d.siswa_id = r.siswa_id and d.jenis = 'surat_remisi') then
    raise exception 'Surat pendukung harus berjenis surat remisi dan milik siswa yang sama' using errcode = '22023';
  end if;
  update public.remisi_pengajuan
     set alasan = btrim(p_alasan), dokumen_id = coalesce(p_dokumen, dokumen_id), status = 'diajukan'
   where id = p_id;
end $$;

create or replace function public.tarik_remisi(p_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare r public.remisi_pengajuan;
begin
  select * into r from public.remisi_pengajuan where id = p_id for update;
  if not found then raise exception 'Pengajuan tidak ditemukan' using errcode = 'P0002'; end if;
  if r.diajukan_oleh is distinct from auth.uid() then
    raise exception 'Hanya pengaju yang dapat menarik pengajuan' using errcode = '42501';
  end if;
  if r.status not in ('diajukan','perlu_perbaikan') then
    raise exception 'Pengajuan ini sudah diproses dan tidak dapat ditarik' using errcode = '22023';
  end if;
  update public.remisi_pengajuan set status = 'ditarik' where id = p_id;
end $$;

revoke execute on function public.ubah_pengajuan_remisi(uuid, text, uuid) from public, anon;
revoke execute on function public.tarik_remisi(uuid) from public, anon;
grant execute on function public.ubah_pengajuan_remisi(uuid, text, uuid) to authenticated;
grant execute on function public.tarik_remisi(uuid) to authenticated;