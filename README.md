# Aset & Keuangan Keluarga

Aplikasi pendataan aset dan keuangan pribadi/keluarga. Multi-user per keluarga
(household), dengan pencatatan aset, pemasukan/pengeluaran, dan laporan grafik.

**Stack:** Next.js 14 (App Router) + TypeScript + Tailwind · Supabase (Auth + Postgres + RLS) · Vercel · Git

---

## 1. Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka **SQL Editor** → jalankan seluruh isi file `supabase/schema.sql`.
   Ini membuat tabel `households`, `profiles`, `assets`, `transactions`,
   kategori, dan seluruh **Row Level Security (RLS) policy** agar setiap
   keluarga hanya bisa melihat datanya sendiri.
3. Buka **Authentication → Providers** → pastikan **Email** aktif.
4. (Opsional untuk pengembangan) Di **Authentication → Settings**, matikan
   "Confirm email" agar bisa langsung login setelah daftar tanpa cek email.
   Untuk produksi, sebaiknya nyalakan kembali dan sesuaikan alur konfirmasi.
5. Ambil **Project URL** dan **anon public key** dari **Settings → API**.

## 2. Setup environment lokal

```bash
cp .env.example .env.local
# isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY

npm install
npm run dev
```

Buka http://localhost:3000

## 3. Alur pemakaian

- **Daftar**: user pertama di keluarga memilih "Buat keluarga baru" → otomatis
  jadi `owner` dan mendapat **kode undangan** (terlihat di sidebar setelah login).
- Anggota keluarga lain memilih "Gabung keluarga" dan memasukkan kode
  undangan tersebut saat daftar.
- Setelah masuk: catat **Aset** (properti, kendaraan, tabungan, investasi),
  catat **Transaksi** (pemasukan/pengeluaran harian), dan lihat **Laporan**
  (grafik bulanan serta komposisi per kategori).

## 4. Push ke Git

```bash
git init
git add .
git commit -m "Inisialisasi aplikasi aset & keuangan keluarga"
git branch -M main
git remote add origin <URL_REPO_ANDA>
git push -u origin main
```

## 5. Deploy ke Vercel

1. Buka [vercel.com](https://vercel.com) → **Add New Project** → pilih repo Git di atas.
2. Di step **Environment Variables**, tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Klik **Deploy**. Vercel otomatis build & jalankan `next build`.
4. Setiap `git push` ke branch `main` berikutnya akan otomatis re-deploy.

## Struktur proyek

```
app/
  (auth)/login, (auth)/register   -> halaman masuk & daftar
  dashboard/                      -> ringkasan aset & arus kas bulan berjalan
  assets/                         -> CRUD aset (server actions)
  transactions/                   -> CRUD transaksi (server actions)
  reports/                        -> grafik (recharts)
components/
  AppShell.tsx                    -> sidebar navigasi + info keluarga
  SignOutButton.tsx
lib/supabase/
  client.ts                       -> Supabase client untuk Client Component
  server.ts                       -> Supabase client untuk Server Component/Action
middleware.ts                     -> proteksi route & refresh session
supabase/schema.sql               -> skema tabel + RLS policies
```

## Pengembangan lanjutan (ide)

- Upload bukti/foto aset & struk transaksi (Supabase Storage).
- Target anggaran bulanan per kategori + notifikasi jika terlampaui.
- Ekspor laporan ke PDF/Excel.
- Riwayat perubahan nilai aset dari waktu ke waktu (untuk grafik net worth).
- Undang anggota via email (Supabase Edge Function) alih-alih kode manual.
