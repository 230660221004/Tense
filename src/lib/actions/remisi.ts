"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PEMUTUS_REMISI, PENGAJU_REMISI, PENGELOLA } from "@/lib/permissions";
import { ajukanRemisiSchema, formObject, perbaikiRemisiSchema, putuskanRemisiSchema, verifikasiRemisiSchema } from "@/lib/validations";
import { simpanDokumen } from "./dokumen-core";
import { type ActionState, pesanError, zodErrors } from "./types";

// Catatan: tabel `remisi` (pengurang poin) tidak lagi ditulis dari aplikasi. Baris remisi hanya dibuat
// oleh fungsi database putuskan_remisi() ketika kepala sekolah menyetujui pengajuan.

function segarkan(siswaId?: string | null) {
  revalidatePath("/remisi");
  revalidatePath("/dashboard");
  revalidatePath("/notifikasi");
  if (siswaId) revalidatePath(`/siswa/${siswaId}`);
}

/** Siswa / orang tua mengajukan remisi beserta surat pendukung. */
export async function ajukanRemisiAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const profile = await requireRole(PENGAJU_REMISI);
  const parsed = ajukanRemisiSchema.safeParse(formObject(fd));
  if (!parsed.success) return { ok: false, message: "Periksa kembali isian.", errors: zodErrors(parsed.error.issues) };
  const supabase = await createClient();
  const dok = await simpanDokumen(supabase, profile.id, fd.get("file"), { siswa_id: parsed.data.siswa_id, jenis: "surat_remisi", judul: "Surat pengajuan remisi" });
  if (!dok.ok) return { ok: false, message: dok.message, errors: { file: dok.message } };
  const { error } = await supabase.rpc("ajukan_remisi", { p_siswa: parsed.data.siswa_id, p_alasan: parsed.data.alasan, p_dokumen: dok.id });
  if (error) return { ok: false, message: pesanError(error, "Pengajuan remisi gagal dikirim.") };
  segarkan(parsed.data.siswa_id);
  return { ok: true, message: "Pengajuan terkirim. Tanse akan memverifikasinya." };
}

/** Pengaju memperbaiki pengajuan yang dikembalikan Tanse (surat baru bersifat opsional). */
export async function perbaikiRemisiAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const profile = await requireRole(PENGAJU_REMISI);
  const parsed = perbaikiRemisiSchema.safeParse(formObject(fd));
  if (!parsed.success) return { ok: false, message: "Periksa kembali isian.", errors: zodErrors(parsed.error.issues) };
  const supabase = await createClient();
  const { data: aju } = await supabase.from("remisi_pengajuan").select("siswa_id").eq("id", parsed.data.id).maybeSingle();
  if (!aju) return { ok: false, message: "Pengajuan tidak ditemukan." };

  let dokumenId: string | undefined;
  const file = fd.get("file");
  if (file instanceof File && file.size > 0) {
    const dok = await simpanDokumen(supabase, profile.id, file, { siswa_id: aju.siswa_id, jenis: "surat_remisi", judul: "Surat pengajuan remisi (perbaikan)" });
    if (!dok.ok) return { ok: false, message: dok.message, errors: { file: dok.message } };
    dokumenId = dok.id;
  }
  const { error } = await supabase.rpc("perbaiki_remisi", { p_id: parsed.data.id, p_alasan: parsed.data.alasan, p_dokumen: dokumenId });
  if (error) return { ok: false, message: pesanError(error, "Perbaikan gagal dikirim.") };
  segarkan(aju.siswa_id);
  return { ok: true, message: "Perbaikan terkirim ke Tanse." };
}

