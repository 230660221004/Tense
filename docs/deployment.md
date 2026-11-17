# Deployment

## Status (17 Nov 2026)

- Supabase cloud: project `arsip-poin-pelanggaran` (ref `kmjqbkttfohnuvxqlqcn`, ap-southeast-1). 5 migration diterapkan via `supabase db push`.
- Auth cloud: `enable_signup = false`, `site_url` = URL Vercel (dipush dengan config minimal; properti lain tidak diubah).
- Vercel: project `sistem-arsip-poin-pelanggaran`, production https://sistem-arsip-poin-pelanggaran.vercel.app. Env diset untuk production & preview.
- Database cloud **belum berisi akun** — buat admin pertama (lihat bawah) atau jalankan seed demo.

## Variabel environment (nama saja)

| Nama | Scope | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | publik | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publik | anon/publishable key (aman, dijaga RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-only** | hanya untuk pembuatan akun oleh admin & seed demo. Jangan beri prefix `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_APP_URL` | publik | URL aplikasi |

## Supabase (cloud)

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push          # menerapkan supabase/migrations secara berurutan
```

Lalu di Dashboard → Authentication:
- **Sign ups: nonaktifkan** (akun dibuat admin).
- Site URL & Redirect URLs: URL Vercel.

Akun admin pertama (tanpa seed demo): buat user di Dashboard → Authentication → Add user, lalu jalankan di SQL editor:
```sql
update public.profiles set role = 'admin', nama_lengkap = 'Nama Admin' where id = '<USER_ID>';
```

Seed **demo** (opsional, hanya database kosong, data ditandai DEMO):
```bash
DEMO_PASSWORD='<password-kuat>' node --env-file=.env.production.local scripts/seed-demo.mjs --confirm-demo
```

## Vercel

```bash
npx vercel link
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production   # pilih "Sensitive"
npx vercel env add NEXT_PUBLIC_APP_URL production
npx vercel deploy            # preview
npx vercel deploy --prod     # production
```

Verifikasi:
```bash
BASE_URL=https://<deployment> node --env-file=.env.production.local scripts/smoke.mjs
```

## Lokal

Lihat README.
