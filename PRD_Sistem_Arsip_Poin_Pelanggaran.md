# PRD — TANSE (Sistem Pengelolaan Pelanggaran Siswa)
**Dokumen eksekusi untuk Claude Code | Next.js + Supabase + Vercel**

> **Misi implementasi:** Bangun prototipe web Sistem Arsip Poin Pelanggaran yang benar-benar berjalan, responsif, terhubung ke Supabase, dapat diuji end-to-end, memiliki repository GitHub, dan dideploy ke Vercel. Jangan berhenti pada mockup atau dokumentasi.

---

## 0. Instruksi Utama untuk Claude Code

Bertindak sebagai **Senior Product Manager, Senior Full-Stack Engineer, dan Senior Product Designer**. Kerjakan proyek ini secara mandiri dari audit workspace sampai aplikasi siap digunakan dan deployment terverifikasi.

### Aturan kerja wajib
1. Mulai dengan memeriksa workspace, struktur project, `git status`, remote Git, konfigurasi environment, dan integrasi yang sudah tersedia. **Jangan menimpa atau menghapus pekerjaan yang sudah ada.**
2. Jika project belum ada, scaffold Next.js App Router + TypeScript.
3. Gunakan SQL schema yang disediakan di bagian 11 sebagai sumber kebenaran domain. Audit enum/type, constraint, relasi, index, trigger, RLS, dan kemungkinan schema gaps sebelum implementasi.
4. Jangan mengarang nama enum yang tidak disediakan. Cari definisi enum/type di project/database. Jika tidak tersedia, dokumentasikan dan buat migration yang eksplisit berdasarkan penggunaan yang tampak pada schema; tandai asumsi dan minta konfirmasi hanya jika keputusan tersebut benar-benar menghalangi implementasi.
5. Implementasikan aplikasi yang berfungsi: auth, role-based access, CRUD yang relevan, pencarian/filter, detail, approval workflow, dokumen, surat, remisi, notifikasi, dan audit trail sesuai cakupan MVP.
6. **Dilarang menggunakan data mock sebagai pengganti backend.** Seed data boleh digunakan hanya untuk development/demo dan harus ditandai dengan jelas. Semua layar harus punya loading, empty, error, dan success states.
7. Jangan pernah mengekspos `SUPABASE_SERVICE_ROLE_KEY` atau secret lain ke browser. Semua akses harus mengikuti prinsip least privilege.
8. Jangan menghapus data atau menjalankan migration destruktif pada project Supabase yang sudah ada. Backup/inspect terlebih dahulu dan gunakan migration versioned.
9. Jalankan lint, typecheck, test, build, dan smoke test. Perbaiki error sebelum menyatakan selesai.
10. GitHub/Vercel/Supabase: gunakan akun dan CLI yang sudah login jika tersedia. Jika belum, siapkan konfigurasi dan instruksi satu langkah yang jelas. **Jangan mengarang token, password, URL, project ID, atau mengklaim deployment berhasil tanpa bukti.**
11. Sebelum membuat repository baru, pastikan tidak ada remote/repository yang sesuai. Jika belum ada dan GitHub CLI terautentikasi, buat repo dengan nama `sistem-arsip-poin-pelanggaran` (atau nama repo yang lebih sesuai dengan workspace), push branch utama, dan verifikasi remote.
12. Deploy ke Vercel jika CLI terautentikasi. Set environment variables dengan aman. Jika autentikasi atau approval pemilik akun dibutuhkan, berhenti pada titik itu dan berikan perintah persis yang perlu dijalankan pengguna.
13. Buat `README.md`, `.env.example`, migration SQL, seed development, dan dokumentasi setup/deploy.
14. Update checklist pada akhir setiap fase. Jangan berhenti setelah membuat rencana; lanjutkan sampai seluruh langkah yang dapat dilakukan telah selesai.
15. Jangan menampilkan secret dalam log, terminal output, README, commit, screenshot, atau jawaban akhir.

### Definition of Done
- [ ] Aplikasi Next.js berjalan secara lokal.
- [ ] Login/logout dan proteksi halaman berfungsi.
- [ ] Role dan akses server-side ditegakkan.
- [ ] Dashboard dan arsip mengambil data Supabase sungguhan.
- [ ] Filter, pencarian, detail riwayat, approval, dan perhitungan poin bekerja.
- [ ] Dokumen menggunakan Supabase Storage dengan akses privat.
- [ ] RLS dan policy diuji untuk setiap role.
- [ ] Audit trail tercatat untuk aksi penting.
- [ ] Responsive desktop/tablet/mobile.
- [ ] `lint`, `typecheck`, `test`, dan `build` lulus.
- [ ] Repository GitHub terhubung dan commit ter-push, atau blocker autentikasi dijelaskan.
- [ ] Vercel deployment terverifikasi, atau blocker autentikasi dijelaskan.
- [ ] Tidak ada secret di repository.

---

## 1. Ringkasan Produk

**Nama aplikasi:** TANSE  
**Jenis produk:** Internal school administration web application  
**Tujuan:** Memusatkan pencatatan pelanggaran siswa, akumulasi poin, proses persetujuan, tindak lanjut/sanksi, surat, dokumen pendukung, remisi, notifikasi, dan audit aktivitas.

### Sasaran prototipe
- Mempercepat pencatatan dan pencarian arsip pelanggaran.
- Memberikan gambaran kondisi kedisiplinan melalui dashboard.
- Menyediakan alur usulan → review/keputusan → pengesahan.
- Menjaga histori perubahan agar keputusan dapat ditelusuri.
- Menampilkan riwayat poin siswa secara kronologis dan transparan.

