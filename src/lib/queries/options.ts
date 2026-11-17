import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Opsi siswa aktif (dikelompokkan label kelas) untuk form. RLS berlaku. */
export async function opsiSiswa(taId?: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("siswa").select("id, nis, nama_lengkap, kelas:kelas_id(nama, tahun_ajaran_id)").order("nama_lengkap");
  return (data ?? [])
    .filter((s) => !taId || s.kelas?.tahun_ajaran_id === taId)
    .map((s) => ({ value: s.id, label: `${s.nama_lengkap} — ${s.nis} (${s.kelas?.nama ?? "tanpa kelas"})` }));
}
