"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function tandaiDibacaAction(fd: FormData) {
  await requireProfile();
  const supabase = await createClient();
  const id = z.uuid().safeParse(fd.get("id"));
  const q = supabase.from("notifikasi").update({ dibaca_at: new Date().toISOString() }).is("dibaca_at", null);
  // RLS membatasi ke notifikasi milik user sendiri.
  await (id.success ? q.eq("id", id.data) : q);
  revalidatePath("/", "layout");
}
