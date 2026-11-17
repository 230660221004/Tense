#!/usr/bin/env node
/**
 * Smoke test HTTP: login sebagai tiap role (akun demo) lalu buka halaman utama.
 * Memeriksa status HTTP, redirect otorisasi, dan tidak adanya error render.
 *
 *   BASE_URL=http://localhost:3000 node --env-file=.env.local scripts/smoke.mjs
 * Password dibaca dari DEMO_PASSWORD atau .demo-credentials.local.
 */
import { createServerClient } from "@supabase/ssr";
import { readFileSync, existsSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let password = process.env.DEMO_PASSWORD;
if (!password && existsSync(".demo-credentials.local")) {
  password = readFileSync(".demo-credentials.local", "utf8").match(/^PASSWORD=(.+)$/m)?.[1];
}
if (!url || !anon || !password) {
  console.error("Butuh NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, dan DEMO_PASSWORD/.demo-credentials.local");
  process.exit(1);
}
const D = "sekolah-demo.test";
const extraHeaders = process.env.VERCEL_BYPASS ? { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS } : {};

async function cookieFor(email) {
  const jar = new Map();
  const sb = createServerClient(url, anon, {
    cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (cs) => cs.forEach((c) => jar.set(c.name, c.value)) },
  });
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return [...jar].map(([n, v]) => `${n}=${v}`).join("; ");
}

const ALL = ["/dashboard", "/arsip", "/arsip/baru", "/persetujuan", "/siswa", "/tindak-lanjut", "/remisi", "/surat", "/dokumen", "/notifikasi", "/audit",
  "/master/tahun-ajaran", "/master/kelas", "/master/siswa", "/master/jenis-pelanggaran", "/master/tingkat-sanksi", "/master/template-surat", "/master/pengguna", "/pengaturan"];
const ALLOW = {
  admin: ALL,
  bk: ALL.filter((p) => !p.startsWith("/master") && p !== "/audit"),
  kepala_sekolah: ALL.filter((p) => !p.startsWith("/master") && p !== "/arsip/baru" && p !== "/persetujuan"),
  guru: ["/dashboard", "/arsip", "/arsip/baru", "/siswa", "/notifikasi", "/pengaturan"],
  siswa: ["/dashboard", "/notifikasi", "/pengaturan"],
  orang_tua: ["/dashboard", "/notifikasi", "/pengaturan"],
};
const EMAIL = { admin: `admin@${D}`, bk: `bk@${D}`, kepala_sekolah: `kepsek@${D}`, guru: `guru1@${D}`, siswa: `siswa@${D}`, orang_tua: `ortu@${D}` };

let fail = 0;
const res0 = await fetch(`${BASE}/dashboard`, { redirect: "manual", headers: extraHeaders });
const loc0 = res0.headers.get("location") ?? "";
if (!(res0.status >= 300 && res0.status < 400 && loc0.includes("/login"))) {
  console.log(`✗ anon /dashboard → ${res0.status} ${loc0}`);
  fail++;
} else console.log("✓ anon diarahkan ke /login");

for (const [role, email] of Object.entries(EMAIL)) {
  const cookie = await cookieFor(email);
  for (const path of ALL) {
    const r = await fetch(BASE + path, { redirect: "manual", headers: { cookie, ...extraHeaders } });
    const allowed = ALLOW[role].includes(path);
    const loc = r.headers.get("location") ?? "";
    let ok;
    if (allowed) {
      const body = r.status === 200 ? await r.text() : "";
      ok = r.status === 200 && !body.includes("Data gagal dimuat") && !body.includes("Application error");
    } else {
      // Redirect bisa berupa 307 atau, bila streaming sudah dimulai (loading.tsx), NEXT_REDIRECT di body.
      const body = r.status === 200 ? await r.text() : "";
      ok = (r.status >= 300 && r.status < 400 && loc.includes("/tidak-diizinkan")) || body.includes("NEXT_REDIRECT;replace;/tidak-diizinkan");
    }
    if (!ok) {
      fail++;
      console.log(`✗ ${role.padEnd(15)} ${path} → ${r.status} ${loc}`);
    }
  }
  console.log(`✓ ${role} selesai`);
}
console.log(fail ? `\n${fail} kegagalan` : "\nSemua smoke test lolos");
process.exit(fail ? 1 : 0);
