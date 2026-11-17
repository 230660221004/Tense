import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { BUCKET } from "@/lib/actions/dokumen-core";

/** Unduh dokumen: otorisasi via RLS tabel dokumen → signed URL 60 detik. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/dokumen/[id]">) {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  const supabase = await createClient();
  const { data: dok } = await supabase.from("dokumen").select("storage_path, nama_file").eq("id", id).maybeSingle();
  if (!dok) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(dok.storage_path, 60, { download: dok.nama_file });
  if (error || !data) return NextResponse.json({ error: "Gagal membuat tautan unduhan" }, { status: 500 });
  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "no-store" } });
}
