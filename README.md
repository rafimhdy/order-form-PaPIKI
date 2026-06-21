# PaPIKI - Full-Stack Coffee Order System & API Documentation

Proyek ini adalah aplikasi _full-stack_ untuk pemesanan kopi yang terdiri dari UI (_frontend_) dan server (_backend_) berbasis Node.js/Express. Proyek ini dilengkapi dengan dokumentasi API menggunakan **OpenAPI Specification v3 (Swagger)**.

## Arsitektur Proyek

- **Frontend:** UI berbasis web untuk pelanggan melakukan pemesanan.
- **Backend:** Server Node.js + MongoDB yang mengelola produk, user (RBAC), kalkulasi stok otomatis, serta integrasi _real-time_ ke **Telegram Bot Notification**.
- **API Documentation:** Spesifikasi OpenAPI untuk pemetaan seluruh _endpoint_ server.

## Fitur Utama & Keamanan API

- **Authentication & Security:** Proteksi rute menggunakan JWT (Bearer Token) untuk memisahkan hak akses publik dan Admin Only.
- **Dynamic Order System:** Dokumentasi multi-skema (`oneOf`) pada API guna mendukung 3 mode pengiriman data dari frontend.
- **Data Validation:** Penanganan skema request/response terpisah (`UserRequest` vs `UserResponse`).

## Struktur Repositori

- `/frontend` : Kode program antarmuka pengguna.
- `/backend` : Kode program server, rute, dan logika.
- `swagger.yaml` : File utama spesifikasi OpenAPI (Swagger).
- `README.md` : Dokumentasi utama panduan proyek.

## Cara Menjalankan Dokumentasi

1. Pastikan telah menginstal ekstensi **OpenAPI Editor** atau **Swagger Viewer** di VS Code.
2. Buka file `swagger.yaml` di folder utama ini.
3. Klik ikon **Preview** (ikon mata) di pojok kanan atas editor.
4. Hubungkan ke server lokal (`http://localhost:4000/api`) untuk menguji dokumentasi secara interaktif menggunakan fitur _Try It Out_.
