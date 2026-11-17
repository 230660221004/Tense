"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { dokumenMetaSchema, formObject } from "@/lib/validations";
import { simpanDokumen } from "./dokumen-core";
import { type ActionState, zodErrors } from "./types";

export async function uploadDokumenAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const profile = await requireRole(["bk", "guru"]);
  const parsed = dokumenMetaSchema.safeParse(formObject(fd));
  if (!parsed.success) return { ok: false, message: "Periksa kembali isian.", errors: zodErrors(parsed.error.issues) };
  const supabase = await createClient();
  const res = await simpanDokumen(supabase, profile.id, fd.get("file"), parsed.data);
  if (!res.ok) return { ok: false, message: res.message, errors: { file: res.message } };
  revalidatePath("/dokumen");
  revalidatePath(`/siswa/${parsed.data.siswa_id}`);
  if (parsed.data.pelanggaran_id) revalidatePath(`/arsip/${parsed.data.pelanggaran_id}`);
  return { ok: true, message: "Dokumen berhasil diunggah." };
}
