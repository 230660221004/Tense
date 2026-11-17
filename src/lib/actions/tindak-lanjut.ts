"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PENGELOLA } from "@/lib/permissions";
import { formObject, statusTLSchema, tindakLanjutSchema } from "@/lib/validations";
import { type ActionState, pesanError, zodErrors } from "./types";

export async function buatTindakLanjutAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const profile = await requireRole(PENGELOLA);
  const parsed = tindakLanjutSchema.safeParse(formObject(fd));
  if (!parsed.success) return { ok: false, message: "Periksa kembali isian.", errors: zodErrors(parsed.error.issues) };
  const supabase = await createClient();
  const { error } = await supabase.from("tindak_lanjut").insert({ ...parsed.data, dibuat_oleh: profile.id });
  if (error) return { ok: false, message: pesanError(error, "Tindak lanjut gagal disimpan.") };
  revalidatePath("/tindak-lanjut");
  revalidatePath(`/siswa/${parsed.data.siswa_id}`);
  return { ok: true, message: "Tindak lanjut dibuat. Poin saat ini tersimpan sebagai snapshot." };
}

export async function ubahStatusTLAction(fd: FormData) {
  await requireRole(PENGELOLA);
  const parsed = statusTLSchema.safeParse(formObject(fd));
  if (!parsed.success) return;
  const supabase = await createClient();
  const { error } = await supabase.from("tindak_lanjut").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  if (error) redirect(`/tindak-lanjut?galat=${encodeURIComponent(pesanError(error, "Status tindak lanjut gagal diubah."))}`);
  revalidatePath("/tindak-lanjut");
  revalidatePath("/dashboard");
}