### Prinsip produk
- **Data-first:** angka dashboard berasal dari query database, bukan angka hardcoded.
- **Traceable:** keputusan dan perubahan status memiliki jejak.
- **Role-aware:** pengguna hanya melihat dan melakukan tindakan yang diizinkan.
- **Calm, professional, high-density:** dashboard administrasi yang padat informasi tetapi tetap mudah dipindai.
- **Prototype-ready, production-conscious:** aman secara arsitektur walau cakupan awal prototipe.

### Di luar cakupan MVP
- Integrasi WhatsApp/SMS berbayar.
- Tanda tangan elektronik tersertifikasi.
- Integrasi Dapodik atau sistem akademik eksternal.
- Aplikasi native iOS/Android.
- Otomasi keputusan sanksi tanpa persetujuan petugas berwenang.

---

## 2. Referensi Visual dan Design Direction

**Referensi utama wajib:**  
https://dribbble.com/shots/27820100-HR-Management-Dashboard-Modern-SaaS-UI-Design

### Interpretasi instruksi “mirip 100%”
Jadikan referensi tersebut sebagai **target fidelity visual setinggi mungkin** untuk struktur layout, proporsi, hierarki visual, komposisi dashboard, ritme spacing, treatment card, sidebar, header, tabel, chart, dan kepadatan informasi. Namun:
- Jangan menyalin logo, nama brand, ilustrasi, foto, atau aset proprietary milik kreator.
- Jangan memakai identitas HR pada produk sekolah.
- Gunakan nama aplikasi TANSE, identitas visual Al Azhar, dan komponen yang relevan dengan pengelolaan pelanggaran siswa.
- Jika screenshot/referensi tidak dapat diakses, jangan menebak detailnya. Minta pengguna menyediakan screenshot atau gunakan halaman referensi yang dapat diakses, lalu dokumentasikan bagian yang belum dapat diverifikasi.

### Tahap visual audit wajib
Sebelum coding UI:
1. Buka link referensi dan periksa screenshot penuh, bukan hanya thumbnail.
2. Catat: ukuran sidebar, lebar konten, tinggi header, grid, margin, padding, radius, shadow, typography, warna, tabel, chart, avatar, dan responsive behavior.
3. Buat `docs/design-reference-audit.md` berisi observasi konkret dan screenshot/reference notes.
4. Implementasikan layout dengan fidelity tinggi. Bandingkan screenshot lokal dengan referensi dan iterasi sampai perbedaan yang terlihat diminimalkan.
5. Jangan mengarang elemen visual yang tidak ada di referensi.

### Anti AI-slop
- Tidak menggunakan purple/blue gradient generik.
- Tidak menggunakan floating blobs, glassmorphism berlebihan, glow, neon, atau dekorasi tanpa fungsi.
- Tidak menggunakan dashboard template mentah.
- Hindari pill/badge di setiap elemen; gunakan hanya untuk status yang memang perlu.
- Hindari card berlebihan dan ruang kosong yang tidak proporsional.
- Jangan memakai emoji sebagai ikon UI. Gunakan satu set ikon konsisten seperti Lucide.
- Animasi halus dan fungsional; tidak mengorbankan kecepatan.
- Gunakan data dan copywriting Bahasa Indonesia yang natural.

### Design tokens
Halaman referensi Dribbble yang dibuka menampilkan deskripsi sebagai dashboard HR modern dengan antarmuka minimalis, serta palet warna berikut. Jadikan ini titik awal token, lalu validasi lagi terhadap visual shot penuh:
- `#F7F7F8` — light canvas / background
- `#A4A4A4` — muted neutral / secondary UI
- `#0C0B0B` — primary text / dark surface
- `#512BFF` — vivid accent yang ada pada palet referensi
- `#4D5D4A` — muted green accent/status
- `#B4624C` — warm terracotta accent/status

**Penerapan untuk produk sekolah:** pertahankan karakter minimalis dan kontras referensi. Gunakan `#512BFF` hanya sebagai aksen solid yang terukur bila memang tampak dominan pada screenshot; jangan membuat purple gradient. Untuk status gunakan hijau/terracotta secara semantik dan konsisten, bukan sebagai dekorasi. Buat CSS variables terpusat:
- `--background: #F7F7F8`
- `--text-primary: #0C0B0B`
- `--text-secondary: #A4A4A4`
- `--accent: #512BFF`
- `--accent-muted-green: #4D5D4A`
- `--accent-terracotta: #B4624C`
- `--surface`, `--surface-muted`, `--border`
- `--success`, `--warning`, `--danger`, `--info`
- `--radius-sm`, `--radius-md`, `--radius-lg`
- `--shadow-card`, `--sidebar-width`, `--header-height`

Jangan menganggap keenam warna tersebut harus dipakai dengan proporsi sama. Screenshot penuh menjadi acuan prioritas untuk distribusi warna, ukuran, komposisi, dan spacing. Pastikan kontras teks memadai. Warna status harus konsisten dan tidak menjadi satu-satunya pembeda status.

---

## 3. Pengguna, Role, dan Hak Akses

Schema memiliki `profiles.role` sebagai enum/user-defined type, tetapi daftar nilai enum tidak disertakan. Audit definisi aktual sebelum mengunci role. Model role minimum yang perlu dipetakan jika memang sesuai dengan enum aktual:

| Role konseptual | Kewenangan |
|---|---|
| Admin | Pengaturan master data, akun, kelas, tahun ajaran, kategori, sanksi, template surat |
| Guru / Pengusul | Membuat usulan pelanggaran, melihat data yang diizinkan, mengunggah bukti |
| BK / Kesiswaan | Meninjau usulan, memutuskan, mengelola tindak lanjut, arsip, dan surat |
| Kepala Sekolah / Approver | Melakukan pengesahan sesuai alur yang disepakati |
| Siswa | Melihat poin dan riwayat miliknya jika portal siswa termasuk scope |
| Orang Tua | Melihat riwayat siswa yang terhubung melalui `orang_tua_siswa` jika portal orang tua termasuk scope |

