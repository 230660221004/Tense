import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { checkFile } from "@/lib/validations/file";
import type { JenisDokumen } from "@/lib/domain/types";
import { pesanError } from "./types";

export const BUCKET = "arsip-dokumen";

export async function simpanDokumen(
  supabase: SupabaseClient<Database>,
  userId: string,
  file: unknown,
  meta: { siswa_id: string; jenis: JenisDokumen; judul: string; pelanggaran_id?: string | null; tindak_lanjut_id?: string | null },
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const check = await checkFile(file);
  if (!check.ok) return check;
  const path = `siswa/${meta.siswa_id}/${randomUUID()}-${check.name}`;
  const up = await supabase.storage.from(BUCKET).upload(path, check.bytes, { contentType: check.mime, upsert: false });
  if (up.error) return { ok: false, message: "Upload gagal: Anda tidak memiliki izin atau file ditolak." };
  const { data, error } = await supabase
    .from("dokumen")
    .insert({
      siswa_id: meta.siswa_id,
      pelanggaran_id: meta.pelanggaran_id ?? null,
      tindak_lanjut_id: meta.tindak_lanjut_id ?? null,
      jenis: meta.jenis,
      judul: meta.judul,
      nama_file: check.name,
      storage_path: path,
      mime_type: check.mime,
      ukuran_bytes: check.bytes.byteLength,
      diunggah_oleh: userId,
    })
    .select("id")
    .single();
  if (error || !data) {
    await supabase.storage.from(BUCKET).remove([path]); // rollback object yatim
    return { ok: false, message: pesanError(error, "Metadata dokumen gagal disimpan.") };
  }
  return { ok: true, id: data.id };
}
