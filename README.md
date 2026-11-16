# LMA Private Class

Dashboard manajemen bisnis les privat dengan GitHub Pages dan Supabase.

## Konfigurasi Supabase
1. Buka `assets/js/supabase-config.js`.
2. Ganti `TEMPEL_PUBLISHABLE_KEY_DI_SINI` dengan Supabase Publishable Key dari project Singapore.
3. Project URL sudah diisi berdasarkan project `lma-private-class1`.
4. Jangan pernah memasukkan Secret Key / service_role key ke frontend.

## Deploy GitHub Pages
Upload isi folder ini ke branch `main` pada repository dan aktifkan Pages dari `/(root)`.

## Login
Gunakan akun administrator yang dibuat di Supabase Authentication. Profil harus memiliki `role = admin` dan `is_active = true`.

## Dashboard tahap awal
Login administrator, total siswa aktif, tutor aktif, jadwal hari ini, dan total pembayaran bulan berjalan dibaca dari Supabase. Modul CRUD akan dikembangkan bertahap.
