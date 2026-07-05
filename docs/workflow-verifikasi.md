# Workflow & Verifikasi Modul — Manava

> Dokumen ini dibuat **berdasarkan kode aktual** (`manava-api` + `manava-app`) per 5 Juli 2026,
> bukan berdasarkan PRD. Tujuannya: memverifikasi apakah setiap modul berjalan sesuai keinginan.
> Setiap modul diberi status implementasi, alur langkah-demi-langkah, dan checklist verifikasi
> yang bisa dicentang saat pengujian manual.
>
> Legenda status:
> - ✅ **DB-backed** — alur lengkap tersambung ke API + Postgres
> - ⚠️ **Parsial** — sebagian nyata, sebagian masih mock/hard-code
> - ❌ **Mock/Demo** — hanya tampilan; data dari `mockData.ts`, tidak tersimpan

---

## 1. Analisis User Role

### 1.1 Role aktif

Sistem mengenal 7 role (`UserRole`), tetapi hanya 4 yang aktif: `superadmin`, `hr_admin`,
`admin_manager`, `editor`. Role `client`, `mediator`, `finance` dinonaktifkan di gerbang auth
(akun seed nonaktif; `login()` menolak user dengan `is_active = false`). Halaman-halaman lama
role tersebut (finance, disputes, browse-editors, dll.) masih ada di kode tetapi bukan fitur aktif.

### 1.2 HR Admin

| Aspek | Isi |
|---|---|
| Navigasi sidebar | Home · Rekrutmen & ATS · Dashboard Departemen (sub: Departemen, Presensi, Peringatan, Offboarding) · Layanan Mandiri |
| Rute diizinkan (`ALLOWED_PATHS`) | `/dashboard /recruitment /attendance /departments /payments /bonus-accrual /payroll-disbursement /performance /warning /escalation /offboarding /ess /settings /profile` |
| Hak API utama | Lihat semua user (`GET /users`); kelola pipeline rekrutmen; CRUD departemen; terbitkan & ubah status peringatan; buka sesi presensi + atur jadwal + tinjau clock-out; lihat presensi semua user; setujui/tolak cuti **level Admin Manajer** |

Peran bisnis: menjalankan rekrutmen sampai akun editor terbit, mengelola struktur departemen,
mengoperasikan presensi harian (buka kode masuk/keluar), memutus tinjauan presensi, dan menjadi
atasan langsung para Admin Manajer (persetujuan cuti mereka).

### 1.3 Admin Manajer

| Aspek | Isi |
|---|---|
| Navigasi sidebar | Home · Dashboard Departemen (sub: Anggota, Presensi, KPI Tim, Proyek Tim) · Layanan Mandiri |
| Rute diizinkan | `/dashboard /team-dashboard /attendance /departments /performance /projects /ess /warning /settings /profile` |
| Hak API utama | Clock-in/out dengan kode; lihat presensi editor departemennya (`GET /attendance/team`); setujui/tolak cuti **level Editor**; ajukan cuti sendiri (naik ke HR Admin); lihat peringatan yang dialamatkan ke dirinya |

Peran bisnis: atasan langsung editor — memantau kehadiran anggota departemennya dan memutuskan
permohonan cuti mereka, sambil tetap menjadi "karyawan" yang presensi dan bercuti (disetujui HR).

### 1.4 Editor

| Aspek | Isi |
|---|---|
| Navigasi sidebar | Home · Proyek Saya · Layanan Mandiri |
| Rute diizinkan | `/dashboard /projects /chat /ess /attendance /warning /settings /profile` |
| Hak API utama | Clock-in/out dengan kode; lihat riwayat presensi milik sendiri; ajukan cuti (naik ke Admin Manajer); kirim penjelasan lupa clock-out; akui (acknowledge) peringatan miliknya |

Peran bisnis: pelaksana — presensi harian, pengajuan cuti, mengerjakan proyek, dan menerima
umpan balik (peringatan/KPI).

### 1.5 Matriks hierarki (pola "satu level ke atas / ke bawah")

| Aksi | Editor | Admin Manajer | HR Admin |
|---|---|---|---|
| Mengajukan cuti | ✔ → disetujui AM | ✔ → disetujui HR | ✖ |
| Menyetujui cuti | ✖ | Cuti editor | Cuti admin manajer |
| Melihat presensi tim | ✖ (hanya sendiri) | Editor departemennya | Admin Manajer (di dashboard dept.) + semua user (di halaman /attendance) |
| Menerima peringatan | ✔ | ✔ | ✖ (hanya menerbitkan) |
| Buka sesi presensi | ✖ | ✖ | ✔ |

