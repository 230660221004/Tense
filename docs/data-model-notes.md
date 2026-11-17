# Catatan Model Data

Sumber kebenaran: PRD §11. Migration: `supabase/migrations/` (idempotent, `create … if not exists`, tanpa `drop table`).

## Enum — ASUMSI (schema sumber hanya menulis `USER-DEFINED`)

Tidak ada database/project yang berisi definisi enum ini (project Supabase baru). Nilai **default yang tampak di schema dipertahankan persis**; sisanya asumsi yang perlu dikonfirmasi sekolah:

| Enum (kolom) | Nilai | Dasar |
|---|---|---|
| `user_role` (`profiles.role`) | admin, bk, kepala_sekolah, guru, siswa, orang_tua | role konseptual PRD §3 |
| `status_siswa` | **aktif**, nonaktif, lulus, pindah, dikeluarkan | default `'aktif'` |
| `jalur_pelanggaran` | **usulan**, langsung | default `'usulan'`; `langsung` = input BK/admin |
| `status_pelanggaran` | **menunggu_persetujuan**, disetujui, disahkan, ditolak, dibatalkan | default; kolom `diputuskan_*` & `disahkan_pada` menyiratkan 2 tahap |
| `jenis_sanksi` (`tingkat_sanksi.jenis`, `tindak_lanjut.jenis`) | pembinaan, teguran_tertulis, panggilan_orang_tua, skorsing, dikembalikan_ke_orang_tua | asumsi; satu enum dipakai dua kolom |
| `status_tindak_lanjut` | **direncanakan**, berjalan, selesai, dibatalkan | default `'direncanakan'` |
| `jenis_dokumen` | bukti_pelanggaran, surat_pernyataan, surat_remisi, surat_keluar, lainnya | asumsi |
| `jenis_surat` | panggilan_orang_tua, peringatan, skorsing, pernyataan_siswa | asumsi (unik per template) |
| `status_surat` | **draft**, final, dibatalkan | default `'draft'` |

Menambah nilai enum di kemudian hari aman (`alter type … add value`).

## Alur klien (`alur dari client.md`) — diterapkan migration 004–005

- **Tanse = role `bk`** (label UI "Tanse (BK/Kesiswaan)"). Kepala sekolah hanya melihat (tidak ada tahap pengesahan).
- Guru/wali kelas mengusulkan → status **Diusulkan** (`menunggu_persetujuan`), poin belum bertambah.
- Tanse memutuskan dalam **satu tahap**:
  - **Setujui** → `disahkan` ("Sah"), poin pasal (0/10/15) masuk total.
  - **Revisi** → RPC `revisi_dan_sahkan_pelanggaran()` mengganti pasal/keterangan, menghitung ulang poin dari master, lalu Sah; catatan "Direvisi: pasal X → Y" tersimpan di status log & audit.
  - **Tolak** → `ditolak`, alasan wajib & tersimpan, poin tidak bertambah.
- **Input langsung** Tanse/admin → trigger insert langsung `disahkan`, `jalur = langsung`, tanpa tahap usulan.
- Status `disetujui` tidak lagi dipakai (enum dipertahankan agar non-destruktif; data lama tetap bisa diselesaikan).
- **Peringatan dini (50)** dan **ambang skorsing (75)** dibaca dari `tingkat_sanksi` (seed demo), fungsi `siswa_ambang()` — rule-based; dasbor menandai siswa, keputusan sanksi tetap manual.
- **Surat & berita acara** (jenis `berita_acara` baru) terisi otomatis dari data siswa + daftar pelanggaran sah (`{{daftar_pelanggaran}}`), unduh PDF `/api/surat/[id]/pdf` (draft diberi watermark).
- **PDF riwayat lengkap per siswa** `/api/siswa/[id]/riwayat-pdf` — hanya Tanse & admin.
- **15 pasal** tata tertib pada seed demo dengan poin 0/10/15 (nama pasal DATA DEMO — ganti dengan tata tertib sekolah di Master › Jenis Pelanggaran).

## State machine pelanggaran

Fungsi SQL `transisi_pelanggaran_diizinkan()` dicerminkan di `src/lib/domain/status.ts`; kesetaraan diuji untuk semua kombinasi di `tests/rls`.

| Dari | Ke | Role |
|---|---|---|
| menunggu_persetujuan (Diusulkan) | disahkan (Sah), ditolak | bk (Tanse), admin |
| menunggu_persetujuan | dibatalkan | pengusul sendiri, admin |
| disahkan | dibatalkan | admin |

- Jalur perubahan status hanya RPC (`ubah_status_pelanggaran`, `revisi_dan_sahkan_pelanggaran`) — UPDATE langsung ditolak trigger.
- Penolakan/pembatalan wajib alasan. Status log + notifikasi ditulis trigger dalam transaksi yang sama.
- Setelah diputuskan, arsip terkunci.

## Poin

