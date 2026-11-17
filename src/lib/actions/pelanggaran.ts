"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PENGUSUL } from "@/lib/permissions";
import { formObject, keputusanSchema, pelanggaranSchema, revisiSchema } from "@/lib/validations";
import { simpanDokumen } from "./dokumen-core";
import { type ActionState, pesanError, zodErrors } from "./types";

export async function buatPelanggaranAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const profile = await requireRole(PENGUSUL);
  const parsed = pelanggaranSchema.safeParse(formObject(fd));
  if (!parsed.success) return { ok: false, message: "Periksa kembali isian.", errors: zodErrors(parsed.error.issues) };
  const supabase = await createClient();
  // poin, kelas, tahun ajaran, status, jalur ditetapkan trigger DB (tidak dipercaya dari client).
  const { data, error } = await supabase
    .from("pelanggaran")
    .insert({ ...parsed.data, pengusul_id: profile.id, poin: 0 })
    .select("id, siswa_id, status")
    .single();
  if (error || !data) return { ok: false, message: pesanError(error, "Usulan gagal disimpan.") };

  const bukti = fd.get("bukti");
  if (bukti instanceof File && bukti.size > 0) {
    const res = await simpanDokumen(supabase, profile.id, bukti, { siswa_id: data.siswa_id, pelanggaran_id: data.id, jenis: "bukti_pelanggaran", judul: "Bukti pelanggaran" });
    if (!res.ok) {
      revalidatePath("/arsip");
      redirect(`/arsip/${data.id}?pesan=${encodeURIComponent(`Usulan tersimpan, tetapi bukti gagal diunggah: ${res.message}`)}`);
    }
  }
  revalidatePath("/arsip");
  revalidatePath("/dashboard");
  const pesan = data.status === "disahkan" ? "Input langsung tersimpan. Poin langsung sah dan masuk ke total siswa." : "Usulan tersimpan dengan status Diusulkan. Poin belum bertambah sampai disetujui Tanse.";
  redirect(`/arsip/${data.id}?pesan=${encodeURIComponent(pesan)}`);
}

export async function revisiAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireRole(["bk"]);
  const parsed = revisiSchema.safeParse(formObject(fd));
  if (!parsed.success) return { ok: false, message: "Periksa kembali isian.", errors: zodErrors(parsed.error.issues) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("revisi_dan_sahkan_pelanggaran", {
    p_id: parsed.data.id,
    p_jenis_pelanggaran_id: parsed.data.jenis_pelanggaran_id,
    p_deskripsi: parsed.data.deskripsi,
    ...(parsed.data.catatan ? { p_catatan: parsed.data.catatan } : {}),
  });
  if (error) return { ok: false, message: pesanError(error, "Revisi gagal disimpan.") };
  revalidatePath("/persetujuan");
  revalidatePath("/dashboard");
  redirect(`/arsip/${parsed.data.id}?pesan=${encodeURIComponent("Usulan direvisi dan disahkan. Poin masuk ke total siswa.")}`);
}

export async function ubahStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireRole(["bk", "guru"]);
  const parsed = keputusanSchema.safeParse(formObject(fd));
  if (!parsed.success) return { ok: false, message: "Periksa kembali isian.", errors: zodErrors(parsed.error.issues) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("ubah_status_pelanggaran", {
    p_id: parsed.data.id,
    p_status: parsed.data.status,
    ...(parsed.data.catatan ? { p_catatan: parsed.data.catatan } : {}),
  });
  if (error) return { ok: false, message: pesanError(error, "Status gagal diperbarui.") };
  revalidatePath(`/arsip/${parsed.data.id}`);
  revalidatePath("/persetujuan");
  revalidatePath("/dashboard");
  // Redirect agar pesan tetap tampil walau panel keputusan hilang (tidak ada aksi lanjutan).
  redirect(`/arsip/${parsed.data.id}?pesan=${encodeURIComponent("Status berhasil diperbarui.")}`);
}