**Penting:** daftar di atas adalah role konseptual, bukan klaim bahwa enum database sudah memiliki nilai tersebut. Implementasikan mapping berdasarkan enum aktual. Jika enum tidak mendukung role konseptual tertentu, jangan memalsukan nilai role; dokumentasikan gap dan gunakan role yang tersedia.

### Security rules
- Auth menggunakan Supabase Auth.
- Profile dibuat/diikat ke `auth.users.id`.
- Semua halaman terlindungi diverifikasi di server.
- RLS aktif pada tabel yang menyimpan data siswa, pelanggaran, dokumen, surat, notifikasi, dan aktivitas.
- Siswa hanya dapat mengakses data miliknya.
- Orang tua hanya dapat mengakses siswa yang memiliki relasi sah di `orang_tua_siswa`.
- Guru hanya dapat mengakses data sesuai kebijakan sekolah/kelas.
- BK/Admin/Approver mengikuti kewenangan aktual.
- Jangan percaya `role`, `user_id`, atau `siswa_id` yang dikirim dari client; validasi di server/database.

---

## 4. Core Features

### 4.1 Authentication & App Shell
- Login email/password atau metode yang sudah dikonfigurasi pada Supabase Auth.
- Logout.
- Protected routes.
- Profile menu.
- Role-aware navigation.
- Session refresh dan error handling.
- Halaman unauthorized dan not-found.

### 4.2 Dashboard
Dashboard utama mengikuti komposisi referensi visual. Konten disesuaikan dengan data kedisiplinan.

**KPI yang disarankan:**
- Total siswa aktif.
- Pelanggaran periode berjalan.
- Usulan menunggu persetujuan.
- Total poin aktif/periode berjalan.
- Tindak lanjut yang sedang berjalan.
- Siswa dengan akumulasi poin tertinggi (hanya untuk role berwenang).

**Visualisasi:**
- Tren pelanggaran per bulan.
- Distribusi kategori/pasal pelanggaran.
- Distribusi status usulan.
- Ringkasan berdasarkan kelas/tingkat.

**Daftar ringkas:**
- Usulan terbaru.
- Aktivitas keputusan terbaru.
- Tindak lanjut yang mendekati/ melewati tanggal selesai.
- Notifikasi belum dibaca.

Semua KPI harus menjelaskan cakupan waktu dan filter tahun ajaran. Definisikan dengan jelas apakah total poin menghitung hanya pelanggaran yang disahkan, dikurangi remisi, dan apakah historis tahun ajaran sebelumnya masuk. Jangan mencampur data lintas tahun ajaran tanpa label.

### 4.3 Arsip Pelanggaran
Tabel utama menampilkan:
- Tanggal kejadian.
- NIS.
- Nama siswa.
- Kelas.
- Kode/pasal dan nama pelanggaran.
- Poin.
- Pengusul.
- Status.
- Aksi detail.

Fitur:
- Pencarian cepat berdasarkan nama, NIS, kode pelanggaran.
- Filter tahun ajaran, kelas, tingkat, kategori/pasal, status, jalur, rentang tanggal.
- Sorting kolom.
- Pagination server-side.
- Clear filters.
- Export CSV hanya untuk role berwenang (opsional MVP jika aman dan diperlukan).
- Empty state yang menjelaskan cara menambahkan arsip.

### 4.4 Detail Siswa & Riwayat Poin
Halaman profil siswa menampilkan:
- Identitas siswa: NIS, NISN, nama, jenis kelamin, kelas, status.
- Informasi orang tua sesuai akses.
- Ringkasan poin.
- Timeline pelanggaran yang disahkan.
- Riwayat usulan/keputusan.
- Tindak lanjut/sanksi.
- Remisi.
- Dokumen dan surat terkait.

**Perhitungan poin:**
- Gunakan pelanggaran dengan status final/disahkan sesuai definisi status enum aktual.
- Total poin bersih = total poin pelanggaran yang memenuhi syarat dikurangi total remisi yang sah.
- Jangan mengurangi poin dari pelanggaran yang masih menunggu keputusan/ditolak/dibatalkan.
- Hindari menghitung ganda jika ada perubahan status; status terkini dan log harus konsisten.
- Ambang sanksi dibaca dari `tingkat_sanksi.ambang_poin`, bukan hardcoded.
- Jika jenis sanksi memiliki aturan berbeda, implementasikan berdasarkan enum dan kebijakan sekolah yang tersedia.

### 4.5 Usulan, Review, Approval
Alur konseptual:
1. Pengusul membuat laporan pelanggaran.
2. Sistem menyimpan `pelanggaran` dengan status awal sesuai default database.
3. Reviewer memeriksa data dan bukti.
4. Reviewer menyetujui/menolak/meminta revisi sesuai enum aktual.
5. Keputusan mencatat `diputuskan_oleh`, `diputuskan_pada`, `catatan_keputusan`.
6. Jika diperlukan, approver mengesahkan dan mengisi `disahkan_pada`.
7. Setiap perubahan status membuat row di `pelanggaran_status_log`.
8. Aksi penting tercatat di `audit_log`.

Jangan mengasumsikan daftar transisi status. Buat state transition map berdasarkan enum aktual dan kebijakan yang disetujui. Validasi transisi di server/database, bukan hanya menyembunyikan tombol di UI.

### 4.6 Master Data
- Tahun ajaran: buat, edit, aktif/nonaktif; validasi hanya satu tahun ajaran aktif jika itu kebijakan yang disepakati.
- Kelas: tingkat 10/11/12, tahun ajaran, wali kelas.
- Siswa: tambah/edit/nonaktif, NIS/NISN unik.
- Jenis pelanggaran: pasal, kode, nama, deskripsi, bobot poin, aktif.
- Tingkat sanksi: nama, jenis, ambang poin, deskripsi, aktif.
- Profiles: administrasi akun dan role sesuai otorisasi.