---

## 2. Workflow per Modul

### 2.1 Autentikasi & Sesi — ✅ DB-backed

**File:** `manava-api/src/modules/auth/*`, `manava-app/src/App.tsx`

**Alur login (semua role aktif):**
1. User membuka `/login`, mengisi **email atau username** + password.
2. `POST /api/v1/auth/login` — cek user & `is_active`, verifikasi hash → access token (JWT) + refresh token (dirotasi & di-hash di DB).
3. Frontend menyimpan token; setiap request pakai header Bearer; `POST /auth/refresh` merotasi token.
4. `RoleGuard` di App.tsx membatasi rute per role (`ALLOWED_PATHS`); rute di luar daftar dialihkan ke `/dashboard`.
5. Logout → `POST /auth/logout` mencabut refresh token.

**Checklist verifikasi:**
- [ ] Login dengan email dan dengan username sama-sama berhasil
- [ ] Login akun nonaktif (client/mediator/finance seed) ditolak "Invalid credentials"
- [ ] Editor membuka URL `/recruitment` langsung dialihkan ke `/dashboard`
- [ ] Token kedaluwarsa → refresh otomatis tanpa logout paksa

> ⚠️ Catatan: `POST /auth/register` (form publik) selalu membuat akun **role client** yang
> `is_active = true` — padahal role client dinonaktifkan. Akun hasil registrasi bisa login tetapi
> masuk ke fitur klien yang statusnya demo. Putuskan: tutup registrasi, atau biarkan untuk demo.

### 2.2 Rekrutmen & ATS — ✅ DB-backed

**File:** `manava-api/src/modules/applications/*`, halaman `/apply` (publik), `/recruitment`, `/recruitment/:id` (HR)

**Alur (status: `new → interview → approved/rejected`):**
1. **Pelamar (publik, tanpa login)** mengisi form `/apply`: data diri, pendidikan, skill, upload CV (PDF/DOC ≤ ~5MB, disimpan sebagai data-URL) → `POST /applications`. Satu lamaran aktif per email (409 jika masih diproses).
2. Sistem membuat **ringkasan AI (mock)** dari data pelamar.
3. **HR Admin** membuka `/recruitment` → daftar pelamar; klik baris → halaman detail `/recruitment/:id` dengan preview CV (`GET /applications/:id/cv`).
4. **Shortlist:** HR isi form pewawancara + mode (online/offline, alamat wajib jika offline) → `PATCH /:id/shortlist` — status jadi `interview`, **email undangan interview (mock)** dirender & disimpan.
5. **Approve** (hanya dari status interview) → `PATCH /:id/approve` — otomatis **membuat akun User (role editor) + baris Editor**; kredensial dikembalikan ke HR.
6. **Reject** boleh dari `new` (screening) atau `interview` → status `rejected`, pelamar boleh melamar ulang.

**Checklist verifikasi:**
- [ ] Form publik menolak CV selain PDF/DOC & email yang masih punya lamaran aktif
- [ ] Shortlist dari status selain `new` ditolak (409); approve dari selain `interview` ditolak
- [ ] Approve menghasilkan akun editor yang bisa login dan muncul di direktori editor
- [ ] Preview CV tampil di halaman detail HR

### 2.3 Manajemen Departemen — ⚠️ Parsial

**File:** `manava-api/src/modules/departments/*`, `DepartmentsPage.tsx`, `ManagerDepartmentView.tsx`

**Alur HR Admin (✅ DB):**
1. Buka `Dashboard Departemen → tab Departemen` → tabel departemen (nama, manajer, KPI rata-rata, jumlah anggota) dari `GET /departments`.
2. **Tambah Departemen** → isi nama + pilih manajer → `POST /departments` → langsung masuk halaman kelola sebagai *draft* (wajib ≥ 1 editor sebelum disimpan; batal = departemen dihapus).
3. Di halaman kelola: **Tambah/Keluarkan editor** (`POST /:id/members`, `DELETE /:id/members/:editorId`), edit nama/manajer, terbitkan Peringatan Kerja per editor, lihat detail editor.

**Alur Admin Manajer (❌ masih mock):** tab **Anggota** (`ManagerDepartmentView`) menampilkan
editor + presensi + KPI + proyek, tetapi datanya dari `mockDepartments`/`mockEditors` dan identitas
manajer di-hard-code ke `mockUsers.admin_manager` — bukan dari user yang login.

