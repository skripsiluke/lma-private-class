# LMA Private Class

Sistem manajemen bisnis les privat untuk layanan tatap muka di rumah dan pembelajaran online.

## Status
Tahap 1 — fondasi antarmuka dashboard (data masih berupa contoh/dummy).

## Menjalankan secara lokal
Buka `index.html` di browser. Untuk pengembangan lanjutan, disarankan memakai ekstensi Live Server di Visual Studio Code.

## Struktur
- `index.html` — dashboard awal
- `assets/css/style.css` — tampilan responsif
- `assets/js/app.js` — interaksi dasar
- `supabase/` — disiapkan untuk skema database dan kebijakan keamanan pada tahap integrasi

## Catatan keamanan
Jangan pernah menyimpan Supabase service role key, password, atau secret lain di frontend maupun repository. Integrasi database berikutnya akan menggunakan publishable/anon key dengan Row Level Security (RLS) yang benar.

## Tahap berikutnya
1. Membuat proyek Supabase.
2. Menyusun skema PostgreSQL dan RLS.
3. Mengaktifkan autentikasi dan peran pengguna.
4. Mengganti data contoh dengan data database.
