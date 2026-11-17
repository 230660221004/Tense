"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/session";
import { TA_COOKIE } from "@/lib/queries/tahun-ajaran";
import type { ActionState } from "./types";
import { zodErrors } from "./types";

const loginSchema = z.object({
  email: z.email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  next: z.string().optional(),
});

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Periksa kembali isian.", errors: zodErrors(parsed.error.issues) };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error || !data.user) return { ok: false, message: "Email atau password salah." };
  const { data: profile } = await supabase.from("profiles").select("aktif").eq("id", data.user.id).maybeSingle();
  if (!profile?.aktif) {
    await supabase.auth.signOut();
    return { ok: false, message: "Akun tidak aktif. Hubungi admin sekolah." };
  }
  const next = parsed.data.next;
  // Hanya path internal: awali "/" dan bukan "//" atau "/\\" (diperlakukan browser sebagai host lain).
  redirect(next && /^\/(?![/\\])/.test(next) ? next : "/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function pilihTahunAjaranAction(formData: FormData) {
  await requireProfile();
  const id = z.uuid().safeParse(formData.get("ta_id"));
  if (!id.success) return;
  (await cookies()).set(TA_COOKIE, id.data, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 180 });
  revalidatePath("/", "layout");
}