### 4.7 Tindak Lanjut / Sanksi
- Daftar tindak lanjut.
- Detail jenis sanksi dan ambang.
- Tanggal mulai dan selesai.
- Status sesuai enum aktual.
- Total poin saat dibuat sebagai snapshot.
- Penanggung jawab/pembuat.
- Riwayat tindak lanjut per siswa.

### 4.8 Dokumen & Surat
- Upload dokumen terkait siswa, pelanggaran, atau tindak lanjut.
- Simpan metadata di `dokumen`.
- Simpan file pada Supabase Storage private bucket.
- Download menggunakan signed URL dengan masa berlaku singkat setelah authorization.
- Validasi MIME type, ukuran, dan nama file.
- Template surat dari `template_surat`.
- Buat draft surat dari data siswa/tindak lanjut.
- Finalisasi surat dan nomor surat unik.
- Jangan membuat surat resmi yang mengaku memiliki tanda tangan atau pengesahan yang belum dilakukan.

### 4.9 Remisi
- Catat jumlah poin, alasan, tanggal, dokumen surat pendukung, pencatat.
- Remisi wajib memiliki dokumen pendukung sesuai FK.
- Validasi jumlah remisi positif dan tidak membuat total poin bersih negatif kecuali kebijakan sekolah mengizinkan.
- Setiap perubahan tercatat di audit trail.

### 4.10 Notifikasi
- Daftar notifikasi per user.
- Tandai dibaca.
- Deep link ke record terkait.
- Push notification adalah fase lanjutan kecuali subscription dan service worker sudah tersedia.
- Jangan mengklaim push notification aktif jika hanya ada tabel `push_subscriptions`.

### 4.11 Audit Trail
- Catat aksi create/update/delete/decision/finalize pada entitas sensitif.
- Simpan tabel, record_id, aksi, pelaku, data lama/baru, timestamp.
- Batasi akses audit log ke role berwenang.
- Audit log sebaiknya append-only dari aplikasi; jangan sediakan UI edit/hapus.
- Hindari menyimpan data pribadi berlebihan dalam JSON audit.

---

## 5. Information Architecture & Routes

Gunakan route group sesuai kebutuhan, misalnya:

```text
/app
  /(auth)/login
  /(dashboard)/dashboard
  /(dashboard)/arsip
  /(dashboard)/arsip/[id]
  /(dashboard)/siswa
  /(dashboard)/siswa/[id]
  /(dashboard)/persetujuan
  /(dashboard)/tindak-lanjut
  /(dashboard)/dokumen
  /(dashboard)/surat
  /(dashboard)/remisi
  /(dashboard)/notifikasi
  /(dashboard)/master/tahun-ajaran
  /(dashboard)/master/kelas
  /(dashboard)/master/siswa
  /(dashboard)/master/jenis-pelanggaran
  /(dashboard)/master/tingkat-sanksi
  /(dashboard)/master/pengguna
  /(dashboard)/pengaturan
```

Route harus disesuaikan dengan role aktual. Jangan menampilkan menu yang tidak relevan, tetapi server tetap wajib memvalidasi akses.

---

## 6. UI/UX & Interaction Blueprint

### Layout
- Replikasi struktur dashboard referensi: sidebar navigasi, top header, area konten utama, KPI/summary blocks, chart, dan data table mengikuti hasil audit.
- Sidebar mendukung expanded/collapsed jika sesuai referensi.
- Header memuat breadcrumb/judul halaman, pencarian jika relevan, notifikasi, dan profile.
- Tabel memiliki header yang jelas, row hover subtle, pagination, dan action menu.
- Detail siswa menggunakan hierarchy yang mudah dipindai: identitas, ringkasan poin, timeline, dokumen.

### Motion
Gunakan Framer Motion atau CSS modern secara selektif:
- Page enter: opacity + translateY kecil, durasi sekitar 180–260ms.
- Sidebar/menu: transisi width/opacity halus.
- Modal/drawer: opacity + scale kecil, fokus tetap terjaga.
- Table row: hover transition ringan, tanpa animasi berlebihan.
- Chart: animasi awal singkat dan tidak berulang saat setiap render.
- Respect `prefers-reduced-motion`.
- Hindari parallax/scroll blur jika tidak tampak pada referensi atau mengganggu aplikasi administrasi.

### Scroll blur & parallax
Efek ini **bukan kewajiban dekoratif**. Terapkan hanya jika audit referensi menunjukkan efek tersebut:
- Gunakan `position: sticky` untuk header bila cocok.
- Backdrop blur tipis hanya pada elemen sticky yang membutuhkan pemisahan visual.
- Parallax sangat ringan hanya pada elemen dekoratif non-interaktif; jangan pada tabel, teks, atau form.
- Gunakan `useScroll`/`useTransform` Framer Motion hanya jika benar-benar dibutuhkan.
- Pastikan tidak menyebabkan layout shift, jank, atau konsumsi CPU berlebihan.

### Responsive
- Desktop: layout lengkap dan tabel lebar.
- Tablet: sidebar collapse, grid KPI menyesuaikan.
- Mobile: sidebar menjadi drawer, tabel berubah menjadi list/card atau horizontal scroll yang tetap usable, form satu kolom.
- Semua dialog, dropdown, dan menu dapat dioperasikan keyboard.

### Accessibility
- Semantic HTML.
- Label form eksplisit.
- Focus states jelas.
- Keyboard navigation.
- Kontras WCAG AA untuk teks normal sebagai target.
- Status tidak dibedakan dengan warna saja.

---

## 7. Tech Stack & Architecture

### Required
- Next.js App Router (versi stabil yang kompatibel dengan dependency saat setup).
- TypeScript strict.
- Tailwind CSS.
- Framer Motion untuk motion yang dibutuhkan.
- Supabase Auth, PostgreSQL, Storage.
- Zod untuk validasi input.
- React Hook Form bila form kompleks.
- Lucide React untuk ikon.
- Chart library yang ringan dan accessible.
- TanStack Table bila diperlukan untuk tabel kompleks.

