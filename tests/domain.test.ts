import { describe, expect, it } from "vitest";
import { aksiTersedia, bolehRevisi, transisiDiizinkan } from "@/lib/domain/status";
import { hitungPoin, posisiAmbang } from "@/lib/domain/points";
import { isiTemplate } from "@/lib/utils/format";
import { sanitizeFileName, sniffMime } from "@/lib/validations/file";
import { keputusanSchema, pelanggaranSchema, siswaSchema, tahunAjaranSchema } from "@/lib/validations";

describe("state machine pelanggaran (alur klien: satu tahap Tanse)", () => {
  it("Tanse (bk) & admin mengesahkan atau menolak usulan", () => {
    for (const r of ["bk", "admin"] as const) {
      expect(transisiDiizinkan("menunggu_persetujuan", "disahkan", r, false)).toBe(true);
      expect(transisiDiizinkan("menunggu_persetujuan", "ditolak", r, false)).toBe(true);
    }
  });
  it("guru, wali kelas, kepala sekolah tidak dapat memutuskan", () => {
    for (const r of ["guru", "kepala_sekolah", "siswa", "orang_tua"] as const) {
      expect(transisiDiizinkan("menunggu_persetujuan", "disahkan", r, false)).toBe(false);
      expect(transisiDiizinkan("menunggu_persetujuan", "ditolak", r, false)).toBe(false);
    }
  });
  it("guru hanya membatalkan usulan miliknya yang masih diusulkan", () => {
    expect(aksiTersedia("menunggu_persetujuan", "guru", true)).toEqual(["dibatalkan"]);
    expect(aksiTersedia("menunggu_persetujuan", "guru", false)).toEqual([]);
  });
  it("revisi hanya Tanse/admin sebelum diputuskan", () => {
    expect(bolehRevisi("menunggu_persetujuan", "bk")).toBe(true);
    expect(bolehRevisi("menunggu_persetujuan", "guru")).toBe(false);
    expect(bolehRevisi("disahkan", "bk")).toBe(false);
  });
  it("status final: hanya admin membatalkan yang sah", () => {
    expect(aksiTersedia("ditolak", "admin", false)).toEqual([]);
    expect(aksiTersedia("disahkan", "admin", false)).toEqual(["dibatalkan"]);
    expect(aksiTersedia("disahkan", "bk", false)).toEqual([]);
  });
});

describe("perhitungan poin", () => {
  it("hanya status disahkan yang dihitung, dikurangi remisi", () => {
    const r = hitungPoin(
      [
        { poin: 10, status: "disahkan" },
        { poin: 50, status: "menunggu_persetujuan" },
        { poin: 30, status: "ditolak" },
        { poin: 15, status: "disetujui" },
        { poin: 5, status: "disahkan" },
        { poin: 40, status: "dibatalkan" },
      ],
      [{ jumlah_poin: 4 }],
    );
    expect(r).toEqual({ total: 15, totalRemisi: 4, bersih: 11 });
  });
  it("ambang dibaca dari master dan mengabaikan yang nonaktif", () => {
    const ambang = [
      { id: "a", nama: "Peringatan dini", jenis: "teguran_tertulis" as const, ambang_poin: 50, aktif: true },
      { id: "b", nama: "Ambang skorsing", jenis: "skorsing" as const, ambang_poin: 75, aktif: true },
      { id: "c", nama: "Nonaktif", jenis: "pembinaan" as const, ambang_poin: 40, aktif: false },
    ];
    expect(posisiAmbang(45, ambang)).toMatchObject({ tercapai: null, berikutnya: { id: "a" } });
    expect(posisiAmbang(50, ambang)).toMatchObject({ tercapai: { id: "a" }, berikutnya: { id: "b" } });
    expect(posisiAmbang(75, ambang)).toMatchObject({ tercapai: { id: "b" }, berikutnya: null });
  });
});

describe("validasi", () => {
  it("menolak tanggal kejadian di masa depan dan kronologi kosong", () => {
    const r = pelanggaranSchema.safeParse({ siswa_id: crypto.randomUUID(), jenis_pelanggaran_id: crypto.randomUUID(), tanggal_kejadian: "2999-01-01", deskripsi: " " });
    expect(r.success).toBe(false);
  });
  it("catatan wajib untuk penolakan", () => {
    expect(keputusanSchema.safeParse({ id: crypto.randomUUID(), status: "ditolak", catatan: "" }).success).toBe(false);
    expect(keputusanSchema.safeParse({ id: crypto.randomUUID(), status: "disetujui", catatan: "" }).success).toBe(true);
  });
  it("format tahun ajaran & rentang", () => {
    expect(tahunAjaranSchema.safeParse({ nama: "2026/2027", tanggal_mulai: "2026-07-01", tanggal_selesai: "2027-06-30" }).success).toBe(true);
    expect(tahunAjaranSchema.safeParse({ nama: "2026", tanggal_mulai: "2026-07-01", tanggal_selesai: "2027-06-30" }).success).toBe(false);
    expect(tahunAjaranSchema.safeParse({ nama: "2026/2027", tanggal_mulai: "2027-07-01", tanggal_selesai: "2027-06-30" }).success).toBe(false);
  });
  it("NIS numerik & NISN 10 digit", () => {
    const base = { nama_lengkap: "A", jenis_kelamin: "L", status: "aktif" };
    expect(siswaSchema.safeParse({ ...base, nis: "12a", nisn: "" }).success).toBe(false);
    expect(siswaSchema.safeParse({ ...base, nis: "262701", nisn: "123" }).success).toBe(false);
    expect(siswaSchema.safeParse({ ...base, nis: "262701", nisn: "0098123401" }).success).toBe(true);
  });
});

describe("file & template", () => {
  it("deteksi MIME dari magic bytes, bukan ekstensi", () => {
    expect(sniffMime(new TextEncoder().encode("%PDF-1.4"))).toBe("application/pdf");
    expect(sniffMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))).toBe("image/png");
    expect(sniffMime(new TextEncoder().encode("<html><script>"))).toBeNull();
  });
  it("membersihkan nama file", () => {
    expect(sanitizeFileName("../../etc/pass wd.pdf")).toBe("etcpass-wd.pdf");
    expect(sanitizeFileName("")).toBe("dokumen");
  });
  it("mengisi placeholder template", () => {
    expect(isiTemplate("Yth {{nama_orang_tua}}, {{nama_siswa}} {{x}}", { nama_siswa: "Budi", nama_orang_tua: "Pak Ali" })).toBe("Yth Pak Ali, Budi {{x}}");
  });
});
