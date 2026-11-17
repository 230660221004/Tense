# TANSE

Aplikasi administrasi kedisiplinan sekolah: pencatatan pelanggaran, alur **usulan guru/wali kelas → keputusan Tanse (setujui / revisi / tolak) → Sah**, input langsung Tanse, akumulasi poin per tahun ajaran, tindak lanjut/sanksi, surat bernomor, remisi berdokumen, notifikasi, dan audit trail.

**Stack:** Next.js 16 (App Router, TypeScript strict) · Tailwind CSS 4 · Supabase (Auth, Postgres + RLS, Storage privat) · Zod · Recharts · Framer Motion · Lucide · Vitest · Playwright.

## Fitur

- Login email/password, logout, proteksi route (proxy + cek role server-side + RLS), halaman 403/404.
- Navigasi sesuai role; sidebar dapat diciutkan; drawer di mobile.
- Dashboard: KPI berlabel tahun ajaran, tren bulanan, distribusi status/pasal/tingkat, usulan terbaru, poin tertinggi, keputusan terbaru, tindak lanjut jatuh tempo, notifikasi.
- Arsip: pencarian (nama/NIS/kode), filter status/kelas/tingkat/pasal/jalur/tanggal, sorting kolom, pagination server-side, ekspor CSV (staf).
- Usulan pelanggaran dengan bukti; poin diambil dari master (snapshot).
- Keputusan satu tahap oleh Tanse (setujui, revisi pasal/keterangan, tolak dengan alasan), input langsung langsung sah, state machine tervalidasi di database.
- Peringatan dini (50 poin) & ambang skorsing (75 poin) rule-based dari master tingkat sanksi.
- Unduh PDF: surat & berita acara terisi otomatis, riwayat lengkap per siswa (Tanse/admin).
- Profil siswa: identitas, rekap poin bersih, posisi terhadap ambang sanksi (dari master), timeline, tindak lanjut, remisi, dokumen, surat.
- Tindak lanjut (snapshot poin), remisi (wajib dokumen; tidak melebihi poin bersih), surat dari template → finalisasi bernomor unik → cetak.
- Dokumen di Storage privat, unduh via signed URL 60 detik, validasi MIME dari isi file.
- Master: tahun ajaran (satu aktif), kelas & wali, siswa, jenis pelanggaran, tingkat sanksi, template surat, pengguna & relasi orang tua.
- Portal siswa/orang tua (hanya data sendiri/anak, hanya pelanggaran disahkan).
- Audit trail append-only (admin & kepala sekolah).

Detail keputusan data & keamanan: [`docs/data-model-notes.md`](docs/data-model-notes.md). Desain: [`docs/design-reference-audit.md`](docs/design-reference-audit.md). Deploy: [`docs/deployment.md`](docs/deployment.md).

## Menjalankan lokal

Prasyarat: Node ≥ 20.9, Docker.

```bash
npm install
npm run db:start                 # Supabase lokal (port 56321–56329)
npx supabase status -o env       # salin URL & key ke .env.local (lihat .env.example)
npm run seed:demo                # DATA DEMO → kredensial di .demo-credentials.local
npm run dev                      # http://localhost:3000
```

Akun demo (`@sekolah-demo.test`): `admin`, `bk`, `kesiswaan`, `kepsek`, `guru1`–`guru4`, `siswa`, `ortu`. Password acak tersimpan di `.demo-credentials.local` (di-gitignore).

## Kualitas

```bash
npm run lint
npm run typecheck
npm run test          # unit domain + integrasi RLS per role (31 test) (butuh Supabase lokal + seed; dilewati bila bukan localhost)
npm run build
node --env-file=.env.local scripts/smoke.mjs    # HTTP smoke 6 role × 19 halaman
node scripts/e2e-ui.mjs                          # E2E UI Playwright + screenshot ke docs/screenshots
```

## Struktur

```
src/app/(auth)/login         halaman masuk
src/app/(dashboard)/...      halaman terproteksi
src/app/api/...              CSV & unduhan dokumen
src/lib/{supabase,auth,permissions,validations,queries,actions,domain,utils}
src/components/{layout,dashboard,forms,ui}
supabase/migrations          schema, trigger/RPC, RLS & storage
scripts/                     seed demo, smoke, e2e
tests/                       vitest (domain, rls)
```

## Batasan yang diketahui

- Nilai enum di luar default schema adalah asumsi (lihat docs) — perlu konfirmasi sekolah.
- Referensi Dribbble tidak dapat diakses; fidelity layout terhadap shot belum diverifikasi.
- Push notification belum aktif (hanya notifikasi in-app).
- Tanda tangan surat dilakukan manual setelah cetak; tidak ada e-signature.
