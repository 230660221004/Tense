import { describe, expect, it } from "vitest";
import { ajukanRemisiSchema, putuskanRemisiSchema, verifikasiRemisiSchema } from "@/lib/validations";
import { canAccess } from "@/lib/permissions";
import { STATUS_REMISI_AKTIF } from "@/lib/domain/types";

const id = "11111111-1111-4111-8111-111111111111";

describe("alur remisi berjenjang", () => {
  it("pengajuan wajib alasan dan siswa", () => {
    expect(ajukanRemisiSchema.safeParse({ siswa_id: id, alasan: " " }).success).toBe(false);
    expect(ajukanRemisiSchema.safeParse({ siswa_id: id, alasan: "Berkelakuan baik" }).success).toBe(true);
  });

  it("verifikasi: rekomendasi butuh poin; perbaikan/tolak butuh catatan", () => {
    expect(verifikasiRemisiSchema.safeParse({ id, aksi: "rekomendasi", poin: "" }).success).toBe(false);
    expect(verifikasiRemisiSchema.safeParse({ id, aksi: "rekomendasi", poin: "10" })).toMatchObject({ success: true, data: { poin: 10 } });
    expect(verifikasiRemisiSchema.safeParse({ id, aksi: "perbaikan", catatan: "" }).success).toBe(false);
    expect(verifikasiRemisiSchema.safeParse({ id, aksi: "tolak", catatan: "Tidak memenuhi" }).success).toBe(true);
    expect(verifikasiRemisiSchema.safeParse({ id, aksi: "lain", poin: "1" }).success).toBe(false);
  });

  it("keputusan: menolak wajib catatan; poin opsional saat setuju", () => {
    expect(putuskanRemisiSchema.safeParse({ id, keputusan: "tolak", catatan: "" }).success).toBe(false);
    expect(putuskanRemisiSchema.safeParse({ id, keputusan: "tolak", catatan: "Belum layak" }).success).toBe(true);
    expect(putuskanRemisiSchema.safeParse({ id, keputusan: "setuju", poin: "" })).toMatchObject({ success: true, data: { poin: null } });
    expect(putuskanRemisiSchema.safeParse({ id, keputusan: "setuju", poin: "15" })).toMatchObject({ success: true, data: { poin: 15 } });
  });

  it("akses halaman remisi: siswa/orang tua boleh, guru tidak", () => {
    for (const r of ["admin", "bk", "kepala_sekolah", "siswa", "orang_tua"] as const) expect(canAccess(r, "remisi")).toBe(true);
    expect(canAccess("guru", "remisi")).toBe(false);
  });

  it("hanya tiga status yang dianggap aktif", () => {
    expect(STATUS_REMISI_AKTIF).toEqual(["diajukan", "perlu_perbaikan", "direkomendasikan"]);
  });
});
