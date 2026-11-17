"use server";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formObject, passwordSchema, profilSchema } from "@/lib/validations";
import { type ActionState, pesanError, zodErrors } from "./types";

export async function updateProfilAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const profile = await requireProfile();
  const parsed = profilSchema.safeParse(formObject(fd));
  if (!parsed.success) return { ok: false, message: "Periksa kembali isian.", errors: zodErrors(parsed.error.issues) };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", profile.id);
  if (error) return { ok: false, message: pesanError(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: "Profil diperbarui." };
}

export async function gantiPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireProfile();
  const parsed = passwordSchema.safeParse(formObject(fd));
  if (!parsed.success) return { ok: false, message: "Periksa kembali isian.", errors: zodErrors(parsed.error.issues) };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, message: "Password gagal diganti. Gunakan password yang lebih kuat." };
  return { ok: true, message: "Password berhasil diganti." };
}
