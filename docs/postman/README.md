# Dokumentasi API Manava — Postman Collection

Dokumentasi lengkap 99 endpoint Manava API dalam format Postman Collection v2.1, dikelompokkan ke 15 folder sesuai modul backend (`manava-api/src/modules/`).

## Berkas

| Berkas | Isi |
|---|---|
| `Manava-API.postman_collection.json` | Koleksi utama — 15 folder, 99 request, deskripsi lengkap per endpoint (role, field body, aturan validasi, kode status) |
| `Manava-Local.postman_environment.json` | Environment lokal — `base_url = http://localhost:4000/api/v1` |
| `Manava-Production.postman_environment.json` | Environment produksi — `base_url = https://api.manava.andikastudio.online/api/v1` |

## Cara Impor

1. Buka Postman → **Import** → seret ketiga file JSON di folder ini.
2. Pilih environment **Manava Local** atau **Manava Production** di pojok kanan atas.
3. Jalankan **01 · Auth → Login** dengan kredensial valid — script test otomatis menyimpan `access_token` dan `refresh_token` ke collection variables.
4. Semua request non-publik langsung terautentikasi lewat collection-level Bearer auth (`{{access_token}}`).

## Alur Autentikasi

- Access token berumur pendek (±15 menit). Bila mulai mendapat `401`, jalankan **Auth → Refresh Token** (token baru tersimpan otomatis; refresh token dirotasi).
- **Logout** mencabut refresh token yang dikirim.

## Struktur Folder

| Folder | Modul | Catatan |
|---|---|---|
| 00 · Health | health check | Publik |
| 01 · Auth | login, refresh, logout, ganti password, me | Login & refresh menyimpan token otomatis |
| 02 · Users | manajemen akun | HR/Superadmin |
| 03 · Editors | data staf + penilaian manager | Gaji diredaksi per role |
| 04 · Departments | departemen + anggota | |
| 05 · Warnings | peringatan kerja (SP) | |
| 06 · Leave Requests | cuti & izin | Persetujuan satu tingkat ke atas |
| 07 · Attendance | presensi berbasis kode sesi | |
| 08 · Job Postings | lowongan kerja | Endpoint baca publik |
| 09 · Applications | rekrutmen + AI screening CV | Submit lamaran publik (rate-limited) |
| 10 · KPI | snapshot KPI, tren, insight AI | |
| 11 · Payroll | slip gaji, PPh21/BPJS, batch bank | |
| 12 · Reports | laporan MIS bulanan | |
| 13 · Reimbursements | klaim reimbursement | |
| 14 · Projects | Sales-of-Services | Alur klien-editor: booking → brief → deliverable → revisi AI → ulasan |

## Variabel Path

Request dengan parameter path memakai collection variables (`{{editor_id}}`, `{{payslip_id}}`, dll.) — isi nilainya di tab **Variables** koleksi, atau ganti langsung di URL request.

## Regenerasi

Koleksi ini dihasilkan dari pembacaan langsung `manava-api/src/modules/*/routes.ts`. Bila ada endpoint baru/berubah, perbarui file JSON ini agar tetap sinkron dengan kode.
