# Iron Log — Tracker Latihan Gym

App tracking latihan gym (set, reps, beban) dengan data yang sync otomatis antara HP dan laptop lewat Supabase. Login pakai email (tanpa password, pakai magic link).

## 1. Setup Supabase (sekali aja)

1. Buka https://supabase.com → daftar/login (gratis).
2. Klik **New Project**. Isi nama project (misal `iron-log`), pilih password database (simpan, tapi gak akan dipakai langsung di app ini), pilih region terdekat (Singapore kalau dari Indonesia).
3. Tunggu project selesai dibuat (~1-2 menit).
4. Di sidebar, klik **SQL Editor** → **New query**.
5. Buka file `supabase_schema.sql` di folder ini, copy semua isinya, paste ke SQL Editor, klik **Run**.
   - Ini bikin 3 tabel (`sessions`, `exercises`, `sets`) + aturan keamanan biar tiap user cuma bisa lihat data sendiri.
6. Di sidebar, klik **Authentication** → **Providers** → pastikan **Email** aktif (biasanya udah default aktif).
   - Opsional: di **Authentication** → **Settings**, kamu bisa matikan "Confirm email" kalau mau login lebih instan, tapi default (pakai magic link) udah aman dan gampang.
7. Di sidebar, klik **Project Settings** (ikon gear) → **API**.
   - Copy **Project URL** dan **anon public** key.

## 2. Konfigurasi App

1. Di folder project ini, copy file `.env.example` jadi `.env`:
   ```
   cp .env.example .env
   ```
2. Buka `.env`, isi dengan nilai dari Supabase tadi:
   ```
   VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJxxxxxxxxxxxxxxxxxxxxxxx
   ```

## 3. Jalanin di Komputer (buat coba-coba)

```bash
npm install
npm run dev
```

Buka link yang muncul (biasanya `http://localhost:5173`) di browser.

## 4. Deploy biar Bisa Diakses dari HP & Laptop

Paling gampang pakai **Vercel** (gratis):

1. Push folder ini ke GitHub (bikin repo baru, push semua file kecuali yang di `.gitignore`).
2. Buka https://vercel.com → login pakai GitHub → **Add New Project** → pilih repo ini.
3. Di bagian **Environment Variables**, tambahkan:
   - `VITE_SUPABASE_URL` = (URL Supabase kamu)
   - `VITE_SUPABASE_ANON_KEY` = (anon key Supabase kamu)
4. Klik **Deploy**. Tunggu ~1 menit, jadi link kayak `iron-log-xxx.vercel.app`.
5. Buka link itu di HP dan laptop, login pakai email yang sama di kedua device → data otomatis sync karena sama-sama ambil dari Supabase.

Alternatif lain: Netlify (caranya mirip, env variable juga perlu diisi di dashboard Netlify).

## 5. Cara Pakai

1. Buka app, masukin email, klik **Kirim Link Login**.
2. Cek inbox email, klik link yang dikirim → otomatis masuk ke app.
3. Tab **Log**: tambah exercise, isi set/reps/berat, simpan sesi.
4. Tab **Riwayat**: lihat semua sesi yang udah dicatat.
5. Tab **Progress**: lihat grafik perkembangan beban/volume per exercise.

Login di HP dan laptop pakai email yang sama → semua data otomatis muncul di kedua device karena tersimpan di Supabase (cloud), bukan di device.

## Struktur Project

```
iron-log/
├── src/
│   ├── main.jsx           entry point
│   ├── App.jsx             cek status login, render Auth atau Tracker
│   ├── Auth.jsx             halaman login (magic link)
│   ├── WorkoutTracker.jsx   komponen utama (Log/Riwayat/Progress)
│   ├── supabaseClient.js    koneksi ke Supabase
│   └── styles.css           semua styling
├── supabase_schema.sql      SQL buat setup database
├── .env.example              contoh file environment variable
└── package.json
```

## Catatan

- Gratis tier Supabase cukup banget buat pemakaian personal (500MB database, 50K monthly active users).
- Kalau lupa isi `.env`, app akan jalan tapi gak bisa login/connect ke database — pastikan file `.env` udah benar sebelum `npm run dev`.
- Data sepenuhnya milik kamu, tersimpan di project Supabase kamu sendiri — bukan di server Anthropic/Claude.
