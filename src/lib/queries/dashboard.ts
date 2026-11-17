import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { STATUS_PELANGGARAN } from "@/lib/domain/types";

const ringkasanSchema = z.object({
  total_siswa_aktif: z.number(),
  pelanggaran_sah: z.number(),
  pelanggaran_semua: z.number(),
  menunggu_keputusan: z.number(),
  menunggu_pengesahan: z.number(),
  total_poin_sah: z.number(),
  total_poin_bersih: z.number(),
  tindak_lanjut_berjalan: z.number(),
  tren_bulanan: z.array(z.object({ bulan: z.string(), disahkan: z.number(), proses: z.number(), poin: z.number() })),
  distribusi_pasal: z.array(z.object({ pasal: z.number(), jumlah: z.number(), poin: z.number() })),
  distribusi_status: z.array(z.object({ status: z.enum(STATUS_PELANGGARAN), jumlah: z.number() })),
  per_tingkat: z.array(z.object({ tingkat: z.number(), jumlah: z.number(), poin: z.number() })),
});
export type Ringkasan = z.infer<typeof ringkasanSchema>;

export async function getRingkasan(taId: string): Promise<Ringkasan> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dashboard_ringkasan", { p_tahun_ajaran_id: taId });
  if (error) throw new Error(error.message);
  return ringkasanSchema.parse(data);
}

/** Siswa yang mencapai ambang aktif (peringatan dini 50, skorsing 75 — dari tingkat_sanksi). */
export async function getPeringatan(taId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("siswa_ambang", { p_tahun_ajaran_id: taId });
  if (error) throw new Error(error.message);
  if (!data?.length) return [];
  const { data: siswa } = await supabase.from("siswa").select("id, nama_lengkap, nis, kelas:kelas_id(nama)").in("id", data.map((d) => d.siswa_id));
  return data.map((d) => {
    const s = siswa?.find((x) => x.id === d.siswa_id);
    return { ...d, nama: s?.nama_lengkap ?? "—", nis: s?.nis ?? "", kelas: s?.kelas?.nama ?? "—" };
  });
}

export async function getTopSiswa(taId: string, limit = 5) {
  const supabase = await createClient();
  const { data: rekap, error } = await supabase.rpc("rekap_poin_siswa", { p_tahun_ajaran_id: taId });
  if (error) throw new Error(error.message);
  const top = (rekap ?? []).filter((r) => r.poin_bersih > 0).sort((a, b) => b.poin_bersih - a.poin_bersih).slice(0, limit);
  if (top.length === 0) return [];
  const { data: siswa } = await supabase.from("siswa").select("id, nama_lengkap, nis, kelas:kelas_id(nama)").in("id", top.map((t) => t.siswa_id));
  return top.map((t) => {
    const s = siswa?.find((x) => x.id === t.siswa_id);
    return { ...t, nama: s?.nama_lengkap ?? "—", nis: s?.nis ?? "", kelas: s?.kelas?.nama ?? "—" };
  });
}
