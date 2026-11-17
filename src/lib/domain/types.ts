import type { Database } from "@/types/database";

type Enums = Database["public"]["Enums"];
export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];

export type UserRole = Enums["user_role"];
export type StatusPelanggaran = Enums["status_pelanggaran"];
export type StatusSiswa = Enums["status_siswa"];
export type JalurPelanggaran = Enums["jalur_pelanggaran"];
export type JenisSanksi = Enums["jenis_sanksi"];
export type StatusTindakLanjut = Enums["status_tindak_lanjut"];
export type JenisDokumen = Enums["jenis_dokumen"];
export type JenisSurat = Enums["jenis_surat"];
export type StatusSurat = Enums["status_surat"];

export const USER_ROLES = ["admin", "bk", "kepala_sekolah", "guru", "siswa", "orang_tua"] as const satisfies readonly UserRole[];
export const STATUS_PELANGGARAN = ["menunggu_persetujuan", "disetujui", "disahkan", "ditolak", "dibatalkan"] as const satisfies readonly StatusPelanggaran[];
export const STATUS_SISWA = ["aktif", "nonaktif", "lulus", "pindah", "dikeluarkan"] as const satisfies readonly StatusSiswa[];
export const JENIS_SANKSI = ["pembinaan", "teguran_tertulis", "panggilan_orang_tua", "skorsing", "dikembalikan_ke_orang_tua"] as const satisfies readonly JenisSanksi[];
export const STATUS_TINDAK_LANJUT = ["direncanakan", "berjalan", "selesai", "dibatalkan"] as const satisfies readonly StatusTindakLanjut[];
export const JENIS_DOKUMEN = ["bukti_pelanggaran", "surat_pernyataan", "surat_remisi", "surat_keluar", "lainnya"] as const satisfies readonly JenisDokumen[];
export const JENIS_SURAT = ["panggilan_orang_tua", "peringatan", "skorsing", "pernyataan_siswa", "berita_acara"] as const satisfies readonly JenisSurat[];
export const JALUR = ["usulan", "langsung"] as const satisfies readonly JalurPelanggaran[];

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  bk: "Tanse (BK/Kesiswaan)",
  kepala_sekolah: "Kepala Sekolah",
  guru: "Guru",
  siswa: "Siswa",
  orang_tua: "Orang Tua",
};
export const STATUS_PELANGGARAN_LABEL: Record<StatusPelanggaran, string> = {
  menunggu_persetujuan: "Diusulkan",
  disetujui: "Disetujui (alur lama)",
  disahkan: "Sah",
  ditolak: "Ditolak",
  dibatalkan: "Dibatalkan",
};
export const STATUS_SISWA_LABEL: Record<StatusSiswa, string> = {
  aktif: "Aktif", nonaktif: "Nonaktif", lulus: "Lulus", pindah: "Pindah", dikeluarkan: "Dikeluarkan",
};
export const JENIS_SANKSI_LABEL: Record<JenisSanksi, string> = {
  pembinaan: "Pembinaan",
  teguran_tertulis: "Teguran tertulis",
  panggilan_orang_tua: "Panggilan orang tua",
  skorsing: "Skorsing",
  dikembalikan_ke_orang_tua: "Dikembalikan ke orang tua",
};
export const STATUS_TL_LABEL: Record<StatusTindakLanjut, string> = {
  direncanakan: "Direncanakan", berjalan: "Berjalan", selesai: "Selesai", dibatalkan: "Dibatalkan",
};
export const JENIS_DOKUMEN_LABEL: Record<JenisDokumen, string> = {
  bukti_pelanggaran: "Bukti pelanggaran",
  surat_pernyataan: "Surat pernyataan",
  surat_remisi: "Surat pendukung remisi",
  surat_keluar: "Surat keluar",
  lainnya: "Lainnya",
};
export const JENIS_SURAT_LABEL: Record<JenisSurat, string> = {
  panggilan_orang_tua: "Panggilan orang tua",
  peringatan: "Peringatan",
  skorsing: "Skorsing",
  pernyataan_siswa: "Pernyataan siswa",
  berita_acara: "Berita acara",
};
export const STATUS_SURAT_LABEL: Record<StatusSurat, string> = { draft: "Draft", final: "Final", dibatalkan: "Dibatalkan" };
export const JALUR_LABEL: Record<JalurPelanggaran, string> = { usulan: "Usulan guru/wali kelas", langsung: "Input langsung Tanse" };