### Architecture rules
- Server Components sebagai default.
- Client Components hanya untuk interaksi.
- Server Actions atau Route Handlers untuk mutation; pilih pola konsisten.
- Query Supabase di server untuk data sensitif.
- Validasi schema input di server.
- Shared types dan domain utilities.
- Pisahkan `lib/supabase/server.ts` dan `lib/supabase/client.ts`.
- Gunakan generated database types jika memungkinkan.
- Hindari `any`; jika terpaksa, jelaskan dan batasi.
- Jangan mengandalkan client-side filtering untuk data sensitif atau dataset besar.

### Suggested project structure
```text
src/
  app/
  components/
    layout/
    dashboard/
    tables/
    forms/
    students/
    violations/
    documents/
    ui/
  lib/
    supabase/
    auth/
    permissions/
    validations/
    queries/
    actions/
    utils/
  types/
  hooks/
supabase/
  migrations/
  seed.sql
docs/
  design-reference-audit.md
  data-model-notes.md
  deployment.md
```

---

## 8. Database Mapping to Components

| Tabel | Fungsi UI / domain |
|---|---|
| `tahun_ajaran` | Filter global tahun ajaran, selector tahun ajaran, master data |
| `profiles` | User profile, role, pengusul, reviewer, approver |
| `kelas` | Filter kelas, label kelas, wali kelas |
| `siswa` | Directory siswa, detail siswa, NIS/NISN |
| `orang_tua_siswa` | Relasi akses orang tua ke siswa |
| `jenis_pelanggaran` | Master kategori/pasal dan bobot poin |
| `tingkat_sanksi` | Aturan ambang poin dan jenis sanksi |
| `pelanggaran` | Arsip utama, detail, status, poin, tanggal, keputusan |
| `pelanggaran_status_log` | Timeline perubahan status |
| `tindak_lanjut` | Daftar dan histori sanksi/tindak lanjut |
| `dokumen` | Attachment metadata dan storage reference |
| `template_surat` | Master template surat |
| `surat` | Draft/final surat dan nomor surat |
| `remisi` | Pengurangan poin dengan bukti surat |
| `notifikasi` | Notification center |
| `push_subscriptions` | Endpoint push notification (future/optional) |
| `audit_log` | Audit aktivitas sensitif |

### Query and aggregation rules
- Dashboard query harus memakai agregasi database atau query server yang efisien.
- Terapkan pagination dan filter di database.
- Tambahkan index untuk kolom yang sering difilter/join, setelah memeriksa index existing.
- Pertimbangkan view/RPC untuk perhitungan poin agar satu sumber kebenaran digunakan dashboard dan detail siswa.
- Perhitungan poin harus memperhitungkan status final yang sah dan remisi yang valid.
- Semua agregasi harus terikat pada tahun ajaran/periode yang dipilih.
- Jangan menampilkan data lintas sekolah jika schema tidak memiliki tenant/school boundary; prototipe ini diasumsikan satu instansi.

---

## 9. Supabase, RLS, Storage & Data Integrity

### Initial audit
1. Periksa apakah project Supabase sudah terhubung.
2. Periksa migration yang sudah ada, enum, constraints, policies, triggers, functions, indexes, buckets.
3. Cocokkan schema yang ada dengan schema pada dokumen ini.
4. Jangan menjalankan ulang `CREATE TABLE` pada tabel yang sudah ada.
5. Buat migration incremental dan idempotent sejauh memungkinkan.

### Schema gaps to inspect
- Definisi enum untuk `profiles.role`, `siswa.status`, `pelanggaran.jalur`, `pelanggaran.status`, `tingkat_sanksi.jenis`, `tindak_lanjut.jenis/status`, `dokumen.jenis`, `surat.jenis/status`.
- RLS policies untuk semua tabel.
- Trigger `updated_at` untuk tabel yang memiliki kolom tersebut.
- Trigger/transactional function untuk status log dan audit log.
- Index FK dan kolom pencarian.
- Aturan satu tahun ajaran aktif.
- Unique constraint yang diperlukan pada kelas per tahun ajaran.
- Validasi transisi status.
- Storage bucket dan policy private.
- Kebijakan hard delete vs soft delete untuk data arsip.

### Storage
Buat bucket private, misalnya `arsip-dokumen`. Batasi upload/download berdasarkan role dan relasi record. Simpan `storage_path`, bukan public URL. Validasi ukuran dan tipe file di server.

### Integrity
- Gunakan transaction/RPC untuk perubahan yang harus atomik: status pelanggaran + status log + audit.
- Pastikan insert status log tidak bisa dilewati oleh jalur mutation aplikasi.
- Jangan mempercayai poin dari browser; ambil bobot dari master data dan simpan snapshot pada record pelanggaran jika kebijakan mengharuskannya. Schema saat ini sudah menyimpan `pelanggaran.poin`.
- Perubahan bobot kategori tidak boleh mengubah histori poin lama secara diam-diam.
- Definisikan apakah `pelanggaran.poin` adalah snapshot final atau dapat diedit saat review; dokumentasikan.

---

## 10. Development Roadmap untuk Claude Code

### Phase 0 — Workspace & access audit
- Inspect files, dependencies, git, remote, env, Supabase, Vercel, GitHub CLI.
- Report what exists and what is missing.
- Do not overwrite existing setup.

### Phase 1 — Reference & domain audit
- Inspect Dribbble reference and document exact visual characteristics.
- Inspect SQL schema and discover enum definitions from available source.
- Create `docs/design-reference-audit.md` and `docs/data-model-notes.md`.
- Write down unresolved policy assumptions.

