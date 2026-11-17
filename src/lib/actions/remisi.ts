"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PENGELOLA } from "@/lib/permissions";
import { formObject, remisiSchema } from "@/lib/validations";
import { simpanDokumen } from "./dokumen-core";
import { type ActionState, pesanError, zodErrors } from "./types";

export async function buatRemisiAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const profile = await requireRole(PENGELOLA);
  const parsed = remisiSchema.safeParse(formObject(fd));
  if (!parsed.success) return { ok: false, message: "Periksa kembali isian.", errors: zodErrors(parsed.error.issues) };
  const supabase = await createClient();

  // Validasi awal poin bersih (DB tetap memvalidasi ulang di trigger).
  const { data: ta } = await supabase.from("tahun_ajaran").select("id").lte("tanggal_mulai", parsed.data.tanggal).gte("tanggal_selesai", parsed.data.tanggal).order("aktif", { ascending: false }).limit(1).maybeSingle();
  if (!ta) return { ok: false, message: "Tanggal remisi di luar tahun ajaran yang terdaftar.", errors: { tanggal: "Di luar tahun ajaran" } };
  const { data: rekap } = await supabase.rpc("rekap_poin_siswa", { p_tahun_ajaran_id: ta.id, p_siswa_id: parsed.data.siswa_id });
  const bersih = rekap?.[0]?.poin_bersih ?? 0;
  if (parsed.data.jumlah_poin > bersih) return { ok: false, message: `Remisi melebihi poin bersih siswa (${bersih}).`, errors: { jumlah_poin: `Maksimal ${bersih}` } };

  let dokumenId = parsed.data.surat_dokumen_id;
  if (!dokumenId) {
    const res = await simpanDokumen(supabase, profile.id, fd.get("file"), { siswa_id: parsed.data.siswa_id, jenis: "surat_remisi", judul: "Surat pendukung remisi" });
    if (!res.ok) return { ok: false, message: res.message, errors: { file: res.message } };
    dokumenId = res.id;
  }
  const { error } = await supabase.from("remisi").insert({
    siswa_id: parsed.data.siswa_id,
    jumlah_poin: parsed.data.jumlah_poin,
    keterangan: parsed.data.keterangan,
    tanggal: parsed.data.tanggal,
    surat_dokumen_id: dokumenId,
    dicatat_oleh: profile.id,
  });
  if (error) return { ok: false, message: pesanError(error, "Remisi gagal disimpan.") };
  revalidatePath("/remisi");
  revalidatePath(`/siswa/${parsed.data.siswa_id}`);
  revalidatePath("/dashboard");
  return { ok: true, message: "Remisi tercatat." };
}