- `pelanggaran.poin` = **snapshot** `jenis_pelanggaran.bobot_poin` saat insert (trigger; nilai dari client diabaikan). Dapat berubah hanya jika jenis diganti saat masih menunggu. Perubahan bobot master tidak mengubah histori.
- Total poin = Σ poin berstatus **disahkan (Sah)** dengan `tahun_ajaran_id` = TA terpilih.
- Remisi = Σ `remisi.jumlah_poin` dengan tanggal dalam rentang TA (tabel remisi tidak punya `tahun_ajaran_id`).
- Poin bersih = total − remisi; trigger remisi menolak remisi > poin bersih → tidak pernah negatif.
- Satu sumber: `rekap_poin_siswa()` dipakai dashboard, daftar siswa, profil, surat. Data lintas TA tidak dicampur; semua KPI berlabel TA.
- Ambang sanksi dibaca dari `tingkat_sanksi.ambang_poin` (aktif), tidak di-hardcode.
- `tindak_lanjut.total_poin_saat_dibuat` = snapshot poin bersih TA aktif (trigger; tidak dapat diubah).

## Akses (RLS)

| Data | admin | bk | kepala_sekolah | guru | siswa | orang_tua |
|---|---|---|---|---|---|---|
| Direktori siswa | ✓ | ✓ | ✓ | ✓ | diri | anak terhubung |
| Pelanggaran | semua | semua | semua | usulan sendiri + kelas perwalian | diri, hanya disahkan | anak, hanya disahkan |
| Rekap poin, tindak lanjut, remisi, dokumen | ✓ | ✓ | ✓ | kelas perwalian | diri | anak |
| Surat | ✓ | ✓ | ✓ | final, kelas perwalian | final, diri | final, anak |
| Template surat | tulis | baca | baca | – | – | – |
| Audit log | baca | – | baca | – | – | – |
| PDF riwayat siswa | ✓ | ✓ | – | – | – | – |
| Master data | tulis | baca | baca | baca | baca | baca |

- `anon` tidak punya grant apa pun. Helper role (`app_role()`, `can_view_*`) SECURITY DEFINER dengan `search_path = ''`.
- Role tidak pernah dari client: trigger profil membuat role default `siswa`; role ditetapkan admin. Non-admin tidak dapat mengubah role/aktif (trigger), admin tidak dapat mengubah role sendiri.
- Pendaftaran publik dimatikan; akun dibuat admin via service role (server-only) setelah verifikasi role.
- Notifikasi: hanya milik sendiri; hanya kolom `dibaca_at` yang dapat diubah (column grant).
- Audit log & status log: append-only (tanpa grant insert/update/delete untuk `authenticated`).

## Storage

Bucket privat `arsip-dokumen` (10 MB; pdf/jpeg/png/webp). Path `siswa/<siswa_id>/<uuid>-<nama>`.
- Unduh: route `/api/dokumen/[id]` → baca baris `dokumen` (RLS) → signed URL 60 detik.
- Policy select objek mensyaratkan baris `dokumen` yang terlihat oleh user.
- MIME diverifikasi dari magic bytes di server, nama file disanitasi.
- Upload yatim (metadata gagal) di-rollback; delete hanya untuk objek tanpa metadata milik uploader.

## Audit

Trigger `audit_row()` pada 13 tabel. Kunci PII dibuang dari JSON: `profiles.no_hp`, `siswa.alamat`, `siswa.no_hp_orang_tua`, `surat.isi`, `template_surat.isi`.
Aksi: INSERT/UPDATE/DELETE, `DECISION:<status>`, `FINALIZE`.

## Integritas tambahan (gap yang ditutup)

- Unique partial index: satu `tahun_ajaran.aktif`. RPC `set_tahun_ajaran_aktif()` menukar atomik.
- `unique (tahun_ajaran_id, nama)` pada kelas; `unique (orang_tua_id, siswa_id)`.
- CHECK rentang tanggal tahun ajaran & tindak lanjut.
- Trigger `updated_at`, index FK & pencarian (trigram nama siswa).
- Tanggal kejadian tidak boleh di masa depan; siswa harus aktif.
- Hard delete: tidak ada grant delete untuk arsip (pelanggaran, dokumen, remisi, surat, tindak lanjut). Pembatalan via status.
- Nomor surat: `NNN/BK/<bulan romawi>/<tahun>` dari sequence saat finalisasi; surat final tidak dapat diubah.

## Arsitektur aplikasi

- Next.js 16 App Router, Server Components default, Server Actions untuk mutation, Route Handlers untuk CSV & unduhan.
- `cacheComponents` dimatikan: semua halaman bergantung pada sesi (cookie) sehingga render dinamis klasik lebih sederhana dan aman.
- Otorisasi berlapis: proxy (sesi) → `requireRoute()` per halaman/aksi (role dari DB) → RLS/trigger (penegak akhir).
- Redirect halaman terlarang dapat berupa meta-refresh/`NEXT_REDIRECT` di stream karena `loading.tsx`; tidak ada data yang dirender.
- Push notification: tabel `push_subscriptions` tersedia (RLS milik sendiri), tetapi service worker belum ada — **push belum aktif**.
