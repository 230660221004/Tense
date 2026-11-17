// Impor massal dari CSV ke Supabase.
// Pakai:  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node import.mjs [--dry]
// Butuh: npm i @supabase/supabase-js (Node 20+). Jalankan dari folder berisi CSV.
// Urutan: akun -> kelas -> siswa -> orang_tua -> jenis_pelanggaran. Aman dijalankan ulang.
// JANGAN taruh service role key di aplikasi Next.js atau di git.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

const DRY = process.argv.includes("--dry");
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function csv(file) {
  if (!existsSync(file)) return [];
  const t = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  const [h, ...b] = rows.filter((r) => r.some((x) => x.trim()));
  return b.map((r) => Object.fromEntries(h.map((k, i) => [k.trim(), (r[i] ?? "").trim()])));
}

async function run(label, rows, fn) {
  let ok = 0, bad = 0;
  for (const [i, r] of rows.entries()) {
    try { if (!DRY) await fn(r); ok++; } catch (e) { bad++; console.error(`  ${label} baris ${i + 2}: ${e.message}`); }
  }
  console.log(`${label}: ${ok} ok, ${bad} gagal${DRY ? " (dry-run, tidak ada yang ditulis)" : ""}`);
}

const idByEmail = new Map();
const { data: ex } = await sb.auth.admin.listUsers({ perPage: 1000 });
ex?.users.forEach((u) => idByEmail.set(u.email, u.id));

await run("akun", csv("akun.csv"), async (r) => {
  let id = idByEmail.get(r.email);
  if (!id) {
    const { data, error } = await sb.auth.admin.createUser({ email: r.email, password: r.password, email_confirm: true });
    if (error) throw error;
    id = data.user.id; idByEmail.set(r.email, id);
  }
  const { error } = await sb.from("profiles").upsert({ id, nama_lengkap: r.nama_lengkap, role: r.role, no_hp: r.no_hp || null });
  if (error) throw error;
});

const { data: ta } = await sb.from("tahun_ajaran").select("id,nama").eq("aktif", true).maybeSingle();
if (!ta) { console.error("Tidak ada tahun ajaran aktif. Buat dulu di tabel tahun_ajaran."); process.exit(1); }

const kelasId = new Map();
(await sb.from("kelas").select("id,nama").eq("tahun_ajaran_id", ta.id)).data?.forEach((k) => kelasId.set(k.nama, k.id));
await run("kelas", csv("kelas.csv"), async (r) => {
  const wali = r.wali_kelas_email ? idByEmail.get(r.wali_kelas_email) : null;
  if (r.wali_kelas_email && !wali) throw new Error("wali kelas tidak ditemukan: " + r.wali_kelas_email);
  const row = { tahun_ajaran_id: ta.id, nama: r.nama, tingkat: Number(r.tingkat), wali_kelas_id: wali };
  if (kelasId.has(r.nama)) {
    const { error } = await sb.from("kelas").update(row).eq("id", kelasId.get(r.nama)); if (error) throw error;
  } else {
    const { data, error } = await sb.from("kelas").insert(row).select("id").single(); if (error) throw error;
    kelasId.set(r.nama, data.id);
  }
});

await run("siswa", csv("siswa.csv"), async (r) => {
  const kid = kelasId.get(r.kelas);
  if (!kid) throw new Error("kelas tidak ada: " + r.kelas);
  const { error } = await sb.from("siswa").upsert({
    nis: r.nis, nisn: r.nisn || null, nama_lengkap: r.nama_lengkap, jenis_kelamin: r.jenis_kelamin || null,
    kelas_id: kid, nama_orang_tua: r.nama_orang_tua || null, no_hp_orang_tua: r.no_hp_orang_tua || null, alamat: r.alamat || null,
  }, { onConflict: "nis" });
  if (error) throw error;
});

await run("orang_tua_siswa", csv("orang_tua.csv"), async (r) => {
  const oid = idByEmail.get(r.email_ortu);
  if (!oid) throw new Error("akun orang tua tidak ada: " + r.email_ortu);
  const { data: s } = await sb.from("siswa").select("id").eq("nis", r.nis).maybeSingle();
  if (!s) throw new Error("NIS tidak ditemukan: " + r.nis);
  const { data: dup } = await sb.from("orang_tua_siswa").select("id").eq("orang_tua_id", oid).eq("siswa_id", s.id).maybeSingle();
  if (dup) return;
  const { error } = await sb.from("orang_tua_siswa").insert({ orang_tua_id: oid, siswa_id: s.id, hubungan: r.hubungan || "orang tua" });
  if (error) throw error;
});

await run("jenis_pelanggaran", csv("jenis_pelanggaran.csv"), async (r) => {
  const { error } = await sb.from("jenis_pelanggaran").upsert(
    { pasal: Number(r.pasal), kode: r.kode, nama: r.nama, deskripsi: r.deskripsi || null, bobot_poin: Number(r.bobot_poin) },
    { onConflict: "kode" });
  if (error) throw error;
});
