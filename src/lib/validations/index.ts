import { z } from "zod";
import { hariIniJakarta } from "@/lib/utils/format";
import { JENIS_DOKUMEN, JENIS_SANKSI, JENIS_SURAT, STATUS_PELANGGARAN, STATUS_SISWA, STATUS_TINDAK_LANJUT, USER_ROLES } from "@/lib/domain/types";

const tanggal = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid");
const optText = (max: number) =>
  z.string().trim().max(max, `Maksimal ${max} karakter`).optional().transform((v) => (v ? v : null));
const reqText = (label: string, max = 200) => z.string().trim().min(1, `${label} wajib diisi`).max(max, `Maksimal ${max} karakter`);
const optUuid = z.union([z.uuid(), z.literal("")]).optional().transform((v) => (v ? v : null));

export const pelanggaranSchema = z.object({
  siswa_id: z.uuid("Pilih siswa"),
  jenis_pelanggaran_id: z.uuid("Pilih jenis pelanggaran"),
  tanggal_kejadian: tanggal.refine((v) => v <= hariIniJakarta(), "Tanggal tidak boleh di masa depan"),
  deskripsi: reqText("Keterangan", 2000),
});

export const keputusanSchema = z.object({
  id: z.uuid(),
  status: z.enum(STATUS_PELANGGARAN),
  catatan: optText(1000),
}).refine((d) => !(["ditolak", "dibatalkan"].includes(d.status) && !d.catatan), { message: "Catatan wajib untuk penolakan/pembatalan", path: ["catatan"] });

export const revisiSchema = z.object({
  id: z.uuid(),
  jenis_pelanggaran_id: z.uuid("Pilih pasal"),
  deskripsi: reqText("Keterangan", 2000),
  catatan: optText(1000),
});

export const tahunAjaranSchema = z.object({
  id: optUuid,
  nama: z.string().trim().regex(/^\d{4}\/\d{4}$/, "Format: 2026/2027"),
  tanggal_mulai: tanggal,
  tanggal_selesai: tanggal,
}).refine((d) => d.tanggal_selesai > d.tanggal_mulai, { message: "Tanggal selesai harus setelah tanggal mulai", path: ["tanggal_selesai"] });

export const kelasSchema = z.object({
  id: optUuid,
  tahun_ajaran_id: z.uuid("Pilih tahun ajaran"),
  nama: reqText("Nama kelas", 40),
  tingkat: z.coerce.number().refine((n) => [10, 11, 12].includes(n), "Tingkat harus 10, 11, atau 12"),
  wali_kelas_id: optUuid,
});

export const siswaSchema = z.object({
  id: optUuid,
  nis: z.string().trim().regex(/^\d{4,20}$/, "NIS berupa 4–20 digit"),
  nisn: z.union([z.string().trim().regex(/^\d{10}$/, "NISN 10 digit"), z.literal("")]).optional().transform((v) => (v ? v : null)),
  nama_lengkap: reqText("Nama lengkap", 120),
  jenis_kelamin: z.enum(["L", "P"], "Pilih jenis kelamin"),
  kelas_id: optUuid,
  status: z.enum(STATUS_SISWA),
  nama_orang_tua: optText(120),
  no_hp_orang_tua: z.union([z.string().trim().regex(/^[0-9+\- ]{8,20}$/, "Nomor HP tidak valid"), z.literal("")]).optional().transform((v) => (v ? v : null)),
  alamat: optText(300),
  profile_id: optUuid,
});

export const jenisPelanggaranSchema = z.object({
  id: optUuid,
  pasal: z.coerce.number().int().min(1, "Pasal minimal 1").max(99),
  kode: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,12}$/, "Kode 2–12 karakter (huruf, angka, -)"),
  nama: reqText("Nama", 150),
  deskripsi: optText(1000),
  bobot_poin: z.coerce.number().int().min(0, "Bobot tidak boleh negatif").max(500),
  aktif: z.coerce.boolean(),
});

export const tingkatSanksiSchema = z.object({
  id: optUuid,
  nama: reqText("Nama", 120),
  jenis: z.enum(JENIS_SANKSI),
  ambang_poin: z.coerce.number().int().min(1, "Ambang minimal 1").max(1000),
  deskripsi: optText(1000),
  aktif: z.coerce.boolean(),
});

export const templateSuratSchema = z.object({
  id: optUuid,
  jenis: z.enum(JENIS_SURAT),
  judul: reqText("Judul", 150),
  isi: reqText("Isi", 8000),
  aktif: z.coerce.boolean(),
});

export const tindakLanjutSchema = z.object({
  siswa_id: z.uuid("Pilih siswa"),
  tingkat_sanksi_id: optUuid,
  jenis: z.enum(JENIS_SANKSI),
  tanggal: tanggal,
  tanggal_selesai: z.union([tanggal, z.literal("")]).optional().transform((v) => (v ? v : null)),
  keterangan: reqText("Keterangan", 1000),
}).refine((d) => !d.tanggal_selesai || d.tanggal_selesai >= d.tanggal, { message: "Tanggal selesai tidak boleh sebelum tanggal mulai", path: ["tanggal_selesai"] });

export const statusTLSchema = z.object({ id: z.uuid(), status: z.enum(STATUS_TINDAK_LANJUT) });

export const remisiSchema = z.object({
  siswa_id: z.uuid("Pilih siswa"),
  jumlah_poin: z.coerce.number().int().min(1, "Minimal 1 poin").max(500),
  keterangan: reqText("Alasan", 1000),
  tanggal: tanggal,
  surat_dokumen_id: optUuid,
});

export const suratDraftSchema = z.object({
  siswa_id: z.uuid("Pilih siswa"),
  jenis: z.enum(JENIS_SURAT),
  tindak_lanjut_id: optUuid,
  keterangan: optText(1000),
});
export const suratEditSchema = z.object({ id: z.uuid(), judul: reqText("Judul", 150), isi: reqText("Isi", 8000) });

export const dokumenMetaSchema = z.object({
  siswa_id: z.uuid("Pilih siswa"),
  pelanggaran_id: optUuid,
  tindak_lanjut_id: optUuid,
  jenis: z.enum(JENIS_DOKUMEN),
  judul: reqText("Judul", 150),
});

export const penggunaBaruSchema = z.object({
  email: z.email("Email tidak valid"),
  nama_lengkap: reqText("Nama", 120),
  role: z.enum(USER_ROLES),
  password: z.string().min(10, "Password minimal 10 karakter"),
  no_hp: optText(20),
});
export const penggunaEditSchema = z.object({
  id: z.uuid(),
  nama_lengkap: reqText("Nama", 120),
  role: z.enum(USER_ROLES),
  aktif: z.coerce.boolean(),
});
export const ortuLinkSchema = z.object({ orang_tua_id: z.uuid("Pilih akun orang tua"), siswa_id: z.uuid("Pilih siswa"), hubungan: reqText("Hubungan", 40) });

export const profilSchema = z.object({ nama_lengkap: reqText("Nama", 120), no_hp: optText(20) });
export const passwordSchema = z.object({
  password: z.string().min(10, "Password minimal 10 karakter"),
  konfirmasi: z.string(),
}).refine((d) => d.password === d.konfirmasi, { message: "Konfirmasi tidak sama", path: ["konfirmasi"] });

/** Ambil nilai form; checkbox tak dicentang → "" (false). */
export function formObject(fd: FormData, checkboxes: string[] = []) {
  const o: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") o[k] = v;
  for (const c of checkboxes) o[c] = fd.get(c) ? "true" : "";
  return o;
}