### Phase 2 — Foundation
- Scaffold/configure Next.js App Router + TypeScript + Tailwind.
- Configure lint, formatting, typecheck, tests.
- Configure Supabase SSR clients and environment validation.
- Create app shell and design tokens.

### Phase 3 — Database & security
- Create/adjust migrations.
- Generate DB types.
- Implement RLS, storage policies, triggers/RPC as needed.
- Add development seed only if safe and clearly separated.
- Test role boundaries.

### Phase 4 — Core product
- Auth and protected routes.
- Dashboard.
- Arsip list, filters, search, pagination.
- Student detail and points timeline.
- Approval flow and status history.
- Master data.
- Follow-up, documents, letters, remissions, notifications, audit trail.

### Phase 5 — Visual refinement
- Compare against design reference.
- Refine typography, spacing, dimensions, cards, tables, chart, states.
- Responsive behavior.
- Motion and accessibility.
- Capture screenshots for key screens.

### Phase 6 — Quality assurance
Run:
```bash
npm run lint
npm run typecheck
npm run test
npm run build
```
If scripts differ, inspect `package.json` and use equivalent checks. Test login, role access, CRUD, filters, approval, point calculation, file upload/download, and error states. Fix all blockers.

### Phase 7 — GitHub
- Inspect existing repository and remotes.
- If no suitable remote and GitHub CLI is authenticated, create repository.
- Add `.gitignore`, ensure `.env*` secrets are ignored (keep `.env.example`).
- Commit with clear messages.
- Push main branch.
- Verify remote URL and pushed commit.

### Phase 8 — Vercel
- Inspect existing Vercel project/link.
- If not linked and Vercel CLI is authenticated, create/link project.
- Configure required environment variables securely.
- Deploy preview, inspect build/runtime logs, fix errors.
- Deploy production only when project owner has authorized it.
- Verify deployed URL and basic smoke test.

### Phase 9 — Handover
Provide:
- Local run instructions.
- Environment variable list (names only, no values).
- Supabase migration status.
- GitHub repository URL.
- Vercel deployment URL.
- Test/build status.
- Remaining manual steps and blockers.
- Known limitations and next recommended iteration.

---

## 11. SQL Schema Source of Truth

Gunakan schema berikut sebagai domain reference. Schema ini diberikan sebagai context dan **bukan SQL migration yang dijamin langsung executable**. Urutan tabel, enum, trigger, index, dan RLS belum lengkap. Claude Code wajib mengaudit dan membuat migration yang benar.