**Checklist verifikasi:**
- [ ] CRUD departemen HR tersimpan di DB (refresh halaman → data tetap)
- [ ] Departemen draft yang dibatalkan benar-benar terhapus
- [ ] KPI rata-rata & lookup manajer masih memakai tabel fixture (`mockAdminManagers`, `mockEditorMetrics`) — cocokkan dengan seed
- [ ] **GAP:** tab Anggota milik Admin Manajer belum membaca departemen asli dari API

### 2.4 Presensi — ✅ DB-backed

**File:** `manava-api/src/modules/attendance/*`, `AttendanceTab.tsx`, `TeamPresensiTab.tsx`, `QuickAttendance.tsx` (Home)

**Konsep:** presensi berbasis **sesi yang dibuka HR** (bukan jam otomatis). HR membuka sesi
`masuk`/`keluar` dengan durasi; sistem membuat **kode** yang dikirim ke semua Admin Manajer &
Editor lewat notifikasi lonceng. Clock-in/out **wajib** memakai kode selama sesi aktif.
Jam server yang dicatat (client tidak pernah mengirim timestamp). Original immutable —
perbaikan HR masuk kolom `adjusted_*`.

**Alur harian:**
1. **HR Admin** — `Dashboard Departemen → Presensi` → tombol **Buka Presensi** → pilih jenis (masuk/keluar) + durasi (5–720 menit) → `POST /attendance/sessions`. Panel navy menampilkan kode aktif + masa berlaku. Membuka ulang jenis yang sama mengganti kode lama.
2. **Editor / Admin Manajer** — menerima notifikasi kode di Header → di **Home (kartu presensi)** ketik kode → **Masuk** (`POST /attendance/clock-in`). Masuk setelah `clock_in_time` (default diatur HR di **Atur Jadwal**) tercatat **Terlambat**. Rate-limit percobaan kode salah (429).
3. Sore: HR membuka sesi **keluar** → user ketik kode → **Keluar** (`POST /attendance/clock-out`).
4. **Lupa clock-out** — penutupan hari berjalan *lazy* saat ada pembacaan data: record terbuka dari hari sebelumnya menjadi `incomplete` + review `pending`.
5. **Pemilik record** melihat banner "Anda lupa clock-out" → **Kirim penjelasan** + usulan jam pulang (`PATCH /:id/explanation`).
6. **HR** membuka antrean **Perlu Tinjauan** → drawer per kasus → **Setujui** (isi jam pulang, dibatasi maksimal jam pulang terjadwal — tidak melahirkan lembur; `PATCH /:id/approve`) atau **Tolak** (dihitung **absen**; `PATCH /:id/reject`). Catatan keputusan wajib.

**Tabel presensi departemen (fitur gabungan, Juli 2026):**
- Tab **Presensi** di dashboard departemen kini satu tabel `TeamPresensiTab` (`GET /attendance/team`):
  anggota **satu level di bawah** viewer (AM → editor departemennya; HR → semua Admin Manajer)
  dengan jam masuk/keluar/status hari ini + tombol **Setujui/Tolak** cuti inline; klik baris →
  drawer riwayat bulan berjalan. HR tetap punya tombol Buka Presensi/Atur Jadwal + antrean tinjauan di tab ini.
- Halaman `/attendance` (berdiri sendiri, **tidak ada di sidebar** — hanya via URL) masih berisi
  tampilan lama: kalender bulanan pribadi, tabel "Riwayat Presensi" semua user (HR), dan tab Permohonan Cuti.

**Checklist verifikasi:**
- [ ] Clock-in tanpa sesi aktif ditolak; kode salah ditolak; kode kedaluwarsa ditolak
- [ ] Clock-in kedua di hari yang sama ditolak (409); clock-out tanpa clock-in ditolak
- [ ] Masuk setelah jam masuk terjadwal → status Terlambat
- [ ] Lupa clock-out kemarin → muncul di antrean HR; setujui mengisi `adjusted_clock_out` (asli tetap kosong); tolak → status Absen
- [ ] Tabel tim AM hanya berisi editor departemennya; tabel tim HR hanya Admin Manajer
- [ ] Kode presensi muncul sebagai notifikasi di lonceng Header untuk AM & Editor

### 2.5 Permohonan Cuti — ⚠️ Parsial (approval ✅, jalur pengajuan ❌)

**File:** `manava-api/src/modules/leaveRequests/*`, `TeamPresensiTab.tsx`, `AttendancePage.tsx`, `Header.tsx`

