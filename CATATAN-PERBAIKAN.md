# Paket perbaikan TANSE — sesuai hasil wawancara

Berisi 1 migrasi database, 24 berkas kode, ikon PWA, dan halaman login baru.
Struktur folder sama dengan proyek Anda: salin ke akar proyek dan **timpa** berkas yang sama.

## Cara menerapkan
1. Salin isi zip ke proyek (timpa).
2. Terapkan migrasi `supabase/migrations/20261117000300_006_privasi_peran_waktu.sql`
   (`npx supabase db push`, atau tempel di SQL Editor). Aman dijalankan ulang.
3. Perbarui tipe: `npx supabase gen types typescript ... > src/types/database.ts`
   (zip hanya menambah `kontak_siswa` secara manual).
4. Jalankan lint, typecheck, dan tes proyek Anda. **Paket ini belum dijalankan/dikompilasi.**
5. Uji PWA di mode produksi: `npm run build && npm start`, lalu cek tombol "Install" di Chrome.

## Yang berubah
| Area | Perubahan |
|---|---|
| Peran | Keputusan (sah/tolak/revisi), input langsung, tindak lanjut, remisi, surat, finalisasi: **hanya Tanse (`bk`)**. Admin = akun & master data, dan baca-saja untuk data kedisiplinan. Berlaku di DB (RLS + fungsi) dan UI. |
| Privasi dokumen | Siswa/orang tua tidak lagi bisa membuka bukti pelanggaran atau dokumen usulan belum sah. Hanya surat pernyataan, surat remisi, surat keluar. Log keputusan juga ditutup untuk mereka. |
| Privasi kontak | `alamat` dan `no_hp_orang_tua` tidak bisa dibaca dari tabel `siswa`; hanya via `kontak_siswa()` (Tanse, admin, kepala sekolah, wali kelas). Tidak ada lagi `select("*")` pada siswa. |
| Remisi | Dokumen pendukung wajib berjenis `surat_remisi`. Pembatalan poin sah ditolak bila poin bersih jadi negatif. Baris siswa dikunci (aman dari dua remisi bersamaan). |
| Zona waktu | Tanggal acuan DB dan validasi memakai WIB. Input 00.00–07.00 WIB tidak lagi ditolak. |
| Nomor surat | Kembali ke 001 tiap tahun (WIB), melanjutkan nomor yang sudah terbit. |
| Keamanan kecil | Redirect login menolak `/\host`. Kegagalan ubah status tindak lanjut dan aktivasi tahun ajaran kini tampil sebagai pesan. |
| PWA | `manifest.ts`, `sw.js` (hanya halaman offline, **tanpa menyimpan data siswa**), `offline.html`, ikon, pendaftaran SW, matcher `proxy.ts`. |
| Login | Desain baru: panel merek navy, logo, 3 keunggulan, tampil/sembunyikan password, email tidak hilang saat gagal. |

## Perlu tindakan Anda
- **Tes dan seed** (`tests/`, `scripts/seed-demo.mjs`) tidak saya lihat. Yang masih memakai admin untuk
  menginput/memutuskan pelanggaran, atau membaca `alamat`/`no_hp_orang_tua` dari tabel `siswa`, akan gagal. Sesuaikan.
- **Ikon PWA** (`public/icons/*`) hanya placeholder huruf "T". Ganti dengan logo sekolah.
- **Logo login** memakai `/brand/logo-al-azhar.png` milik Anda. Pastikan terbaca di latar navy.
- Kolom baru pada tabel `siswa` harus diberi `GRANT SELECT (kolom)` secara eksplisit.

## Belum diubah (butuh keputusan klien)
1. **Poin per tahun ajaran atau kumulatif?** Saat ini poin dan ambang 50/75 dihitung per tahun ajaran
   (reset tiap tahun). Wawancara tidak menyebutnya.
2. **Peran kepala sekolah.** Tidak ada di alur wawancara; saat ini baca-saja (audit, dokumen, bukti).
3. **Jenis surat.** Aplikasi memakai "peringatan"; flowchart awal "perjanjian".
4. **Kop surat dan teks Arab di PDF.** PDF belum memuat kop/logo; font standar membuang aksara non-Latin.
