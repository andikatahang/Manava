# manava-api

Backend Manava ERP — **Express + TypeScript + Prisma + PostgreSQL**, berjalan sebagai salah satu dari 3 container Docker (single responsibility per container):

| Container | Peran | Port |
|---|---|---|
| `manava-postgres` | PostgreSQL 16 (volume `manava_postgres_data`) | 5432 |
| `manava-api` | REST API ini | 4000 |
| `manava-frontend` | Build Vite disajikan Nginx | 5173 |

## Menjalankan (Docker)

```bash
# 1. Dari root repo — siapkan env (sekali saja)
cp .env.example .env        # lalu isi JWT_ACCESS_SECRET & JWT_REFRESH_SECRET acak

# 2. Boot semua container
docker compose up -d --build

# 3. Seed data awal (dari host; butuh node_modules manava-api)
cd manava-api && npm install
DATABASE_URL="postgresql://manava:manava_dev_change_me@localhost:5432/manava?schema=public" \
  npx prisma db seed
```

Migrasi dijalankan otomatis oleh container api saat start (`prisma migrate deploy`).

Buka `http://localhost:5173` dan login dengan akun seed (semua memakai password dari `SEED_PASSWORD` di `.env`):

| Role | Email |
|---|---|
| Superadmin | admin@manava.id |
| HR Admin | hasna@manava.id |
| Admin Manager | eko@manava.id |
| Editor | budi@manava.id |
| Klien | citra@client.com |
| Mediator | dewi@manava.id |
| Keuangan | fani@manava.id |

## Pengembangan tanpa Docker

```bash
docker compose up -d postgres     # cukup database-nya
cd manava-api
npm install
cp ../.env.example .env           # ganti host `postgres` → `localhost` pada DATABASE_URL
npx prisma migrate dev
npx prisma db seed
npm run dev                       # tsx watch, port 4000
```

## Endpoint

Semua berprefiks `/api/v1`, respons berformat `{ success, data, error, meta? }`.
Autentikasi memakai `Authorization: Bearer <accessToken>` (TTL 15 menit); refresh
token tersimpan di cookie httpOnly `manava_refresh` (rotasi tiap pemakaian).

| Method | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/health` | publik | Healthcheck Docker |
| POST | `/auth/login` | publik | `{email, password}` → user + accessToken + set cookie |
| POST | `/auth/refresh` | cookie | Rotasi refresh token, accessToken baru |
| POST | `/auth/logout` | cookie | Revoke refresh token |
| GET | `/auth/me` | bearer | User aktif |
| GET | `/users` | hr_admin, superadmin | Daftar user |
| GET | `/editors` | bearer | Daftar editor |
| GET | `/editors/:id` | bearer | Detail + metrics |
| GET | `/departments` | bearer | Termasuk manajer + anggota |
| POST | `/departments` | hr_admin, superadmin | `{name, manager_id}` |
| PATCH | `/departments/:id` | hr_admin, superadmin | Ubah nama / manajer |
| DELETE | `/departments/:id` | hr_admin, superadmin | Hapus departemen |
| POST | `/departments/:id/members` | hr_admin, superadmin | `{editor_ids: []}` |
| DELETE | `/departments/:id/members/:editorId` | hr_admin, superadmin | Keluarkan anggota |
| GET | `/warnings` | bearer | Daftar peringatan kerja |
| POST | `/warnings` | hr_admin, superadmin | `{target_name, target_role, reason, severity}` — expiry otomatis (ringan 2 bln, sedang 3, berat 6) |
| PATCH | `/warnings/:id` | hr_admin, superadmin | `{status}` aktif/diakui/kedaluwarsa |
| GET | `/leave-requests` | bearer | Daftar permohonan cuti |
| POST | `/leave-requests` | bearer | Ajukan cuti/izin |
| PATCH | `/leave-requests/:id/approve` | sesuai hierarki | editor→admin_manager, admin_manager→hr_admin |
| PATCH | `/leave-requests/:id/reject` | sesuai hierarki | idem |
| GET | `/projects` | bearer | Read-only (iterasi ini) |
| GET | `/projects/:id` | bearer | Termasuk envelope, kontrak, revisi, escrow |

## Struktur

```
manava-api/
├── prisma/
│   ├── schema.prisma      # 22 entity + Warning + RefreshToken (enum lengkap)
│   ├── migrations/        # dikelola prisma migrate
│   └── seed.ts            # fixture = mock frontend, password dari SEED_PASSWORD
├── src/
│   ├── index.ts           # bootstrap Express + registrasi router
│   ├── config/env.ts      # validasi env (zod) — fail fast
│   ├── lib/               # prisma singleton, jwt, password, response envelope
│   ├── middleware/        # authenticate, requireRole, validate, errorHandler
│   └── modules/           # auth, users, editors, departments, warnings,
│                          #   leaveRequests, projects
└── Dockerfile             # multi-stage; migrate deploy saat start
```

## Catatan iterasi berikutnya

- Endpoint payroll, escrow, disputes, attendance, offboarding, KPI aggregation.
- Halaman frontend selain Login / Dashboard Departemen / Peringatan masih memakai
  mock data (`manava-app/src/data/mockData.ts`).
- Seed entitas proyek/keuangan menyusul bersama endpoint-nya.