**Alur (hierarki satu level ke atas):**
1. **Pengajuan** — `POST /leave-requests` (role editor/admin_manager saja): jenis (cuti/izin) + rentang tanggal. Identitas pengaju diambil dari JWT; `requester_role` menentukan siapa yang berhak memutus.
2. **Notifikasi** — pemberi persetujuan melihat badge "Permohonan cuti menunggu persetujuan" di lonceng Header.
3. **Keputusan** — Admin Manajer memutus cuti editor; HR memutus cuti Admin Manajer (`PATCH /:id/approve|reject`; role lain 403; sudah diputuskan → 409). UI: tombol Setujui/Tolak inline di tabel Presensi departemen.
4. **Efek** — cuti disetujui yang mencakup hari ini membuat status anggota "Cuti" di tabel presensi (tanpa record clock-in).

**❗ GAP jalur pengajuan (temuan penting):**
- Form **"Ajukan Cuti" di ESS adalah dummy** — tombol "Kirim Permohonan" hanya menutup modal, tidak memanggil API; daftar cuti di ESS dari `mockLeaveRequests`.
- Form pengajuan yang benar-benar tersambung DB ada di `AttendancePage` tab "Permohonan Cuti", tetapi setelah penggabungan tab, halaman itu **tidak lagi ter-link di navigasi manapun** (hanya bisa diakses via URL `/attendance`).
- Akibatnya: **Editor/Admin Manajer saat ini tidak punya jalur UI resmi untuk mengajukan cuti.** Perbaikan yang disarankan: sambungkan form ESS ke `useLeaveRequestMutations().submit`, atau tambahkan tombol "Ajukan Cuti" di Home/ESS yang memakai modal DB-backed yang sudah ada.

**Checklist verifikasi:**
- [ ] `POST /leave-requests` via UI — ❌ saat ini tidak bisa (lihat GAP); via URL `/attendance` → tab Permohonan Cuti masih berfungsi
- [ ] Cuti editor hanya bisa diputus AM (HR mencoba → 403); cuti AM hanya oleh HR
- [ ] Permohonan yang sudah diputus tidak bisa diputus ulang (409)
- [ ] Badge lonceng approver bertambah saat ada pengajuan pending

### 2.6 Peringatan Kerja — ✅ DB-backed

**File:** `manava-api/src/modules/warnings/*`, `WarningPage.tsx`, `EditorActionModals.tsx`, `Header.tsx`

**Alur:**
1. **HR Admin** menerbitkan peringatan dari `Dashboard Departemen → Peringatan` atau tombol "Peringatan Kerja" di halaman kelola departemen: pilih target (harus role editor/admin_manager), alasan, tingkat (`ringan`/`sedang`/`berat`) → `POST /warnings`. Masa berlaku otomatis: ringan 2 bln, sedang 3 bln, berat 6 bln.
2. **Target** melihat notifikasi di lonceng Header dan daftar peringatan miliknya (GET di-scope: non-HR hanya melihat peringatan ke dirinya).
3. **Target mengakui** peringatan aktif miliknya (`PATCH /:id` status `diakui`) — satu-satunya perubahan yang boleh dilakukan non-HR.
4. **HR** dapat mengubah status apa pun (aktif/diakui/kedaluwarsa).

**Checklist verifikasi:**
- [ ] Peringatan ke user role selain editor/AM ditolak (422)
- [ ] Editor A tidak bisa melihat peringatan Editor B
- [ ] Target hanya bisa `diakui` pada peringatan aktif miliknya; aksi lain 403
- [ ] Tanggal kedaluwarsa sesuai tingkat

### 2.7 Notifikasi Header (lonceng) — ✅ (turunan data DB)

**File:** `Header.tsx`

Notifikasi dirakit di client dari 4 sumber nyata: (1) sesi presensi aktif + kodenya,
(2) permohonan cuti pending untuk approver, (3) peringatan untuk target, (4) presensi
perlu tinjauan (HR). Status "dibaca" hanya di state lokal (hilang saat refresh) — by design demo.

**Checklist:** setiap sumber muncul untuk role yang tepat; klik menandai dibaca.

### 2.8 Pengguna & Role (superadmin) — ⚠️ Parsial

`GET /users` (hr_admin + superadmin) nyata; halaman `/users` hanya rute superadmin.
Statistik/aksi di `UsersPage` sebagian masih memakai mock; tidak ada endpoint create/suspend user
(pembuatan akun editor hanya lewat approve rekrutmen).

### 2.9 Direktori Editor & Proyek — ⚠️ Read-only