/** Pengaju mengubah pengajuan yang belum diverifikasi Tanse (surat baru opsional). */
export async function ubahRemisiAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const profile = await requireRole(PENGAJU_REMISI);
  // Bentuk isiannya sama dengan perbaikan: id + alasan.
  const parsed = perbaikiRemisiSchema.safeParse(formObject(fd));
  if (!parsed.success) return { ok: false, message: "Periksa kembali isian.", errors: zodErrors(parsed.error.issues) };
  const supabase = await createClient();
  const { data: aju } = await supabase.from("remisi_pengajuan").select("siswa_id").eq("id", parsed.data.id).maybeSingle();
  if (!aju) return { ok: false, message: "Pengajuan tidak ditemukan." };

  let dokumenId: string | undefined;
  const file = fd.get("file");
  if (file instanceof File && file.size > 0) {
    const dok = await simpanDokumen(supabase, profile.id, file, { siswa_id: aju.siswa_id, jenis: "surat_remisi", judul: "Surat pengajuan remisi (diubah)" });
    if (!dok.ok) return { ok: false, message: dok.message, errors: { file: dok.message } };
    dokumenId = dok.id;
  }
  const { error } = await supabase.rpc("ubah_pengajuan_remisi", { p_id: parsed.data.id, p_alasan: parsed.data.alasan, p_dokumen: dokumenId });
  if (error) return { ok: false, message: pesanError(error, "Perubahan gagal disimpan.") };
  segarkan(aju.siswa_id);
  return { ok: true, message: "Pengajuan diperbarui." };
}

/** Pengaju menarik pengajuan yang belum diputuskan (status menjadi `ditarik`, riwayat tetap ada). */
export async function tarikRemisiAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireRole(PENGAJU_REMISI);
  const id = String(fd.get("id") ?? "");
  if (!id) return { ok: false, message: "Pengajuan tidak valid." };
  if (fd.get("konfirmasi") !== "ya") return { ok: false, message: "Centang konfirmasi untuk menarik pengajuan.", errors: { konfirmasi: "Wajib dikonfirmasi." } };
  const supabase = await createClient();
  const { data: aju } = await supabase.from("remisi_pengajuan").select("siswa_id").eq("id", id).maybeSingle();
  const { error } = await supabase.rpc("tarik_remisi", { p_id: id });
  if (error) return { ok: false, message: pesanError(error, "Pengajuan gagal ditarik.") };
  segarkan(aju?.siswa_id);
  return { ok: true, message: "Pengajuan ditarik." };
}

/** Tanse: rekomendasikan ke kepala sekolah, minta perbaikan, atau tolak. */
export async function verifikasiRemisiAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireRole(PENGELOLA);
  const parsed = verifikasiRemisiSchema.safeParse(formObject(fd));
  if (!parsed.success) return { ok: false, message: "Periksa kembali isian.", errors: zodErrors(parsed.error.issues) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("verifikasi_remisi", {
    p_id: parsed.data.id,
    p_aksi: parsed.data.aksi,
    p_poin: parsed.data.aksi === "rekomendasi" ? (parsed.data.poin as number) : (null as unknown as number),
    p_catatan: parsed.data.catatan ?? "",
  });
  if (error) return { ok: false, message: pesanError(error, "Verifikasi gagal disimpan.") };
  segarkan();
  const pesan = { rekomendasi: "Direkomendasikan ke kepala sekolah.", perbaikan: "Dikembalikan ke pengaju untuk diperbaiki.", tolak: "Pengajuan ditolak." } as const;
  return { ok: true, message: pesan[parsed.data.aksi] };
}

/** Kepala sekolah: setujui (poin dapat disesuaikan) atau tolak. */
export async function putuskanRemisiAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireRole(PEMUTUS_REMISI);
  const parsed = putuskanRemisiSchema.safeParse(formObject(fd));
  if (!parsed.success) return { ok: false, message: "Periksa kembali isian.", errors: zodErrors(parsed.error.issues) };
  const setuju = parsed.data.keputusan === "setuju";
  const supabase = await createClient();
  const { error } = await supabase.rpc("putuskan_remisi", {
    p_id: parsed.data.id,
    p_setuju: setuju,
    p_poin: (setuju ? parsed.data.poin : null) as unknown as number, // null → memakai poin rekomendasi Tanse
    p_catatan: parsed.data.catatan ?? "",
  });
  if (error) return { ok: false, message: pesanError(error, "Keputusan gagal disimpan.") };
  segarkan();
  return { ok: true, message: setuju ? "Remisi disetujui; poin siswa berkurang." : "Remisi ditolak." };
}