```sql
CREATE TABLE public.tahun_ajaran (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nama text NOT NULL UNIQUE,
  tanggal_mulai date NOT NULL,
  tanggal_selesai date NOT NULL,
  aktif boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tahun_ajaran_pkey PRIMARY KEY (id)
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  nama_lengkap text NOT NULL,
  role USER-DEFINED NOT NULL,
  no_hp text,
  aktif boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

CREATE TABLE public.kelas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tahun_ajaran_id uuid NOT NULL,
  nama text NOT NULL,
  tingkat smallint NOT NULL CHECK (tingkat = ANY (ARRAY[10, 11, 12])),
  wali_kelas_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT kelas_pkey PRIMARY KEY (id),
  CONSTRAINT kelas_tahun_ajaran_id_fkey FOREIGN KEY (tahun_ajaran_id) REFERENCES public.tahun_ajaran(id),
  CONSTRAINT kelas_wali_kelas_id_fkey FOREIGN KEY (wali_kelas_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.siswa (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid UNIQUE,
  nis text NOT NULL UNIQUE,
  nisn text UNIQUE,
  nama_lengkap text NOT NULL,
  jenis_kelamin character CHECK (jenis_kelamin = ANY (ARRAY['L'::bpchar, 'P'::bpchar])),
  kelas_id uuid,
  status USER-DEFINED NOT NULL DEFAULT 'aktif'::status_siswa,
  nama_orang_tua text,
  alamat text,
  no_hp_orang_tua text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT siswa_pkey PRIMARY KEY (id),
  CONSTRAINT siswa_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id),
  CONSTRAINT siswa_kelas_id_fkey FOREIGN KEY (kelas_id) REFERENCES public.kelas(id)
);

CREATE TABLE public.orang_tua_siswa (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  orang_tua_id uuid NOT NULL,
  siswa_id uuid NOT NULL,
  hubungan text NOT NULL DEFAULT 'orang tua'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT orang_tua_siswa_pkey PRIMARY KEY (id),
  CONSTRAINT orang_tua_siswa_orang_tua_id_fkey FOREIGN KEY (orang_tua_id) REFERENCES public.profiles(id),
  CONSTRAINT orang_tua_siswa_siswa_id_fkey FOREIGN KEY (siswa_id) REFERENCES public.siswa(id)
);

CREATE TABLE public.jenis_pelanggaran (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pasal smallint NOT NULL,
  kode text NOT NULL UNIQUE,
  nama text NOT NULL,
  deskripsi text,
  bobot_poin smallint NOT NULL CHECK (bobot_poin >= 0),
  aktif boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT jenis_pelanggaran_pkey PRIMARY KEY (id)
);

CREATE TABLE public.tingkat_sanksi (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  jenis USER-DEFINED NOT NULL,
  ambang_poin smallint NOT NULL CHECK (ambang_poin > 0),
  deskripsi text,
  aktif boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tingkat_sanksi_pkey PRIMARY KEY (id)
);

CREATE TABLE public.pelanggaran (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  siswa_id uuid NOT NULL,
  kelas_id uuid,
  tahun_ajaran_id uuid,
  jenis_pelanggaran_id uuid NOT NULL,
  poin smallint NOT NULL CHECK (poin >= 0),
  tanggal_kejadian date NOT NULL DEFAULT CURRENT_DATE,
  deskripsi text,
  jalur USER-DEFINED NOT NULL DEFAULT 'usulan'::jalur_pelanggaran,
  status USER-DEFINED NOT NULL DEFAULT 'menunggu_persetujuan'::status_pelanggaran,
  pengusul_id uuid NOT NULL,
  diputuskan_oleh uuid,
  diputuskan_pada timestamp with time zone,
  catatan_keputusan text,
  disahkan_pada timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pelanggaran_pkey PRIMARY KEY (id),
  CONSTRAINT pelanggaran_siswa_id_fkey FOREIGN KEY (siswa_id) REFERENCES public.siswa(id),
  CONSTRAINT pelanggaran_kelas_id_fkey FOREIGN KEY (kelas_id) REFERENCES public.kelas(id),
  CONSTRAINT pelanggaran_tahun_ajaran_id_fkey FOREIGN KEY (tahun_ajaran_id) REFERENCES public.tahun_ajaran(id),
  CONSTRAINT pelanggaran_jenis_pelanggaran_id_fkey FOREIGN KEY (jenis_pelanggaran_id) REFERENCES public.jenis_pelanggaran(id),
  CONSTRAINT pelanggaran_pengusul_id_fkey FOREIGN KEY (pengusul_id) REFERENCES public.profiles(id),
  CONSTRAINT pelanggaran_diputuskan_oleh_fkey FOREIGN KEY (diputuskan_oleh) REFERENCES public.profiles(id)
);

CREATE TABLE public.pelanggaran_status_log (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  pelanggaran_id uuid NOT NULL,
  status_dari USER-DEFINED,
  status_ke USER-DEFINED NOT NULL,
  oleh uuid,
  catatan text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pelanggaran_status_log_pkey PRIMARY KEY (id),
  CONSTRAINT pelanggaran_status_log_pelanggaran_id_fkey FOREIGN KEY (pelanggaran_id) REFERENCES public.pelanggaran(id),
  CONSTRAINT pelanggaran_status_log_oleh_fkey FOREIGN KEY (oleh) REFERENCES public.profiles(id)
);

CREATE TABLE public.tindak_lanjut (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  siswa_id uuid NOT NULL,
  tingkat_sanksi_id uuid,
  jenis USER-DEFINED NOT NULL,
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  tanggal_selesai date,
  keterangan text,
  status USER-DEFINED NOT NULL DEFAULT 'direncanakan'::status_tindak_lanjut,
  total_poin_saat_dibuat integer,
  dibuat_oleh uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tindak_lanjut_pkey PRIMARY KEY (id),
  CONSTRAINT tindak_lanjut_siswa_id_fkey FOREIGN KEY (siswa_id) REFERENCES public.siswa(id),
  CONSTRAINT tindak_lanjut_tingkat_sanksi_id_fkey FOREIGN KEY (tingkat_sanksi_id) REFERENCES public.tingkat_sanksi(id),
  CONSTRAINT tindak_lanjut_dibuat_oleh_fkey FOREIGN KEY (dibuat_oleh) REFERENCES public.profiles(id)
);

CREATE TABLE public.dokumen (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  siswa_id uuid NOT NULL,
  pelanggaran_id uuid,
  tindak_lanjut_id uuid,
  jenis USER-DEFINED NOT NULL,
  judul text NOT NULL,
  nama_file text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  mime_type text,
  ukuran_bytes bigint CHECK (ukuran_bytes >= 0),
  diunggah_oleh uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT dokumen_pkey PRIMARY KEY (id),
  CONSTRAINT dokumen_siswa_id_fkey FOREIGN KEY (siswa_id) REFERENCES public.siswa(id),
  CONSTRAINT dokumen_pelanggaran_id_fkey FOREIGN KEY (pelanggaran_id) REFERENCES public.pelanggaran(id),
  CONSTRAINT dokumen_tindak_lanjut_id_fkey FOREIGN KEY (tindak_lanjut_id) REFERENCES public.tindak_lanjut(id),
  CONSTRAINT dokumen_diunggah_oleh_fkey FOREIGN KEY (diunggah_oleh) REFERENCES public.profiles(id)
);

CREATE TABLE public.template_surat (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  jenis USER-DEFINED NOT NULL UNIQUE,
  judul text NOT NULL,
  isi text NOT NULL,
  aktif boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT template_surat_pkey PRIMARY KEY (id)
);

CREATE TABLE public.surat (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  siswa_id uuid NOT NULL,
  tindak_lanjut_id uuid,
  jenis USER-DEFINED NOT NULL,
  nomor_surat text UNIQUE,
  judul text NOT NULL,
  isi text NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'draft'::status_surat,
  dokumen_id uuid,
  dibuat_oleh uuid NOT NULL,
  difinalisasi_pada timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT surat_pkey PRIMARY KEY (id),
  CONSTRAINT surat_siswa_id_fkey FOREIGN KEY (siswa_id) REFERENCES public.siswa(id),
  CONSTRAINT surat_tindak_lanjut_id_fkey FOREIGN KEY (tindak_lanjut_id) REFERENCES public.tindak_lanjut(id),
  CONSTRAINT surat_dokumen_id_fkey FOREIGN KEY (dokumen_id) REFERENCES public.dokumen(id),
  CONSTRAINT surat_dibuat_oleh_fkey FOREIGN KEY (dibuat_oleh) REFERENCES public.profiles(id)
);

CREATE TABLE public.remisi (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  siswa_id uuid NOT NULL,
  jumlah_poin smallint NOT NULL CHECK (jumlah_poin > 0),
  keterangan text NOT NULL,
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  surat_dokumen_id uuid NOT NULL,
  dicatat_oleh uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT remisi_pkey PRIMARY KEY (id),
  CONSTRAINT remisi_siswa_id_fkey FOREIGN KEY (siswa_id) REFERENCES public.siswa(id),
  CONSTRAINT remisi_surat_dokumen_id_fkey FOREIGN KEY (surat_dokumen_id) REFERENCES public.dokumen(id),
  CONSTRAINT remisi_dicatat_oleh_fkey FOREIGN KEY (dicatat_oleh) REFERENCES public.profiles(id)
);

CREATE TABLE public.notifikasi (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  judul text NOT NULL,
  isi text,
  tipe text NOT NULL DEFAULT 'info'::text,
  tautan text,
  dibaca_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifikasi_pkey PRIMARY KEY (id),
  CONSTRAINT notifikasi_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  tabel text NOT NULL,
  record_id text,
  aksi text NOT NULL,
  oleh uuid,
  data_lama jsonb,
  data_baru jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT audit_log_pkey PRIMARY KEY (id)
);
```