`GET /editors`, `GET /editors/:id` (dengan metrics), `GET /projects`, `GET /projects/:id`
(termasuk envelope/kontrak/revisi/escrow) tersedia dan DB-backed, **tetapi** halaman Proyek
(`ProjectsPage`, `ProjectDetailPage`) masih menggambar dari `mockProjects`. Tidak ada mutasi
proyek di API — siklus proyek/revisi/escrow dari PRD belum diimplementasikan.

### 2.10 Modul yang masih Mock/Demo — ❌

| Modul | Halaman | Catatan |
|---|---|---|
| ESS / Layanan Mandiri | `/ess` (tab Absensi, Cuti & Izin, Gaji) | Kalender absensi & slip gaji dari mock; form cuti dummy (lihat 2.5); identitas dari `mockUsers`, bukan JWT |
| KPI / Performance | `/performance`, tab "KPI Tim" | `mockEditorMetrics` + `mockKpiHistory`; sudut pandang editor di-hard-code `e1` |
| Offboarding | `/offboarding`, tab di dashboard HR | `mockCases` lokal, tidak tersimpan |
| Home / Dashboard role | `/dashboard` | Hero + statistik sebagian mock; kartu presensi (QuickAttendance) ✅ nyata |
| Finance (escrow, payroll, refund, dsb.), Disputes, Chat, Browse Editors, Contracts, Deliverables, Audit | berbagai | Peninggalan role nonaktif / belum ada API |

---

## 3. Ringkasan Temuan untuk Ditindaklanjuti

Prioritas diurutkan dari yang paling mengganggu alur nyata:

1. **[Tinggi] Pengajuan cuti tidak punya jalur UI** — form ESS dummy; form DB-backed hanya via URL `/attendance`. Sambungkan ESS ke API cuti (mutasi `submit` sudah tersedia di `useLeaveRequestMutations`).
2. **[Tinggi] Tab "Anggota" Admin Manajer masih mock** — `ManagerDepartmentView` memakai `mockDepartments` + identitas hard-code; harus membaca `GET /departments` + user login (pola resolusi manajer→departemen sudah ada di `GET /attendance/team`).
3. **[Sedang] ESS Absensi/Gaji tidak sinkron** dengan presensi DB — data kalender ESS berbeda dari data presensi sebenarnya; membingungkan saat verifikasi.
4. **[Sedang] Registrasi publik membuat akun `client` aktif** padahal role client dinonaktifkan.
5. **[Rendah] Halaman `/attendance` yatim** (ada di `ALLOWED_PATHS`, tidak ada di sidebar) — putuskan: jadikan halaman "Presensi Saya" yang ter-link, atau hapus dari `ALLOWED_PATHS`.
6. **[Rendah] `GET /leave-requests` mengembalikan semua data ke semua user terautentikasi** — UI memfilter, tapi API tidak; scoping server-side lebih aman.
7. **[Rendah] KPI, Offboarding, Proyek** masih mock — tandai sebagai "belum diimplementasikan" saat demo, atau lanjutkan implementasi DB.

---

## 4. Skenario Uji End-to-End yang Disarankan (happy path)

Urutan satu hari kerja yang memverifikasi integrasi antar modul sekaligus:

1. HR login → Rekrutmen: shortlist 1 pelamar baru → approve → catat kredensial editor baru.
2. Editor baru login → muncul di Home dengan kartu presensi "menunggu presensi dibuka".
3. HR: tambah editor baru ke sebuah departemen (tab Departemen → Kelola).
4. HR: Buka Presensi (masuk, 30 menit) → Editor & AM menerima kode via lonceng → keduanya clock-in (satu sengaja setelah jam masuk → Terlambat).
5. Editor ajukan cuti (via `/attendance` tab Permohonan Cuti — sampai GAP #1 diperbaiki) → AM melihat badge → buka Dashboard Departemen → Presensi → Setujui inline.
6. AM ajukan cuti sendiri → HR menyetujui dari tabel Presensi Admin Manajer.
7. HR buka sesi keluar → AM clock-out; Editor sengaja tidak clock-out.
8. Besoknya (atau ubah tanggal record): Editor kirim penjelasan → HR Setujui dari antrean → cek riwayat: jam pulang bertanda `*` (diisi HR), status tetap sesuai clock-in.
9. HR terbitkan peringatan `ringan` ke editor → editor melihat notifikasi & mengakuinya.
10. Cek tabel tim: status hari ini, drawer riwayat bulan, dan hitungan Hadir/Terlambat/Absen konsisten dengan langkah 4–8.
