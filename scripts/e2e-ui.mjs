#!/usr/bin/env node
/**
 * E2E UI (Playwright, Chrome terpasang): alur usulan → persetujuan → pengesahan,
 * surat, notifikasi, plus screenshot responsif ke docs/screenshots/.
 *
 *   BASE_URL=http://localhost:3000 node scripts/e2e-ui.mjs
 * Password akun demo dari DEMO_PASSWORD atau .demo-credentials.local.
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PASSWORD = process.env.DEMO_PASSWORD ?? readFileSync(".demo-credentials.local", "utf8").match(/^PASSWORD=(.+)$/m)?.[1];
const D = "sekolah-demo.test";
const SHOTS = "docs/screenshots";
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "chrome", headless: true });
const step = (m) => console.log(`→ ${m}`);
let failures = 0;
const seen = (loc, timeout = 15000) => loc.first().waitFor({ state: "visible", timeout }).then(() => true, () => false);
const check = (cond, msg) => {
  if (!cond) {
    failures++;
    console.log(`  ✗ ${msg}`);
  } else console.log(`  ✓ ${msg}`);
};

async function session(user, viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport, locale: "id-ID", reducedMotion: "reduce" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => {
    failures++;
    console.log(`  ✗ pageerror: ${e.message}`);
  });
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email").fill(`${user}@${D}`);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL("**/dashboard");
  return { ctx, page };
}

