# Audit Referensi Desain

Referensi wajib: https://dribbble.com/shots/27820100-HR-Management-Dashboard-Modern-SaaS-UI-Design

## Status akses

| Upaya | Hasil |
|---|---|
| WebFetch halaman shot (16 Nov 2026) | HTTP 202, body kosong. |
| Screenshot dari pengguna | `GAMBAR DASHBOARD REFERENSI DRIBBBLE.webp` (2048×1536) di root workspace — **dipakai sebagai acuan**. File tidak di-commit (aset milik kreator). |

## Observasi konkret dari screenshot (skala frame ≈1,28× terhadap 1440 px)

| Elemen | Referensi | Implementasi |
|---|---|---|
| Kanvas | Konten putih, sidebar abu sangat terang, garis pemisah tipis | `--background #fff`, sidebar `--canvas-soft #F7F7F8`, `--border #E8E8EB` |
| Sidebar | ±264 px; label grup UPPERCASE abu; item 44 px, ikon outline; **aktif = kartu putih bergaris + bayangan halus, ikon terisi gelap**; tombol outline pill di bawah ("Upgrade to Pro") | sama; tombol pill → "Catat pelanggaran" (aksi utama nyata, hanya role pengusul) |
| Header | ±80 px, logo area dipisah garis bawah sejajar header; salam "Good Morning, …" + subjudul di kiri; lonceng dalam lingkaran bergaris + titik merah; pemisah vertikal; avatar + nama + jenis akun | salam berdasarkan jam Asia/Jakarta, pemilih TA (pill), lonceng, pemisah, avatar + nama + role |
| Baris 1 | Kartu "Total Balance" (≈1/3) angka sangat besar + delta hijau "compared to last month"; kartu "Currency" berisi 3 sub-kartu abu dengan ikon lingkaran | "Total poin bersih" + delta nyata bulan ini vs bulan lalu; "Ringkasan kedisiplinan" dengan 3 sub-kartu abu (disahkan, menunggu, tindak lanjut) |
| Baris 2 kiri | "Quick Actions" 5 tile (ikon lingkaran + label); "Recent Activity" dikelompokkan per tanggal, ikon lingkaran hijau/oranye lembut, nilai kanan berwarna + jam | "Aksi cepat" sesuai role; "Aktivitas terbaru" dari status log + remisi, dikelompokkan per tanggal; poin disahkan = oranye-terakota, remisi = hijau |
| Baris 2 kanan | "Convert": kotak nilai bergaris, baris rincian label–nilai, **tombol pill lime penuh**, grafik garis tipis lime dengan grid putus-putus, label sumbu kanan, titik akhir | "Status usulan": kotak nilai + bar status, rincian per status, tombol lime "Tinjau persetujuan", grafik garis "Tren poin disahkan" dengan gaya sama |
| Kartu | radius ±14 px, border 1 px, tanpa bayangan | `--radius-lg 14px`, `--shadow-card` none |
| Tipografi | sans geometris-netral, judul kartu medium (bukan bold), angka besar semibold rapat | Inter; judul 17 px/500; angka tracking negatif |
| Warna | netral + navy CTA (#123B67) + hijau positif + oranye negatif; ungu #512BFF dari palet PRD tidak tampak dominan | navy digunakan sebagai aksen utama dan CTA sesuai identitas Al Azhar; hijau dan terracotta tetap untuk status semantik |

Tidak disalin: logo (diburamkan di referensi), nama brand, foto avatar, data finansial, menu "Developer".
Bagian di bawah lipatan (poin tertinggi, distribusi pasal, per tingkat, tindak lanjut jatuh tempo) tidak ada di referensi tetapi diwajibkan PRD §4.2; dibuat dengan gaya kartu yang sama.

## Keputusan desain (milik produk ini, bukan salinan)

Dibangun dari prinsip PRD: minimalis, kontras tinggi, padat informasi, tanpa gradient/blob/glow.

| Token | Nilai | Catatan |
|---|---|---|
| `--background` | `#FFFFFF` | konten (sesuai screenshot); `#F7F7F8` untuk sidebar & sub-kartu |
| `--text-primary` | `#0C0B0B` | teks & permukaan gelap (item nav aktif, KPI utama, bar "disahkan") |
| `--text-secondary` | `#67676D` | **deviasi**: `#A4A4A4` hanya 2,5:1 di atas putih (gagal WCAG AA). `#A4A4A4` dipakai sebagai `--neutral-400` untuk ikon/placeholder/garis saja. |
| `--accent` | `#123B67` | aksen solid terukur: badge hitung, fokus ring, seri "dalam proses", progress ambang. Tanpa gradient. |
| `--success` | `#18804F` | nilai positif (remisi, selesai) — lebih cerah dari `#4D5D4A` mengikuti screenshot, tetap AA |
| `--danger` | `#C24A24` | penambahan poin, ditolak, lewat tenggat — oranye-terakota screenshot, AA |
| `--warning` | `#9A6A1C` | menunggu (turunan; tidak ada di palet referensi) |
| `--radius-sm/md/lg` | 8 / 12 / 14 px | |
| `--cta` | `#123B67` | tombol utama pill (teks gelap, kontras 14:1) |
| `--sidebar-width` | 264 px (76 px saat diciutkan) | |
| `--header-height` | 80 px | header sticky, blur tipis hanya untuk pemisahan saat scroll |

- Tipografi: Inter, angka `tabular-nums`.
- Ikon: Lucide, satu set konsisten. Tanpa emoji.
- Status tidak hanya dibedakan warna: badge memakai penanda bentuk berbeda (bulat penuh, belah ketupat, kotak, cincin) + label teks.
- Motion: page-enter 220 ms (opacity + translateY 6px), sidebar width 200 ms, drawer 220 ms, chart 500 ms sekali; semua dimatikan pada `prefers-reduced-motion`. Tanpa parallax.
- Responsif: ≥1024 px sidebar penuh/ciut; <1024 px drawer; tabel arsip berubah menjadi daftar kartu <768 px.

## Screenshot lokal

`docs/screenshots/` (dihasilkan `scripts/e2e-ui.mjs`): login, dashboard (desktop/tablet/mobile),
arsip (desktop/tablet/mobile), drawer mobile, profil siswa, master data, portal siswa mobile.
Perbandingan dilakukan terhadap screenshot referensi (dashboard desktop 1440 px). Perbedaan yang tersisa: konten dashboard lebih panjang karena KPI wajib PRD; tabel arsip/master tidak ada padanannya di referensi sehingga mengikuti bahasa visual kartu yang sama.
