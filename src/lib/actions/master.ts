"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  formObject, jenisPelanggaranSchema, kelasSchema, ortuLinkSchema, penggunaBaruSchema, penggunaEditSchema,
  siswaSchema, tahunAjaranSchema, templateSuratSchema, tingkatSanksiSchema,
} from "@/lib/validations";
import { type ActionState, pesanError, zodErrors } from "./types";

const ADMIN = ["admin"] as const;
type Table = "tahun_ajaran" | "kelas" | "siswa" | "jenis_pelanggaran" | "tingkat_sanksi" | "template_surat";

async function upsert(table: Table, path: string, values: Record<string, unknown> & { id: string | null }, label: string): Promise<ActionState> {
  await requireRole(ADMIN);
  const supabase = await createClient();
  const { id, ...rest } = values;
  // Tipe tabel bervariasi; payload sudah divalidasi Zod per entitas.
  const q = id
    ? supabase.from(table).update(rest as never).eq("id", id)
    : supabase.from(table).insert(rest as never);
  const { error } = await q;
  if (error) return { ok: false, message: pesanError(error, `${label} gagal disimpan.`) };
  revalidatePath(path);
  return { ok: true, message: `${label} ${id ? "diperbarui" : "ditambahkan"}.` };
}

function invalid(issues: { path: PropertyKey[]; message: string }[]): ActionState {
  return { ok: false, message: "Periksa kembali isian.", errors: zodErrors(issues) };
}

export async function simpanTahunAjaranAction(_: ActionState, fd: FormData) {
  const p = tahunAjaranSchema.safeParse(formObject(fd));
  return p.success ? upsert("tahun_ajaran", "/master/tahun-ajaran", p.data, "Tahun ajaran") : invalid(p.error.issues);
}
export async function aktifkanTahunAjaranAction(fd: FormData) {
  await requireRole(ADMIN);
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_tahun_ajaran_aktif", { p_id: id.data });
  if (error) redirect(`/master/tahun-ajaran?galat=${encodeURIComponent(pesanError(error, "Tahun ajaran gagal diaktifkan."))}`);
  revalidatePath("/", "layout");
}
export async function simpanKelasAction(_: ActionState, fd: FormData) {
  const p = kelasSchema.safeParse(formObject(fd));
  return p.success ? upsert("kelas", "/master/kelas", p.data, "Kelas") : invalid(p.error.issues);
}
export async function simpanSiswaAction(_: ActionState, fd: FormData) {
  const p = siswaSchema.safeParse(formObject(fd));
  return p.success ? upsert("siswa", "/master/siswa", p.data, "Data siswa") : invalid(p.error.issues);
}
export async function simpanJenisPelanggaranAction(_: ActionState, fd: FormData) {
  const p = jenisPelanggaranSchema.safeParse(formObject(fd, ["aktif"]));
  return p.success ? upsert("jenis_pelanggaran", "/master/jenis-pelanggaran", p.data, "Jenis pelanggaran") : invalid(p.error.issues);
}
export async function simpanTingkatSanksiAction(_: ActionState, fd: FormData) {
  const p = tingkatSanksiSchema.safeParse(formObject(fd, ["aktif"]));
  return p.success ? upsert("tingkat_sanksi", "/master/tingkat-sanksi", p.data, "Tingkat sanksi") : invalid(p.error.issues);
}
export async function simpanTemplateSuratAction(_: ActionState, fd: FormData) {
  const p = templateSuratSchema.safeParse(formObject(fd, ["aktif"]));
  return p.success ? upsert("template_surat", "/master/template-surat", p.data, "Template surat") : invalid(p.error.issues);
}

export async function hubungkanOrtuAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireRole(ADMIN);
  const p = ortuLinkSchema.safeParse(formObject(fd));
  if (!p.success) return invalid(p.error.issues);
  const supabase = await createClient();
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", p.data.orang_tua_id).maybeSingle();
  if (prof?.role !== "orang_tua") return { ok: false, message: "Akun yang dipilih bukan role orang tua." };
  const { error } = await supabase.from("orang_tua_siswa").insert(p.data);
  if (error) return { ok: false, message: pesanError(error, "Relasi gagal disimpan.") };
  revalidatePath("/master/pengguna");
  return { ok: true, message: "Orang tua terhubung dengan siswa." };
}

/** Pembuatan akun memerlukan service role (auth.admin) — hanya setelah verifikasi role admin di server. */
export async function buatPenggunaAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireRole(ADMIN);
  const p = penggunaBaruSchema.safeParse(formObject(fd));
  if (!p.success) return invalid(p.error.issues);
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, message: "SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di server." };
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: p.data.email,
    password: p.data.password,
    email_confirm: true,
    user_metadata: { nama_lengkap: p.data.nama_lengkap },
  });
  if (error || !data.user) return { ok: false, message: error?.message?.includes("already") ? "Email sudah terdaftar." : "Akun gagal dibuat." };
  // Role ditetapkan lewat client sesi admin → audit_log mencatat pelaku.
  const supabase = await createClient();
  const { error: e2 } = await supabase.from("profiles").update({ role: p.data.role, nama_lengkap: p.data.nama_lengkap, no_hp: p.data.no_hp }).eq("id", data.user.id);
  if (e2) return { ok: false, message: pesanError(e2, "Akun dibuat, tetapi role gagal diset.") };
  revalidatePath("/master/pengguna");
  return { ok: true, message: `Akun ${p.data.email} dibuat.` };
}

export async function ubahPenggunaAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireRole(ADMIN);
  const p = penggunaEditSchema.safeParse(formObject(fd, ["aktif"]));
  if (!p.success) return invalid(p.error.issues);
  if (p.data.id === me.id && (!p.data.aktif || p.data.role !== "admin")) return { ok: false, message: "Tidak dapat menonaktifkan atau menurunkan role akun sendiri." };
  const supabase = await createClient();
  const { id, ...rest } = p.data;
  const { error } = await supabase.from("profiles").update(rest).eq("id", id);
  if (error) return { ok: false, message: pesanError(error) };
  revalidatePath("/master/pengguna");
  return { ok: true, message: "Akun diperbarui." };
}
