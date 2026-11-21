/**
 * Uji integrasi RLS, trigger, dan RPC per role terhadap Supabase LOKAL yang
 * sudah di-seed (npm run db:reset && npm run seed:demo).
 * Dilewati otomatis bila env tidak menunjuk ke localhost — tidak pernah
 * dijalankan ke database cloud.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/types/database";
import { transisiDiizinkan } from "@/lib/domain/status";
import { STATUS_PELANGGARAN, USER_ROLES } from "@/lib/domain/types";

function loadEnv() {
  if (!existsSync(".env.local")) return {} as Record<string, string>;
  return Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
  );
}
const env = { ...loadEnv(), ...process.env } as Record<string, string | undefined>;
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const PASSWORD = env.DEMO_PASSWORD ?? (existsSync(".demo-credentials.local") ? readFileSync(".demo-credentials.local", "utf8").match(/^PASSWORD=(.+)$/m)?.[1] : undefined);
const isLocal = /^http:\/\/(127\.0\.0\.1|localhost)/.test(URL_);
const enabled = isLocal && !!ANON && !!SERVICE && !!PASSWORD;

type DB = SupabaseClient<Database>;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const D = "sekolah-demo.test";

async function login(email: string): Promise<DB> {
  const c = createClient<Database>(URL_, ANON, opts);
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD! });
  if (error) throw error;
  return c;
}

describe.skipIf(!enabled)("RLS & alur persetujuan (Supabase lokal)", () => {
  let anon: DB, admin: DB, bk: DB, kepsek: DB, guru1: DB, guru2: DB, siswa: DB, ortu: DB, service: DB;
  let ids: Record<string, string>;
  let siswaGuru1: { id: string }; // siswa di kelas perwalian guru1 (X-1)
  let siswaLain: { id: string }; // siswa di kelas tanpa wali guru1
  let jenis: { id: string; bobot_poin: number };
  let taId: string;

  beforeAll(async () => {
    anon = createClient<Database>(URL_, ANON, opts);
    service = createClient<Database>(URL_, SERVICE, opts);
    [admin, bk, kepsek, guru1, guru2, siswa, ortu] = await Promise.all(
      ["admin", "bk", "kepsek", "guru1", "guru2", "siswa", "ortu"].map((u) => login(`${u}@${D}`)),
    );
    const { data: profs } = await service.from("profiles").select("id, nama_lengkap, role");
    const { data: users } = await service.auth.admin.listUsers();
    ids = Object.fromEntries(users.users.map((u) => [u.email!.split("@")[0]!, u.id]));
    expect(profs?.length).toBeGreaterThan(5);
    const { data: kelas } = await service.from("kelas").select("id, nama, wali_kelas_id");
    const x1 = kelas!.find((k) => k.wali_kelas_id === ids.guru1)!;
    const tanpaWali = kelas!.find((k) => k.wali_kelas_id === null)!;
    const { data: s1 } = await service.from("siswa").select("id").eq("kelas_id", x1.id).eq("status", "aktif").limit(1).single();
    const { data: s2 } = await service.from("siswa").select("id").eq("kelas_id", tanpaWali.id).limit(1).single();
    siswaGuru1 = s1!;
    siswaLain = s2!;
    const { data: j } = await service.from("jenis_pelanggaran").select("id, bobot_poin").eq("kode", "P06").single();
    jenis = j!;
    taId = (await service.from("tahun_ajaran").select("id").eq("aktif", true).single()).data!.id;
  });

  it("anon tidak dapat membaca data apa pun", async () => {
    for (const t of ["siswa", "pelanggaran", "profiles", "audit_log", "dokumen"] as const) {
      const { data, error } = await anon.from(t).select("id").limit(1);
      expect(error !== null || (data ?? []).length === 0).toBe(true);
    }
    const r = await anon.rpc("dashboard_ringkasan", { p_tahun_ajaran_id: taId });
    expect(r.error).not.toBeNull();
  });

  it("state machine TypeScript identik dengan fungsi SQL", async () => {
    for (const dari of STATUS_PELANGGARAN)
      for (const ke of STATUS_PELANGGARAN)
        for (const role of USER_ROLES)
          for (const pengusul of [true, false]) {
            const { data } = await admin.rpc("transisi_pelanggaran_diizinkan", { p_dari: dari, p_ke: ke, p_role: role, p_is_pengusul: pengusul });
            expect(data, `${dari}→${ke} ${role} ${pengusul}`).toBe(transisiDiizinkan(dari, ke, role, pengusul));
          }
  });

  it("alur klien: guru usul (Diusulkan) → Tanse setujui → Sah → poin bertambah", async () => {
    const rekapNow = async () => (await bk.rpc("rekap_poin_siswa", { p_tahun_ajaran_id: taId, p_siswa_id: siswaGuru1.id })).data?.[0]?.poin_bersih ?? 0;
    const before = await rekapNow();

    // Client mencoba memalsukan poin, status, pengusul → diabaikan trigger.
    const ins = await guru1
      .from("pelanggaran")
      .insert({ siswa_id: siswaGuru1.id, jenis_pelanggaran_id: jenis.id, pengusul_id: ids.guru1!, poin: 999, status: "disahkan", tanggal_kejadian: "2026-11-02", deskripsi: "Uji otomatis" })
      .select()
      .single();
    expect(ins.error).toBeNull();
    const p = ins.data!;
    expect(p.poin).toBe(jenis.bobot_poin);
    expect(p.status).toBe("menunggu_persetujuan");
    expect(p.jalur).toBe("usulan");
    expect(await rekapNow()).toBe(before);

    expect((await bk.from("pelanggaran").update({ status: "disahkan" }).eq("id", p.id)).error?.message).toMatch(/ubah_status_pelanggaran/);
    expect((await guru1.rpc("ubah_status_pelanggaran", { p_id: p.id, p_status: "disahkan" })).error).not.toBeNull();
    expect((await kepsek.rpc("ubah_status_pelanggaran", { p_id: p.id, p_status: "disahkan" })).error).not.toBeNull();
    expect((await bk.rpc("ubah_status_pelanggaran", { p_id: p.id, p_status: "ditolak" })).error?.message).toMatch(/Alasan wajib/);

    const sah = await bk.rpc("ubah_status_pelanggaran", { p_id: p.id, p_status: "disahkan", p_catatan: "ok" });
    expect(sah.error).toBeNull();
    expect(sah.data?.diputuskan_oleh).toBe(ids.bk);
    expect(sah.data?.disahkan_pada).not.toBeNull();
    expect(await rekapNow()).toBe(before + jenis.bobot_poin);

    expect((await bk.from("pelanggaran").update({ deskripsi: "ubah" }).eq("id", p.id)).error?.message).toMatch(/terkunci/);
    const { data: log } = await bk.from("pelanggaran_status_log").select("status_ke").eq("pelanggaran_id", p.id).order("created_at");
    expect(log?.map((l) => l.status_ke)).toEqual(["menunggu_persetujuan", "disahkan"]);
    const { data: audit } = await admin.from("audit_log").select("aksi").eq("tabel", "pelanggaran").eq("record_id", p.id);
    expect(audit?.map((a) => a.aksi)).toEqual(expect.arrayContaining(["INSERT", "DECISION:disahkan"]));
    expect(((await guru1.from("notifikasi").select("id").eq("tautan", `/arsip/${p.id}`)).data ?? []).length).toBeGreaterThan(0);

    expect((await bk.rpc("ubah_status_pelanggaran", { p_id: p.id, p_status: "dibatalkan", p_catatan: "x" })).error).not.toBeNull();
    expect((await admin.rpc("ubah_status_pelanggaran", { p_id: p.id, p_status: "dibatalkan", p_catatan: "Uji pembatalan" })).error).toBeNull();
    expect(await rekapNow()).toBe(before);
  });

  it("tolak: tidak menambah poin & alasan disimpan", async () => {
    const { data: p } = await guru1.from("pelanggaran").insert({ siswa_id: siswaGuru1.id, jenis_pelanggaran_id: jenis.id, pengusul_id: ids.guru1!, poin: 0, tanggal_kejadian: "2026-11-04", deskripsi: "Uji tolak" }).select().single();
    const res = await bk.rpc("ubah_status_pelanggaran", { p_id: p!.id, p_status: "ditolak", p_catatan: "Saksi tidak konsisten" });
    expect(res.data?.status).toBe("ditolak");
    expect(res.data?.catatan_keputusan).toBe("Saksi tidak konsisten");
  });

  it("revisi: Tanse ubah pasal & keterangan lalu langsung sah dengan poin pasal baru", async () => {
    const { data: lain } = await service.from("jenis_pelanggaran").select("id, pasal, bobot_poin").eq("kode", "P13").single();
    const { data: p } = await guru1.from("pelanggaran").insert({ siswa_id: siswaGuru1.id, jenis_pelanggaran_id: jenis.id, pengusul_id: ids.guru1!, poin: 0, tanggal_kejadian: "2026-11-05", deskripsi: "Awal" }).select().single();
    expect((await guru1.rpc("revisi_dan_sahkan_pelanggaran", { p_id: p!.id, p_jenis_pelanggaran_id: lain!.id, p_deskripsi: "x" })).error).not.toBeNull();
    const rev = await bk.rpc("revisi_dan_sahkan_pelanggaran", { p_id: p!.id, p_jenis_pelanggaran_id: lain!.id, p_deskripsi: "Keterangan diperbaiki", p_catatan: "Sesuai saksi" });
    expect(rev.error).toBeNull();
    expect(rev.data).toMatchObject({ status: "disahkan", poin: lain!.bobot_poin, jenis_pelanggaran_id: lain!.id, deskripsi: "Keterangan diperbaiki" });
    const { data: log } = await bk.from("pelanggaran_status_log").select("catatan").eq("pelanggaran_id", p!.id).eq("status_ke", "disahkan").single();
    expect(log?.catatan).toMatch(/Direvisi: pasal 6/);
    expect((await bk.rpc("revisi_dan_sahkan_pelanggaran", { p_id: p!.id, p_jenis_pelanggaran_id: lain!.id, p_deskripsi: "lagi" })).error).not.toBeNull();
  });

  it("input langsung Tanse: langsung sah tanpa tahap usulan", async () => {
    const { data: p, error } = await bk.from("pelanggaran").insert({ siswa_id: siswaLain.id, jenis_pelanggaran_id: jenis.id, pengusul_id: ids.bk!, poin: 0, status: "menunggu_persetujuan", tanggal_kejadian: "2026-11-06", deskripsi: "Ditemukan sendiri" }).select().single();
    expect(error).toBeNull();
    expect(p).toMatchObject({ status: "disahkan", jalur: "langsung", diputuskan_oleh: ids.bk });
    const { data: log } = await bk.from("pelanggaran_status_log").select("status_dari, status_ke").eq("pelanggaran_id", p!.id);
    expect(log).toEqual([{ status_dari: null, status_ke: "disahkan" }]);
  });

  it("peringatan dini rule-based dari tingkat_sanksi (50/75)", async () => {
    const { data } = await bk.rpc("siswa_ambang", { p_tahun_ajaran_id: taId });
    expect((data ?? []).length).toBeGreaterThan(0);
    for (const r of data!) {
      expect(r.poin_bersih).toBeGreaterThanOrEqual(r.ambang_poin);
      if (r.poin_bersih >= 75) expect(r.ambang_poin).toBe(75);
      else expect(r.ambang_poin).toBe(50);
    }
  });

  it("guru hanya melihat usulannya + siswa perwalian; tidak bisa akses data sensitif", async () => {
    const lain = await guru2.from("pelanggaran").insert({ siswa_id: siswaLain.id, jenis_pelanggaran_id: jenis.id, pengusul_id: ids.guru2!, poin: 0, tanggal_kejadian: "2026-11-03", deskripsi: "Uji guru" }).select("id").single();
    expect(lain.error).toBeNull();
    const seen = await guru1.from("pelanggaran").select("id").eq("id", lain.data!.id);
    expect(seen.data).toEqual([]);
    const seenBK = await kepsek.from("pelanggaran").select("id").eq("id", lain.data!.id);
    expect(seenBK.data?.length).toBe(1);

    expect((await guru1.from("audit_log").select("id").limit(1)).data).toEqual([]);
    expect((await guru1.from("template_surat").select("id").limit(1)).data).toEqual([]);
    expect((await guru1.from("tindak_lanjut").insert({ siswa_id: siswaGuru1.id, jenis: "pembinaan", keterangan: "x" })).error).not.toBeNull();
    // Rekap poin siswa non-perwalian tidak tersedia untuk guru.
    expect((await guru1.rpc("rekap_poin_siswa", { p_tahun_ajaran_id: taId, p_siswa_id: siswaLain.id })).data).toEqual([]);
    expect((await guru1.rpc("rekap_poin_siswa", { p_tahun_ajaran_id: taId, p_siswa_id: siswaGuru1.id })).data?.length).toBe(1);
    // guru2 tidak melihat usulan guru1 untuk siswa yang bukan perwaliannya.
    const { data: g1 } = await guru1.from("pelanggaran").select("id, siswa_id").eq("pengusul_id", ids.guru1!).limit(1);
    const { data: g2 } = await guru2.from("pelanggaran").select("id").eq("id", g1![0]!.id);
    expect(g2).toEqual([]);
  });

  it("guru tidak dapat mengubah role sendiri; profil lain tak dapat diubah", async () => {
    expect((await guru1.from("profiles").update({ role: "admin" }).eq("id", ids.guru1!)).error).not.toBeNull();
    const other = await guru1.from("profiles").update({ nama_lengkap: "hack" }).eq("id", ids.bk!).select();
    expect(other.data).toEqual([]);
    const { data } = await service.from("profiles").select("role").eq("id", ids.guru1!).single();
    expect(data?.role).toBe("guru");
  });

  it("siswa hanya melihat datanya sendiri dan hanya pelanggaran disahkan", async () => {
    const { data: s } = await siswa.from("siswa").select("id, profile_id");
    expect(s?.length).toBe(1);
    expect(s![0]!.profile_id).toBe(ids.siswa);
    const { data: p } = await siswa.from("pelanggaran").select("status, siswa_id");
    expect((p ?? []).every((x) => x.status === "disahkan" && x.siswa_id === s![0]!.id)).toBe(true);
    expect((p ?? []).length).toBeGreaterThan(0);
    expect((await siswa.from("profiles").select("id")).data?.map((x) => x.id)).toEqual([ids.siswa]);
    expect((await siswa.from("pelanggaran").insert({ siswa_id: s![0]!.id, jenis_pelanggaran_id: jenis.id, pengusul_id: ids.siswa!, poin: 0, deskripsi: "x" })).error).not.toBeNull();
    expect((await siswa.from("surat").select("status")).data?.every((x) => x.status === "final")).toBe(true);
  });

  it("orang tua hanya melihat anak yang terhubung", async () => {
    const { data } = await ortu.from("siswa").select("id");
    const { data: rel } = await service.from("orang_tua_siswa").select("siswa_id").eq("orang_tua_id", ids.ortu!);
    expect(data?.map((d) => d.id).sort()).toEqual(rel?.map((r) => r.siswa_id).sort());
    expect((await ortu.from("pelanggaran").select("id").eq("siswa_id", siswaLain.id)).data).toEqual([]);
  });

  it("remisi tidak bisa ditulis langsung; hanya lewat alur ajukan → verifikasi → putuskan", async () => {
    const { data: dokLain } = await service.from("dokumen").select("id, siswa_id").limit(1).single();
    for (const [nama, c, uid] of [["bk", bk, ids.bk!], ["kepsek", kepsek, ids.kepsek!], ["guru1", guru1, ids.guru1!]] as const) {
      const r = await c.from("remisi").insert({ siswa_id: dokLain!.siswa_id, jumlah_poin: 1, keterangan: "x", surat_dokumen_id: dokLain!.id, dicatat_oleh: uid });
      expect(r.error, `insert langsung oleh ${nama}`).not.toBeNull();
    }
    expect((await bk.from("remisi_pengajuan").update({ status: "disetujui" }).neq("status", "disetujui").select()).data ?? []).toEqual([]);
  });

  it("alur pengajuan remisi: siswa → Tanse → kepala sekolah", async () => {
    const { data: me } = await service.from("siswa").select("id").eq("profile_id", ids.siswa!).single();
    // bersihkan pengajuan aktif dari run sebelumnya
    await service.from("remisi_pengajuan").delete().eq("siswa_id", me!.id).in("status", ["diajukan", "perlu_perbaikan", "direkomendasikan"]);
    const rek = (await bk.rpc("rekap_poin_siswa", { p_tahun_ajaran_id: taId, p_siswa_id: me!.id })).data![0]!;
    if (rek.poin_bersih < 1) return; // tidak ada poin untuk diremisi pada data demo

    const dok = async (siswaId: string, jenis: "surat_remisi" | "surat_pernyataan") => {
      const { data } = await service.from("dokumen").insert({ siswa_id: siswaId, jenis, judul: "uji", nama_file: "uji.pdf", storage_path: `siswa/${siswaId}/uji-${crypto.randomUUID()}.pdf`, diunggah_oleh: ids.siswa! }).select("id").single();
      return data!.id;
    };
    const dokOk = await dok(me!.id, "surat_remisi");
    const dokSalah = await dok(me!.id, "surat_pernyataan");

    expect((await ortu.rpc("ajukan_remisi", { p_siswa: siswaLain.id, p_alasan: "x", p_dokumen: dokOk })).error).not.toBeNull(); // bukan anaknya
    expect((await bk.rpc("ajukan_remisi", { p_siswa: me!.id, p_alasan: "x", p_dokumen: dokOk })).error).not.toBeNull(); // bukan pengaju
    expect((await siswa.rpc("ajukan_remisi", { p_siswa: me!.id, p_alasan: "x", p_dokumen: dokSalah })).error?.message).toMatch(/surat remisi/);

    const aju = await siswa.rpc("ajukan_remisi", { p_siswa: me!.id, p_alasan: "Berkelakuan baik", p_dokumen: dokOk });
    expect(aju.error).toBeNull();
    const id = aju.data!;
    expect((await siswa.rpc("ajukan_remisi", { p_siswa: me!.id, p_alasan: "lagi", p_dokumen: dokOk })).error?.message).toMatch(/sedang diproses/);

    // kepala sekolah belum bisa memutuskan sebelum direkomendasikan; siswa tidak bisa memverifikasi
    expect((await kepsek.rpc("putuskan_remisi", { p_id: id, p_setuju: true, p_poin: 1, p_catatan: "" })).error).not.toBeNull();
    expect((await siswa.rpc("verifikasi_remisi", { p_id: id, p_aksi: "rekomendasi", p_poin: 1, p_catatan: "" })).error).not.toBeNull();

    // Tanse: perbaikan wajib catatan, lalu pengaju memperbaiki
    expect((await bk.rpc("verifikasi_remisi", { p_id: id, p_aksi: "perbaikan", p_poin: null as unknown as number, p_catatan: "" })).error).not.toBeNull();
    expect((await bk.rpc("verifikasi_remisi", { p_id: id, p_aksi: "perbaikan", p_poin: null as unknown as number, p_catatan: "Lengkapi surat" })).error).toBeNull();
    expect((await ortu.rpc("perbaiki_remisi", { p_id: id, p_alasan: "x" })).error).not.toBeNull();
    expect((await siswa.rpc("perbaiki_remisi", { p_id: id, p_alasan: "Sudah dilengkapi" })).error).toBeNull();

    // Rekomendasi tidak boleh melebihi poin bersih
    expect((await bk.rpc("verifikasi_remisi", { p_id: id, p_aksi: "rekomendasi", p_poin: rek.poin_bersih + 1, p_catatan: "" })).error?.message).toMatch(/poin bersih/);
    expect((await bk.rpc("verifikasi_remisi", { p_id: id, p_aksi: "rekomendasi", p_poin: 1, p_catatan: "Layak" })).error).toBeNull();

    // Tanse tidak boleh memutuskan; kepala sekolah menyetujui → poin bersih turun
    expect((await bk.rpc("putuskan_remisi", { p_id: id, p_setuju: true, p_poin: 1, p_catatan: "" })).error).not.toBeNull();
    expect((await kepsek.rpc("putuskan_remisi", { p_id: id, p_setuju: true, p_poin: 1, p_catatan: "Disetujui" })).error).toBeNull();
    const sesudah = (await bk.rpc("rekap_poin_siswa", { p_tahun_ajaran_id: taId, p_siswa_id: me!.id })).data![0]!;
    expect(sesudah.poin_bersih).toBe(rek.poin_bersih - 1);
    const { data: akhir } = await siswa.from("remisi_pengajuan").select("status, remisi_id, poin_disahkan").eq("id", id).single();
    expect(akhir).toMatchObject({ status: "disetujui", poin_disahkan: 1 });
    expect(akhir!.remisi_id).not.toBeNull();

    // siswa lain tidak melihat pengajuan ini
    expect((await guru2.from("remisi_pengajuan").select("id").eq("id", id)).data).toEqual([]);
  });

  it("audit log & status log append-only", async () => {
    const { data: a } = await admin.from("audit_log").select("id").limit(1).single();
    const del = await admin.from("audit_log").delete().eq("id", a!.id).select();
    expect(del.error !== null || (del.data ?? []).length === 0).toBe(true);
    const upd = await admin.from("audit_log").update({ aksi: "X" }).eq("id", a!.id).select();
    expect(upd.error !== null || (upd.data ?? []).length === 0).toBe(true);
    expect((await admin.from("pelanggaran_status_log").insert({ pelanggaran_id: crypto.randomUUID(), status_ke: "disahkan" })).error).not.toBeNull();
    const { count } = await service.from("audit_log").select("id", { count: "exact", head: true }).eq("id", a!.id);
    expect(count).toBe(1);
  });

  it("notifikasi hanya milik sendiri; hanya kolom dibaca_at yang dapat diubah", async () => {
    const { data: n } = await service.from("notifikasi").select("id, user_id").eq("user_id", ids.bk!).limit(1).single();
    expect((await guru1.from("notifikasi").update({ dibaca_at: new Date().toISOString() }).eq("id", n!.id).select()).data ?? []).toEqual([]);
    expect((await bk.from("notifikasi").update({ judul: "ubah" }).eq("id", n!.id)).error).not.toBeNull();
    expect((await bk.from("notifikasi").insert({ user_id: ids.bk!, judul: "spam" })).error).not.toBeNull();
  });

  it("storage privat: siswa lain tidak dapat membuat signed URL; BK dapat", async () => {
    const { data: siswaRow } = await siswa.from("siswa").select("id").single();
    const path = `siswa/${siswaLain.id}/${crypto.randomUUID()}-uji.pdf`;
    expect((await bk.storage.from("arsip-dokumen").upload(path, Buffer.from("%PDF-1.4 uji"), { contentType: "application/pdf" })).error).toBeNull();
    const ins = await bk.from("dokumen").insert({ siswa_id: siswaLain.id, jenis: "lainnya", judul: "Uji RLS", nama_file: "uji.pdf", storage_path: path, mime_type: "application/pdf", ukuran_bytes: 12, diunggah_oleh: ids.bk! }).select("storage_path, siswa_id").single();
    expect(ins.error).toBeNull();
    const dok = ins.data;
    expect(dok!.siswa_id).not.toBe(siswaRow!.id);
    const bad = await siswa.storage.from("arsip-dokumen").createSignedUrl(dok!.storage_path, 60);
    expect(bad.data?.signedUrl).toBeFalsy();
    const ok = await bk.storage.from("arsip-dokumen").createSignedUrl(dok!.storage_path, 60);
    expect(ok.data?.signedUrl).toBeTruthy();
    const pub = await fetch(`${URL_}/storage/v1/object/public/arsip-dokumen/${dok!.storage_path}`);
    expect(pub.status).toBeGreaterThanOrEqual(400);
    const up = await siswa.storage.from("arsip-dokumen").upload(`siswa/${siswaRow!.id}/x.pdf`, Buffer.from("%PDF-1.4"), { contentType: "application/pdf" });
    expect(up.error).not.toBeNull();
  });

  it("surat final terkunci & nomor surat terbentuk", async () => {
    const { data: s } = await bk.from("surat").insert({ siswa_id: siswaGuru1.id, jenis: "peringatan", judul: "Uji", isi: "Isi", dibuat_oleh: ids.bk!, status: "final", nomor_surat: "PALSU" }).select().single();
    expect(s?.status).toBe("draft");
    expect(s?.nomor_surat).toBeNull();
    expect((await bk.from("surat").update({ status: "final" }).eq("id", s!.id)).error).not.toBeNull();
    expect((await kepsek.rpc("finalisasi_surat", { p_id: s!.id })).error).not.toBeNull();
    const fin = await bk.rpc("finalisasi_surat", { p_id: s!.id });
    expect(fin.data?.nomor_surat).toMatch(/^\d{3}\/BK\/[IVX]+\/\d{4}$/);
    expect((await bk.from("surat").update({ isi: "ubah" }).eq("id", s!.id).select()).data ?? []).toEqual([]);
  });

  it("hanya satu tahun ajaran aktif; hanya admin yang mengganti", async () => {
    const { data: tas } = await admin.from("tahun_ajaran").select("id, aktif");
    const nonaktif = tas!.find((t) => !t.aktif)!;
    expect((await bk.rpc("set_tahun_ajaran_aktif", { p_id: nonaktif.id })).error).not.toBeNull();
    const dup = await service.from("tahun_ajaran").update({ aktif: true }).eq("id", nonaktif.id);
    expect(dup.error?.code).toBe("23505");
  });
});
