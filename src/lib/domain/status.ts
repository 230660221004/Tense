import type { StatusPelanggaran, UserRole } from "./types";

/**
 * Cermin dari public.transisi_pelanggaran_diizinkan() (SQL) — alur klien:
 * Diusulkan → Sah / Ditolak oleh Tanse (role bk), satu tahap. Admin tidak memutuskan.
 * Database tetap penegak utama; kesetaraan diuji di tests/rls.
 */
export function transisiDiizinkan(dari: StatusPelanggaran, ke: StatusPelanggaran, role: UserRole, isPengusul: boolean): boolean {
  const tanse = role === "bk";
  if (dari === "menunggu_persetujuan" && (ke === "disahkan" || ke === "ditolak")) return tanse;
  if (dari === "menunggu_persetujuan" && ke === "dibatalkan") return role === "bk" || (isPengusul && role === "guru");
  if (dari === "disetujui" && (ke === "disahkan" || ke === "ditolak" || ke === "dibatalkan")) return tanse;
  if (dari === "disahkan" && ke === "dibatalkan") return role === "bk";
  return false;
}

export function aksiTersedia(dari: StatusPelanggaran, role: UserRole, isPengusul: boolean): StatusPelanggaran[] {
  const semua: StatusPelanggaran[] = ["disahkan", "ditolak", "dibatalkan"];
  return semua.filter((ke) => transisiDiizinkan(dari, ke, role, isPengusul));
}

/** Revisi (ubah pasal/keterangan lalu sahkan) hanya untuk Tanse pada usulan yang belum diputuskan. */
export function bolehRevisi(dari: StatusPelanggaran, role: UserRole) {
  return role === "bk" && (dari === "menunggu_persetujuan" || dari === "disetujui");
}

export const CATATAN_WAJIB: ReadonlySet<StatusPelanggaran> = new Set(["ditolak", "dibatalkan"]);

export const AKSI_LABEL: Record<StatusPelanggaran, string> = {
  menunggu_persetujuan: "Kembalikan",
  disetujui: "Setujui",
  disahkan: "Setujui (sah)",
  ditolak: "Tolak",
  dibatalkan: "Batalkan",
};
