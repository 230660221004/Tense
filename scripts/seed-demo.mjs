#!/usr/bin/env node
/**
 * SEED DATA DEMO / DEVELOPMENT — BUKAN DATA PRODUKSI.
 *
 * Membuat akun demo, master data, dan riwayat pelanggaran contoh dengan
 * menjalankan alur aplikasi yang sebenarnya (usulan guru → keputusan BK →
 * pengesahan kepala sekolah) sehingga trigger, RLS, status log, audit, dan
 * notifikasi ikut teruji.
 *
 * Wajib: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *        SUPABASE_SERVICE_ROLE_KEY, dan flag --confirm-demo.
 * Opsional: DEMO_PASSWORD (default acak, ditulis ke .demo-credentials.local).
 *
 *   node --env-file=.env.local scripts/seed-demo.mjs --confirm-demo
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";

if (!process.argv.includes("--confirm-demo")) {
  console.error("Tolak: jalankan dengan --confirm-demo. Script ini membuat DATA DEMO.");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anon || !service) {
  console.error("Env NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY wajib.");
  process.exit(1);
}

const PASSWORD = process.env.DEMO_PASSWORD || `Demo-${randomBytes(6).toString("hex")}`;
const DOMAIN = "sekolah-demo.test";
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, service, opts);

// PRNG deterministik agar data demo konsisten.
let seed = 20261116;
const rand = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

function must(res, label) {
  if (res.error) {
    console.error(`✗ ${label}:`, res.error.message);
    process.exit(1);
  }
  return res.data;
}

async function signIn(email) {
  const c = createClient(url, anon, opts);
  must(await c.auth.signInWithPassword({ email, password: PASSWORD }), `login ${email}`);
  return c;
}

const users = [
  { key: "admin", email: `admin@${DOMAIN}`, nama: "Admin Tata Usaha", role: "admin" },
  { key: "bk", email: `bk@${DOMAIN}`, nama: "Rina Kusumawati, S.Pd.", role: "bk" },
  { key: "bk2", email: `kesiswaan@${DOMAIN}`, nama: "Agus Santoso, M.Pd.", role: "bk" },
  { key: "kepsek", email: `kepsek@${DOMAIN}`, nama: "Drs. Hendra Wijaya", role: "kepala_sekolah" },
  { key: "guru1", email: `guru1@${DOMAIN}`, nama: "Siti Rahmawati, S.Pd.", role: "guru" },
  { key: "guru2", email: `guru2@${DOMAIN}`, nama: "Bambang Prasetyo, S.Pd.", role: "guru" },
  { key: "guru3", email: `guru3@${DOMAIN}`, nama: "Dewi Lestari, S.Si.", role: "guru" },
  { key: "guru4", email: `guru4@${DOMAIN}`, nama: "Yusuf Hidayat, S.Pd.", role: "guru" },
  { key: "siswa", email: `siswa@${DOMAIN}`, nama: "Rizky Ananda Putra", role: "siswa" },
  { key: "ortu", email: `ortu@${DOMAIN}`, nama: "Suharto", role: "orang_tua" },
];

async function main() {
  const existing = must(await admin.from("profiles").select("id").limit(1), "cek profiles");
  if (existing.length > 0) {
    console.error("Tolak: database sudah berisi profil. Seed demo hanya untuk database kosong.");
    process.exit(1);
  }

  console.log("→ Membuat akun demo");
  const id = {};
  for (const u of users) {
    const data = must(
      await admin.auth.admin.createUser({
        email: u.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { nama_lengkap: u.nama },
        app_metadata: { role: u.role },
      }),
      `createUser ${u.email}`,
    );
    id[u.key] = data.user.id;
    // Profil dibuat trigger dengan role default 'siswa'; role ditetapkan eksplisit oleh service role.
    must(await admin.from("profiles").update({ role: u.role, nama_lengkap: u.nama }).eq("id", data.user.id), `role ${u.email}`);
  }

  console.log("→ Master data");
  const ta = must(
    await admin.from("tahun_ajaran").insert([
      { nama: "2025/2026", tanggal_mulai: "2025-07-14", tanggal_selesai: "2026-06-30", aktif: false },
      { nama: "2026/2027", tanggal_mulai: "2026-07-13", tanggal_selesai: "2027-06-30", aktif: true },
    ]).select(),
    "tahun_ajaran",
  );
  const taAktif = ta.find((t) => t.aktif).id;

  const kelasDef = [
    ["X-1", 10, "guru1"], ["X-2", 10, "guru2"], ["XI IPA 1", 11, "guru3"],
    ["XI IPS 1", 11, null], ["XII IPA 1", 12, "guru4"], ["XII IPS 1", 12, null],
  ];
  const kelas = must(
    await admin.from("kelas").insert(
      kelasDef.map(([nama, tingkat, wali]) => ({ nama, tingkat, tahun_ajaran_id: taAktif, wali_kelas_id: wali ? id[wali] : null })),
    ).select(),
    "kelas",
  );

  const depan = ["Ahmad", "Bunga", "Citra", "Dimas", "Eka", "Fajar", "Gita", "Hafiz", "Indah", "Joko", "Kirana", "Lukman",
    "Maya", "Nanda", "Oki", "Putri", "Raka", "Salsa", "Tegar", "Umi", "Vino", "Wulan", "Yoga", "Zahra",
    "Arif", "Bella", "Candra", "Dinda", "Erlangga", "Fitri", "Galih", "Hana", "Ilham", "Jihan", "Kevin"];
  const belakang = ["Saputra", "Lestari", "Pratama", "Wulandari", "Nugroho", "Permata", "Hakim", "Anggraini", "Setiawan", "Maharani", "Firmansyah", "Puspita"];
  const perempuan = new Set(["Bunga", "Citra", "Eka", "Gita", "Indah", "Kirana", "Maya", "Nanda", "Putri", "Salsa", "Umi", "Wulan", "Zahra", "Bella", "Dinda", "Fitri", "Hana", "Jihan"]);

  const siswaRows = [{
    nis: "262701", nisn: "0098123401", nama_lengkap: "Rizky Ananda Putra", jenis_kelamin: "L",
    kelas_id: kelas[0].id, profile_id: id.siswa, nama_orang_tua: "Suharto", alamat: "Jl. Melati No. 12", no_hp_orang_tua: "081200000001",
  }];
  depan.forEach((d, i) => {
    const n = 262702 + i;
    siswaRows.push({
      nis: String(n), nisn: `00981234${String(i + 2).padStart(2, "0")}`,
      nama_lengkap: `${d} ${belakang[i % belakang.length]}`,
      jenis_kelamin: perempuan.has(d) ? "P" : "L",
      kelas_id: kelas[i % kelas.length].id,
      nama_orang_tua: `Orang tua ${d}`, alamat: "Alamat demo", no_hp_orang_tua: null,
    });
  });
  const siswa = must(await admin.from("siswa").insert(siswaRows).select(), "siswa");
  must(await admin.from("orang_tua_siswa").insert({ orang_tua_id: id.ortu, siswa_id: siswa[0].id, hubungan: "ayah" }), "ortu");

  // 15 pasal tata tertib (DATA DEMO — ganti dengan tata tertib sekolah). Poin 0, 10, atau 15 per pasal.
  const pasal = [
    ["Terlambat masuk sekolah", 0], ["Atribut seragam tidak lengkap", 0], ["Penampilan/rambut tidak sesuai ketentuan", 0],
    ["Membuang sampah sembarangan", 0], ["Tidak mengikuti upacara tanpa alasan", 10], ["Membolos jam pelajaran", 10],
    ["Tidak hadir tanpa keterangan", 10], ["Menggunakan ponsel saat KBM tanpa izin", 10], ["Mengganggu ketertiban KBM", 10],
    ["Berkata kasar atau tidak sopan", 10], ["Merusak fasilitas sekolah", 15], ["Merokok di lingkungan sekolah", 15],
    ["Berkelahi", 15], ["Merundung teman", 15], ["Membawa barang terlarang", 15],
  ];
  const jenis = must(await admin.from("jenis_pelanggaran").insert(
    pasal.map(([nama, bobot_poin], i) => ({ pasal: i + 1, kode: `P${String(i + 1).padStart(2, "0")}`, nama, bobot_poin })),
  ).select(), "jenis_pelanggaran");

  // Ambang rule-based dari alur klien: 50 = peringatan dini, 75 = ambang skorsing.
  must(await admin.from("tingkat_sanksi").insert([
    { nama: "Peringatan dini", jenis: "teguran_tertulis", ambang_poin: 50, deskripsi: "Siswa ditandai di dasbor; pembinaan oleh wali kelas dan Tanse." },
    { nama: "Ambang skorsing", jenis: "skorsing", ambang_poin: 75, deskripsi: "Mencapai ambang skorsing. Keputusan akhir tetap di pihak sekolah." },
  ]), "tingkat_sanksi");

  const tpl = (isi) => `Yth. Bapak/Ibu {{nama_orang_tua}}\norang tua/wali dari {{nama_siswa}} (NIS {{nis}}), kelas {{kelas}}.\n\n${isi}\n\nAkumulasi poin pelanggaran saat ini: {{total_poin}} poin.\n\n{{tempat_tanggal}}\nGuru BK`;
  must(await admin.from("template_surat").insert([
    { jenis: "panggilan_orang_tua", judul: "Surat Panggilan Orang Tua/Wali", isi: tpl("Dengan hormat, kami mengundang Bapak/Ibu hadir ke sekolah untuk membicarakan perkembangan kedisiplinan putra/putri Bapak/Ibu.\n\nKeterangan: {{keterangan}}") },
    { jenis: "peringatan", judul: "Surat Peringatan", isi: tpl("Dengan ini kami sampaikan peringatan tertulis atas pelanggaran tata tertib sekolah.\n\nKeterangan: {{keterangan}}") },
    { jenis: "skorsing", judul: "Surat Pemberitahuan Skorsing", isi: tpl("Berdasarkan keputusan sekolah, siswa yang bersangkutan dikenai skorsing.\n\nKeterangan: {{keterangan}}") },
    { jenis: "pernyataan_siswa", judul: "Surat Pernyataan Siswa", isi: tpl("Siswa menyatakan tidak akan mengulangi pelanggaran dan bersedia menerima sanksi sesuai tata tertib.\n\nKeterangan: {{keterangan}}") },
    { jenis: "berita_acara", judul: "Berita Acara Pelanggaran Tata Tertib", isi: "Pada hari ini {{tempat_tanggal}} telah dicatat pelanggaran tata tertib oleh:\n\nNama      : {{nama_siswa}}\nNIS       : {{nis}}\nKelas     : {{kelas}}\n\nRincian pelanggaran yang sah:\n{{daftar_pelanggaran}}\n\nAkumulasi poin saat ini: {{total_poin}} poin.\n\nKeterangan: {{keterangan}}\n\nDemikian berita acara ini dibuat untuk dipergunakan sebagaimana mestinya." },
  ]), "template_surat");

  console.log("→ Usulan guru & input langsung Tanse");
  const clients = {};
  for (const k of ["guru1", "guru2", "guru3", "guru4", "bk", "admin"]) clients[k] = await signIn(users.find((u) => u.key === k).email);

  const kelasWali = { [kelas[0].id]: "guru1", [kelas[1].id]: "guru2", [kelas[2].id]: "guru3", [kelas[4].id]: "guru4" };
  const berbobot = jenis.filter((j) => j.bobot_poin > 0);
  const today = new Date("2026-11-16");
  const start = new Date("2026-07-14");
  const span = (today - start) / 86400000;
  const created = [];
  for (let i = 0; i < 90; i++) {
    const s = i < 9 ? siswa[0] : i % 7 === 0 ? siswa[3] : i % 11 === 0 ? siswa[5] : pick(siswa);
    const j = rand() < 0.25 ? pick(jenis.filter((x) => x.bobot_poin === 0)) : pick(berbobot);
    const d = new Date(start.getTime() + Math.floor(rand() * span) * 86400000);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    const pengusul = i % 5 === 4 ? "bk" : kelasWali[s.kelas_id] ?? pick(["guru1", "guru2", "guru3", "guru4"]);
    const row = must(await clients[pengusul].from("pelanggaran").insert({
      siswa_id: s.id, jenis_pelanggaran_id: j.id, pengusul_id: id[pengusul], poin: 0,
      tanggal_kejadian: d.toISOString().slice(0, 10),
      deskripsi: `${j.nama} — dicatat saat ${pick(["upacara", "jam pertama", "istirahat", "KBM", "pulang sekolah"])}.`,
    }).select("id, tanggal_kejadian, status").single(), `pelanggaran ${i}`);
    created.push(row);
  }

  console.log("→ Keputusan Tanse: setujui / revisi / tolak");
  const usulan = created.filter((p) => p.status === "menunggu_persetujuan").sort((a, b) => a.tanggal_kejadian.localeCompare(b.tanggal_kejadian));
  for (const [idx, p] of usulan.entries()) {
    if (idx >= usulan.length - 8) continue; // 8 terbaru tetap "Diusulkan"
    if (idx % 11 === 4) {
      must(await clients.bk.rpc("ubah_status_pelanggaran", { p_id: p.id, p_status: "ditolak", p_catatan: "Bukti tidak memadai, saksi tidak konsisten." }), "tolak");
    } else if (idx % 9 === 2) {
      const baru = pick(berbobot);
      must(await clients.bk.rpc("revisi_dan_sahkan_pelanggaran", { p_id: p.id, p_jenis_pelanggaran_id: baru.id, p_deskripsi: `${baru.nama} — keterangan diperjelas Tanse setelah konfirmasi wali kelas.`, p_catatan: "Pasal disesuaikan dengan kronologi." }), "revisi");
    } else {
      must(await clients.bk.rpc("ubah_status_pelanggaran", { p_id: p.id, p_status: "disahkan", p_catatan: "Sesuai bukti dan keterangan wali kelas." }), "setujui");
    }
  }

  console.log("→ Tindak lanjut, dokumen, remisi, surat");
  const rekap = must(await clients.bk.rpc("rekap_poin_siswa", { p_tahun_ajaran_id: taAktif }), "rekap");
  rekap.sort((a, b) => b.poin_bersih - a.poin_bersih);
  const sanksi = must(await clients.bk.from("tingkat_sanksi").select("*").order("ambang_poin"), "sanksi");
  const top = rekap.filter((r) => r.poin_bersih >= sanksi[0].ambang_poin).slice(0, 3);
  for (const [n, r] of top.entries()) {
    const level = [...sanksi].reverse().find((t) => r.poin_bersih >= t.ambang_poin);
    const tglMulai = new Date(today.getTime() - (20 - n * 5) * 86400000).toISOString().slice(0, 10);
    const tglSelesai = new Date(today.getTime() + (n * 6 - 8) * 86400000).toISOString().slice(0, 10);
    must(await clients.bk.from("tindak_lanjut").insert({
      siswa_id: r.siswa_id, tingkat_sanksi_id: level.id, jenis: level.jenis,
      tanggal: tglMulai, tanggal_selesai: tglSelesai,
      status: n === 0 ? "berjalan" : "direncanakan",
      keterangan: `Akumulasi ${r.poin_bersih} poin mencapai ambang ${level.nama.toLowerCase()}.`,
    }), "tindak_lanjut");
  }

  // Dokumen demo (PDF sederhana) — juga menguji Storage privat.
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
  const target = siswa.find((s) => s.id === (top[0] ?? rekap[0])?.siswa_id) ?? siswa[0];
  const path = `siswa/${target.id}/${crypto.randomUUID()}-surat-pernyataan.pdf`;
  must(await clients.bk.storage.from("arsip-dokumen").upload(path, pdf, { contentType: "application/pdf" }), "upload");
  const dok = must(await clients.bk.from("dokumen").insert({
    siswa_id: target.id, jenis: "surat_remisi", judul: "Surat pernyataan & bukti kegiatan sosial (DEMO)",
    nama_file: "surat-pernyataan.pdf", storage_path: path, mime_type: "application/pdf", ukuran_bytes: pdf.length, diunggah_oleh: id.bk,
  }).select().single(), "dokumen");
  must(await clients.bk.from("remisi").insert({
    siswa_id: target.id, jumlah_poin: 10, keterangan: "Aktif dalam kegiatan bakti sosial sekolah dan menunjukkan perubahan sikap.",
    tanggal: "2026-11-10", surat_dokumen_id: dok.id, dicatat_oleh: id.bk,
  }), "remisi");

  const surat = must(await clients.bk.from("surat").insert({
    siswa_id: target.id, jenis: "panggilan_orang_tua", judul: "Surat Panggilan Orang Tua/Wali",
    isi: `Surat panggilan untuk orang tua/wali ${target.nama_lengkap}. (DATA DEMO)`, dibuat_oleh: id.bk,
  }).select().single(), "surat");
  must(await clients.bk.rpc("finalisasi_surat", { p_id: surat.id }), "finalisasi");

  writeFileSync(
    process.env.DEMO_CRED_FILE ?? ".demo-credentials.local",
    `# AKUN DEMO — jangan commit. Password sama untuk semua akun.\nPASSWORD=${PASSWORD}\n${users.map((u) => `${u.role.padEnd(15)} ${u.email}`).join("\n")}\n`,
    { mode: 0o600 },
  );
  console.log(`✓ Seed demo selesai: ${siswa.length} siswa, ${created.length} usulan. Kredensial: .demo-credentials.local`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