try {
  // Login gagal
  step("login dengan password salah");
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`);
    await page.screenshot({ path: `${SHOTS}/login-desktop.png` });
    await page.getByLabel("Email").fill(`bk@${D}`);
    await page.getByLabel("Password").fill("salah-sekali");
    await page.getByRole("button", { name: "Masuk" }).click();
    check(await seen(page.getByText("Email atau password salah.")), "pesan error login tampil");
    await ctx.close();
  }

  step("guru membuat usulan + unggah bukti");
  const guru = await session("guru1");
  await guru.page.goto(`${BASE}/arsip/baru`);
  const siswaOpt = await guru.page.locator("#siswa_id option").nth(1).getAttribute("value");
  await guru.page.selectOption("#siswa_id", siswaOpt);
  const jenisOpt = await guru.page.locator("#jenis_pelanggaran_id option").nth(2).getAttribute("value");
  await guru.page.selectOption("#jenis_pelanggaran_id", jenisOpt);
  check((await guru.page.locator("output").textContent())?.includes("poin"), "bobot poin tampil dari master");
  await guru.page.getByLabel("Keterangan").fill("Uji E2E: siswa membolos jam ke-3, disaksikan guru piket.");
  await guru.page.setInputFiles("#bukti", { name: "bukti.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF\n") });
  await guru.page.getByRole("button", { name: "Kirim usulan" }).click();
  await guru.page.waitForURL(/\/arsip\/[0-9a-f-]{36}/, { timeout: 20000 });
  const pelId = guru.page.url().match(/arsip\/([0-9a-f-]{36})/)[1];
  check(await seen(guru.page.getByText("Usulan tersimpan")), "usulan tersimpan");
  check(await seen(guru.page.getByText("Bukti pelanggaran")), "bukti terunggah");
  // Validasi form
  await guru.page.goto(`${BASE}/arsip/baru`);
  await guru.page.getByRole("button", { name: "Kirim usulan" }).click();
  check(await seen(guru.page.locator("#siswa_id-error")), "validasi server tampil");
  await guru.ctx.close();

  step("Tanse menyetujui → Sah");
  const bk = await session("bk");
  await bk.page.screenshot({ path: `${SHOTS}/dashboard-desktop.png`, fullPage: true });
  check(await seen(bk.page.getByText("Peringatan dini").first()), "kartu peringatan dini tampil");
  await bk.page.goto(`${BASE}/persetujuan`);
  check(await seen(bk.page.locator(`a[href="/arsip/${pelId}"]`)), "usulan muncul di antrian Tanse");
  await bk.page.goto(`${BASE}/arsip/${pelId}`);
  check(await seen(bk.page.getByText("Diusulkan").first()), "status awal Diusulkan");
  await bk.page.getByRole("button", { name: "Setujui (sah)" }).click();
  check(await seen(bk.page.getByText("Status berhasil diperbarui.")), "Tanse setujui berhasil");
  check(await seen(bk.page.getByText("Sah", { exact: true })), "status menjadi Sah");
  const dlHref = await bk.page.locator('a[href^="/api/dokumen/"]').first().getAttribute("href");
  const dl = await bk.page.request.get(`${BASE}${dlHref}`, { maxRedirects: 0 });
  check(dl.status() === 307 && (dl.headers().location ?? "").includes("token="), "unduhan → signed URL");

  step("Tanse merevisi usulan lain");
  await bk.page.goto(`${BASE}/persetujuan`);
  const revHref = await bk.page.locator('a:has-text("Putuskan")').first().getAttribute("href");
  await bk.page.goto(`${BASE}${revHref}`);
  await bk.page.getByRole("group").getByText("Revisi").click();
  await bk.page.selectOption("#rev-jenis", { index: 12 });
  await bk.page.getByLabel("Keterangan").fill("Keterangan diperbaiki Tanse (E2E).");
  await bk.page.getByRole("button", { name: "Simpan revisi & sahkan" }).click();
  check(await seen(bk.page.getByText("Usulan direvisi dan disahkan")), "revisi & sahkan berhasil");

  step("Tanse input langsung → langsung sah");
  await bk.page.goto(`${BASE}/arsip/baru`);
  await bk.page.selectOption("#siswa_id", { index: 3 });
  await bk.page.selectOption("#jenis_pelanggaran_id", { index: 6 });
  await bk.page.getByLabel("Keterangan").fill("Ditemukan sendiri oleh Tanse (E2E).");
  await bk.page.getByRole("button", { name: "Simpan (langsung sah)" }).click();
  check(await seen(bk.page.getByText("Input langsung tersimpan")), "input langsung sah");

  step("PDF riwayat siswa");
  await bk.page.goto(`${BASE}/siswa`);
  await bk.page.locator('a:has-text("Profil")').first().click();
  await bk.page.waitForURL(/\/siswa\/[0-9a-f-]{36}/);
  const pdfHref = await bk.page.locator('a[href*="riwayat-pdf"]').getAttribute("href");
  const pdfRes = await bk.page.request.get(`${BASE}${pdfHref}`);
  const pdfBody = await pdfRes.body();
  check(pdfRes.status() === 200 && pdfBody.subarray(0, 4).toString() === "%PDF", "PDF riwayat terunduh");

  step("BK arsip: filter, sort, CSV");
  await bk.page.goto(`${BASE}/arsip?status=disahkan&sort=poin&dir=desc`);
  await bk.page.screenshot({ path: `${SHOTS}/arsip-desktop.png`, fullPage: true });
  const firstStatus = await bk.page.locator("tbody tr").first().textContent();
  check(firstStatus?.includes("Sah"), "filter status bekerja");
  const csv = await bk.page.request.get(`${BASE}/api/arsip/export?status=disahkan`);
  check(csv.status() === 200 && (await csv.text()).includes("Nama siswa"), "ekspor CSV");

  step("BK membuat & finalisasi surat");
  await bk.page.goto(`${BASE}/surat`);
  await bk.page.getByText("Buat draft surat").click();
  const sOpt = await bk.page.locator("#f-siswa_id option").nth(1).getAttribute("value");
  await bk.page.selectOption("#f-siswa_id", sOpt);
  await bk.page.selectOption("#f-jenis", { index: 1 });
  await bk.page.getByRole("button", { name: "Buat draft" }).click();
  await bk.page.waitForURL(/\/surat\/[0-9a-f-]{36}/, { timeout: 20000 });
  check(await seen(bk.page.getByText("Draft — belum sah")), "draft bertanda belum sah");
  await bk.page.getByRole("button", { name: "Finalisasi & beri nomor" }).click();
  check(await seen(bk.page.getByText("Surat difinalisasi")), "surat difinalisasi");
  const suratPdf = await bk.page.request.get(`${BASE}${await bk.page.locator('a[href$="/pdf"]').getAttribute("href")}`);
  check(suratPdf.status() === 200 && (await suratPdf.body()).subarray(0, 4).toString() === "%PDF", "PDF surat terunduh");
  await bk.page.reload();
  check(/\d{3}\/BK\/[IVX]+\/\d{4}/.test(await bk.page.locator("main").textContent()), "nomor surat tampil");
  await bk.ctx.close();

  step("Kepala sekolah hanya melihat");
  const ks = await session("kepsek");
  await ks.page.goto(`${BASE}/arsip/${pelId}`);
  check(!(await seen(ks.page.getByRole("button", { name: "Setujui (sah)" }), 2000)), "kepsek tidak punya tombol keputusan");
  await ks.page.goto(`${BASE}/audit?tabel=pelanggaran`);
  check(await seen(ks.page.getByText("DECISION:disahkan")), "audit trail mencatat keputusan");
  const pdfKs = await ks.page.request.get(`${BASE}${pdfHref}`);
  check(pdfKs.status() === 403, "kepsek tidak boleh unduh PDF riwayat");
  await ks.ctx.close();

  step("Guru menerima notifikasi");
  const g2 = await session("guru1");
  await g2.page.goto(`${BASE}/notifikasi`);
  check(await seen(g2.page.getByText("Keputusan usulan")), "notifikasi keputusan ke pengusul");
  await g2.page.getByRole("button", { name: /Tandai semua dibaca/ }).click();
  await g2.page.waitForTimeout(800);
  check(!(await seen(g2.page.getByRole("button", { name: /Tandai semua dibaca/ }), 2000)), "tandai semua dibaca");
  await g2.ctx.close();

  step("Portal siswa & screenshot responsif");
  const sw = await session("siswa", { width: 390, height: 844 });
  await sw.page.screenshot({ path: `${SHOTS}/portal-siswa-mobile.png`, fullPage: true });
  await sw.page.goto(`${BASE}/arsip`);
  await sw.page.waitForURL("**/tidak-diizinkan");
  check(sw.page.url().endsWith("/tidak-diizinkan"), "siswa ditolak dari arsip");
  await sw.ctx.close();

  for (const [name, vp] of [["tablet", { width: 834, height: 1112 }], ["mobile", { width: 390, height: 844 }]]) {
    const s = await session("bk", vp);
    await s.page.screenshot({ path: `${SHOTS}/dashboard-${name}.png`, fullPage: true });
    const overflow = await s.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    check(!overflow, `tanpa scroll horizontal halaman (${name})`);
    await s.page.goto(`${BASE}/arsip`);
    await s.page.screenshot({ path: `${SHOTS}/arsip-${name}.png`, fullPage: true });
    if (name === "mobile") {
      await s.page.getByRole("button", { name: "Buka menu" }).click();
      await s.page.screenshot({ path: `${SHOTS}/drawer-mobile.png` });
      await s.page.keyboard.press("Escape");
    }
    await s.ctx.close();
  }
  const adm = await session("admin");
  const { data: sid } = { data: null };
  void sid;
  await adm.page.goto(`${BASE}/siswa`);
  await adm.page.locator('a:has-text("Profil")').first().click();
  await adm.page.waitForURL(/\/siswa\/[0-9a-f-]{36}/);
  await adm.page.screenshot({ path: `${SHOTS}/siswa-detail-desktop.png`, fullPage: true });
  await adm.page.goto(`${BASE}/master/jenis-pelanggaran`);
  await adm.page.screenshot({ path: `${SHOTS}/master-desktop.png`, fullPage: true });
  await adm.ctx.close();
} catch (e) {
  failures++;
  console.error("✗ E2E error:", e.message);
} finally {
  await browser.close();
}
console.log(failures ? `\n${failures} kegagalan E2E` : "\nE2E UI lolos");
process.exit(failures ? 1 : 0);
