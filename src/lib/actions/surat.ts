"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PENGELOLA } from "@/lib/permissions";
import { formObject, suratDraftSchema, suratEditSchema } from "@/lib/validations";
import { formatTanggal, isiTemplate } from "@/lib/utils/format";
import { type ActionState, pesanError, zodErrors } from "./types";

export async function buatDraftSuratAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const profile = await requireRole(PENGELOLA);
  const parsed = suratDraftSchema.safeParse(formObject(fd));
  if (!parsed.success) return { ok: false, message: "Periksa kembali isian.", errors: zodErrors(parsed.error.issues) };
  const supabase = await createClient();
  const [{ data: tpl }, { data: siswa }, { data: ta }] = await Promise.all([
    supabase.from("template_surat").select("*").eq("jenis", parsed.data.jenis).eq("aktif", true).maybeSingle(),
    supabase.from("siswa").select("id, nama_lengkap, nis, nama_orang_tua, kelas:kelas_id(nama)").eq("id", parsed.data.siswa_id).maybeSingle(),
    supabase.from("tahun_ajaran").select("id").eq("aktif", true).maybeSingle(),
  ]);
  if (!tpl) return { ok: false, message: "Template aktif untuk jenis surat ini belum tersedia. Admin dapat menambahkannya di Master › Template Surat." };
  if (!siswa) return { ok: false, message: "Siswa tidak ditemukan." };
  const rekap = ta ? (await supabase.rpc("rekap_poin_siswa", { p_tahun_ajaran_id: ta.id, p_siswa_id: siswa.id })).data?.[0] : undefined;
  const { data: sah } = ta
    ? await supabase.from("pelanggaran").select("tanggal_kejadian, poin, jenis:jenis_pelanggaran_id(pasal, nama)").eq("siswa_id", siswa.id).eq("tahun_ajaran_id", ta.id).eq("status", "disahkan").order("tanggal_kejadian")
    : { data: [] };
  const daftar = (sah ?? []).map((p, i) => `${i + 1}. ${formatTanggal(p.tanggal_kejadian)} — Pasal ${p.jenis?.pasal} ${p.jenis?.nama} (${p.poin} poin)`).join("\n") || "-";
  const isi = isiTemplate(tpl.isi, {
    nama_siswa: siswa.nama_lengkap,
    nis: siswa.nis,
    kelas: siswa.kelas?.nama ?? "-",
    nama_orang_tua: siswa.nama_orang_tua ?? "Orang Tua/Wali",
    total_poin: String(rekap?.poin_bersih ?? 0),
    daftar_pelanggaran: daftar,
    keterangan: parsed.data.keterangan ?? "-",
    tempat_tanggal: formatTanggal(new Date().toISOString(), { day: "numeric", month: "long", year: "numeric" }),
  });
  const { data, error } = await supabase
    .from("surat")
    .insert({ siswa_id: siswa.id, jenis: parsed.data.jenis, tindak_lanjut_id: parsed.data.tindak_lanjut_id, judul: tpl.judul, isi, dibuat_oleh: profile.id })
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: pesanError(error, "Draft surat gagal dibuat.") };
  revalidatePath("/surat");
  redirect(`/surat/${data.id}`);
}

export async function simpanDraftSuratAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireRole(PENGELOLA);
  const parsed = suratEditSchema.safeParse(formObject(fd));
  if (!parsed.success) return { ok: false, message: "Periksa kembali isian.", errors: zodErrors(parsed.error.issues) };
  const supabase = await createClient();
  const { error, count } = await supabase.from("surat").update({ judul: parsed.data.judul, isi: parsed.data.isi }, { count: "exact" }).eq("id", parsed.data.id).eq("status", "draft");
  if (error || !count) return { ok: false, message: pesanError(error, "Draft tidak dapat disimpan (mungkin sudah final).") };
  revalidatePath(`/surat/${parsed.data.id}`);
  return { ok: true, message: "Draft tersimpan." };
}

export async function finalisasiSuratAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireRole(PENGELOLA);
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return { ok: false, message: "Surat tidak valid." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("finalisasi_surat", { p_id: id.data });
  if (error) return { ok: false, message: pesanError(error, "Finalisasi gagal.") };
  revalidatePath(`/surat/${id.data}`);
  revalidatePath("/surat");
  redirect(`/surat/${id.data}?pesan=${encodeURIComponent("Surat difinalisasi dan diberi nomor.")}`);
}

export async function batalkanSuratAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireRole(PENGELOLA);
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return { ok: false, message: "Surat tidak valid." };
  const supabase = await createClient();
  const { error, count } = await supabase.from("surat").update({ status: "dibatalkan" }, { count: "exact" }).eq("id", id.data).eq("status", "draft");
  if (error || !count) return { ok: false, message: pesanError(error, "Hanya draft yang dapat dibatalkan.") };
  revalidatePath(`/surat/${id.data}`);
  revalidatePath("/surat");
  redirect(`/surat/${id.data}?pesan=${encodeURIComponent("Draft dibatalkan.")}`);
}
