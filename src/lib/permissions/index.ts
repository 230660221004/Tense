import type { UserRole } from "@/lib/domain/types";

export const STAFF: UserRole[] = ["admin", "bk", "kepala_sekolah"];
// Sesuai wawancara: guru/wali kelas mengusulkan; Tanse (bk) memutuskan, merevisi, input langsung,
// tindak lanjut, dan surat. Remisi: diajukan siswa/orang tua, diverifikasi Tanse, diputuskan kepala sekolah. Admin = akun & data master saja (baca-saja untuk data kedisiplinan).
export const PENGUSUL: UserRole[] = ["guru", "bk"];
export const PENGELOLA: UserRole[] = ["bk"];
// Alur remisi berjenjang: siswa/orang tua mengajukan -> Tanse (bk) verifikasi -> kepala sekolah memutuskan.
export const PENGAJU_REMISI: UserRole[] = ["siswa", "orang_tua"];
export const PEMUTUS_REMISI: UserRole[] = ["kepala_sekolah"];

/** Akses route (dicek ulang di server tiap halaman; RLS tetap penegak akhir). */
export const ROUTE_ROLES = {
  dashboard: ["admin", "bk", "kepala_sekolah", "guru", "siswa", "orang_tua"],
  arsip: ["admin", "bk", "kepala_sekolah", "guru"],
  arsipBaru: PENGUSUL,
  persetujuan: ["bk"],
  riwayatPdf: ["admin", "bk"],
  siswa: ["admin", "bk", "kepala_sekolah", "guru"],
  siswaDetail: ["admin", "bk", "kepala_sekolah", "guru", "siswa", "orang_tua"],
  tindakLanjut: STAFF,
  dokumen: STAFF,
  surat: STAFF,
  remisi: ["admin", "bk", "kepala_sekolah", "siswa", "orang_tua"],
  notifikasi: ["admin", "bk", "kepala_sekolah", "guru", "siswa", "orang_tua"],
  audit: ["admin", "kepala_sekolah"],
  master: ["admin"],
  pengaturan: ["admin", "bk", "kepala_sekolah", "guru", "siswa", "orang_tua"],
} as const satisfies Record<string, readonly UserRole[]>;

export type RouteKey = keyof typeof ROUTE_ROLES;

export function canAccess(role: UserRole, route: RouteKey) {
  return (ROUTE_ROLES[route] as readonly UserRole[]).includes(role);
}