---

## 12. Prompt Eksekusi Lengkap untuk Claude Code

Simpan bagian ini sebagai `CLAUDE_EXECUTION_PROMPT.md` atau salin seluruh instruksi ke Claude Code setelah membuka root project.

```text
You are the autonomous Senior Full-Stack Engineer, Product Designer, QA Engineer, and Release Engineer for this project.

Your mission is to BUILD the complete working prototype described in PRD.md, not merely explain how to build it.

NON-NEGOTIABLE:
- Read PRD.md completely before coding.
- Inspect the existing workspace, git status, remotes, package manager, environment files, Supabase config, Vercel config, and available CLI authentication.
- Preserve existing work. Never overwrite user files without inspecting them.
- Follow the Dribbble reference URL in PRD.md. Audit the actual visual reference first. Do not invent visual details if it is inaccessible.
- Use the supplied SQL schema as the domain source of truth, but inspect actual enum definitions and existing database state before migrations.
- Never expose secrets or commit .env files.
- Never claim a deployment, push, test, or migration succeeded unless verified.
- Never run destructive database operations against an existing Supabase project.
- Do not stop after planning. Continue through implementation, tests, GitHub, and Vercel for every step that can be completed safely.

EXECUTION ORDER:
1. Audit workspace and report concise findings.
2. Create/update docs/design-reference-audit.md and docs/data-model-notes.md.
3. Establish Next.js App Router, TypeScript strict, Tailwind, Supabase SSR, validation, lint/typecheck/test scripts.
4. Implement migrations incrementally, including missing enum definitions only after verifying actual schema. Add appropriate RLS, storage policies, indexes, triggers, and transactional functions.
5. Implement authentication, role-based authorization, app shell, dashboard, violation archive, search/filter/pagination, student detail and point history, approval workflow, master data, follow-up, documents, letters, remissions, notifications, and audit trail.
6. Implement polished responsive UI with high fidelity to the referenced Dribbble dashboard's observable layout and visual language. Use original product identity and school-specific content. Avoid generic AI design patterns.
7. Implement loading, empty, error, success, validation, and unauthorized states.
8. Add safe development seed data only if needed; never seed production automatically.
9. Test database permissions and role boundaries. Test point calculation and status transitions.
10. Run lint, typecheck, tests, and production build. Fix every issue.
11. Inspect GitHub CLI authentication and repository state. If no suitable remote exists and authentication is available, create a repository, commit, push, and verify.
12. Inspect Vercel CLI authentication and project state. If available, configure environment variables safely, deploy preview, verify, then deploy production only with appropriate authorization.
13. If a credential or owner approval is missing, do not fabricate it. Complete all other work and give the exact next command/action required from the user.
14. Update README.md and docs/deployment.md.
15. Deliver a final report with:
    - implemented features
    - key architecture and security decisions
    - migration status
    - lint/typecheck/test/build results
    - GitHub URL and pushed commit (if verified)
    - Vercel URL and deployment status (if verified)
    - environment variable NAMES only
    - remaining blockers/manual actions

QUALITY BAR:
- Real Supabase data, not fake static data in production screens.
- Server-side authorization and RLS; client-side hiding is not security.
- No service role key in client bundle.
- No broken links, dead buttons, placeholder actions, or TODOs presented as finished features.
- Accessible forms, keyboard navigation, responsive layouts, and reduced-motion support.
- No arbitrary hardcoded point thresholds or invented enum values.
- No destructive changes to existing data.
- Keep the implementation maintainable and type-safe.

Start by auditing the repository and available credentials. Then execute the plan end-to-end. Do not ask for confirmation for safe, reversible local work. Ask only when an irreversible action, production data change, paid resource, or account-owner authorization is required.
```

---

## 13. Environment Variables

Buat `.env.example` dengan nama variabel saja dan placeholder kosong/deskriptif:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
```

Catatan:
- `SUPABASE_SERVICE_ROLE_KEY` hanya server-side dan tidak boleh memiliki prefix `NEXT_PUBLIC_`.
- Jika menggunakan Supabase publishable key terbaru, sesuaikan nama variabel dan client configuration.
- Jangan menaruh nilai secret di dokumentasi atau commit.
- Validasi environment saat startup dan berikan error yang jelas bila variabel wajib belum tersedia.

---

## 14. Final Handover Format

Claude Code wajib mengakhiri pekerjaan dengan laporan:

1. **Status:** Complete / Partially complete / Blocked.
2. **Features:** daftar fitur yang benar-benar berjalan.
3. **Design:** hasil audit referensi dan halaman yang sudah dibandingkan.
4. **Database:** project Supabase yang digunakan, migration yang diterapkan, RLS/storage status.
5. **QA:** hasil lint, typecheck, tests, build, smoke tests.
6. **GitHub:** URL repo, branch, commit hash, push status.
7. **Vercel:** deployment URL, environment status (nama saja), deployment status.
8. **Manual action:** langkah spesifik yang masih memerlukan pengguna.
9. **Known limitations:** hal yang belum selesai dan alasannya.

**Jangan menulis “berhasil deploy” jika URL belum dapat dibuka atau deployment belum terverifikasi.**
