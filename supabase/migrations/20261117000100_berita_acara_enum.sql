-- 004 Alur klien: jenis surat "berita acara".
-- ADD VALUE dipisah dari migration lain karena nilai enum baru tidak dapat
-- dipakai dalam transaksi yang sama.
alter type public.jenis_surat add value if not exists 'berita_acara';
