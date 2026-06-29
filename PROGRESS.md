# PROGRESS — Migrasi Frontend ke PRD v2.3 RBAC

**Updated:** 2026-06-29
**Reference:** [prd.md](prd.md) v2.3.1

---

## Status Saat Ini

- PRD v2.3.1 selesai: tujuh role formal: `SUPERADMIN`, `HR_ADMIN`, `LINE_MANAGER`, `EDITOR`, `CLIENT`, `MEDIATOR`, `FINANCE` (terakhir ditambah di v2.3.1, lihat Section 11).
- Frontend [manava-app/](manava-app/) **masih di state pra-v2.3**: enum role lowercase (`'superadmin' | 'admin_manager' | ...`), access control hardcoded.
- Stack: **Vite + React Router 7** (flat routing + `RoleGuard` di [manava-app/src/App.tsx](manava-app/src/App.tsx)) — bukan Next.js App Router. Appendix F PRD dipakai sebagai panduan grouping logis, bukan path file harfiah.
- Mock data + `sessionStorage` ([manava-app/src/data/mockData.ts](manava-app/src/data/mockData.ts), [manava-app/src/hooks/useAuth.ts](manava-app/src/hooks/useAuth.ts)); tidak ada backend — migrasi cukup sentuh layer frontend.

## Mapping Perubahan Role

| Lama (lowercase) | Baru (SCREAMING_SNAKE) | UI Label | Catatan |
|---|---|---|---|
| `superadmin` | `SUPERADMIN` + `HR_ADMIN` | "System Administrator" / "HR Admin" | Dipecah: sistem ⇄ HR makro. ATS, onboarding, payroll pindah ke HR_ADMIN. |
| `admin_manager` | `LINE_MANAGER` | **"Admin Manager"** | Scope departemen; UI label dipertahankan agar mental model user tidak berubah. |
| `editor` | `EDITOR` | "Editor" | Kapitalisasi saja. |
| `client` | `CLIENT` | "Klien" | Kapitalisasi saja. |
| `mediator` | `MEDIATOR` | "Mediator" | Kapitalisasi saja. |
| `finance` | `FINANCE` | "Keuangan" | Dipertahankan; perlu diformalkan di PRD. |

## Next Steps (Prioritas Tinggi → Rendah)

1. ~~**Update PRD** — tambahkan `FINANCE` sebagai role ke-7 di Section 8.1 Entity Inventory, capability matrix Section 8.3, Appendix E ENUM, dan shell `(finance)/` di Appendix F.~~ ✅ Selesai di PRD v2.3.1 (Section 11 entry); tambahan: Section 5.7 FR Table FINANCE (FR-FN01..FR-FN05), 4 capability finance, backfill `finance` → `FINANCE`.
2. **Migrasi enum role** di [manava-app/src/types/index.ts](manava-app/src/types/index.ts) ke SCREAMING_SNAKE; sediakan mapping helper untuk backward-compat dengan data `sessionStorage` lama.
3. **Refactor `ALLOWED_PATHS`** di [manava-app/src/App.tsx](manava-app/src/App.tsx) menjadi capability-based check (selaras Section 8.3 PRD), bukan whitelist path per role.
4. **Update sidebar** di [manava-app/src/components/layout/Sidebar.tsx](manava-app/src/components/layout/Sidebar.tsx): tambah label "HR Admin", ganti "Manajer Admin" → "Admin Manager", pecah nav items lama Superadmin ke SUPERADMIN vs HR_ADMIN.
5. **Tambah mock user `HR_ADMIN`** di [manava-app/src/data/mockData.ts](manava-app/src/data/mockData.ts) + selector di [manava-app/src/pages/auth/LoginPage.tsx](manava-app/src/pages/auth/LoginPage.tsx).
6. **Buat halaman shell baru**: HR_ADMIN (ATS pipeline, monthly attendance lock, payroll run), LINE_MANAGER (leave approval queue, attendance clarification, KPI assessment) — semua scoped ke department.
7. **Halaman fallback queue SUPERADMIN** untuk dispute yang ter-override cron `disputeSlaWatchdog` (Section 6.4 + Appendix E.3 PRD).
8. **Aturan label**: render "Admin Manager" untuk `LINE_MANAGER` di semua UI; literal `LINE_MANAGER` selalu disimpan di state, sessionStorage, dan API payload.

## Catatan

- Tidak ada migrasi DB nyata pada FE-only run; semua state tetap mock + sessionStorage hingga backend ada.
- Sebelum mulai step 2, pastikan `git status` bersih dan jalankan `pnpm --filter manava-app run lint` sebagai baseline.
