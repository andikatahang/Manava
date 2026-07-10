// Seed the database with realistic Indonesian accounts (no mock/demo rows):
//   1 Superadmin, 1 HR Admin, 5 Admin Manajer, 50 Editor — 5 departments.
// Transactional data (attendance, leave, warnings, applications) starts EMPTY
// so everything visible in the app is produced by real usage.
// Password bersama dibaca dari SEED_PASSWORD env var (jangan hardcode —
// GitGuardian memindai repo untuk pasangan email+password).

import 'dotenv/config'
import { PrismaClient, UserRole, EditorStatus, PerformanceBand } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEFAULT_PASSWORD = process.env.SEED_PASSWORD
if (!DEFAULT_PASSWORD || DEFAULT_PASSWORD.length < 8) {
  console.error('❌ SEED_PASSWORD wajib diset di .env (min. 8 karakter) sebelum menjalankan seed.')
  process.exit(1)
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

const HR_ADMIN = { user_id: 'hr1', full_name: 'Andi Pratama' }

const ADMIN_MANAGERS = [
  { user_id: 'am1', full_name: 'Muhammad Rizki' },
  { user_id: 'am2', full_name: 'Ahmad Fauzan' },
  { user_id: 'am3', full_name: 'Budi Santoso' },
  { user_id: 'am4', full_name: 'Dedi Kurniawan' },
  { user_id: 'am5', full_name: 'Agus Setiawan' },
]

const EDITOR_NAMES = [
  'Rudi Hartono', 'Bambang Supriyanto', 'Eko Saputra', 'Fajar Hidayat', 'Arif Rahman',
  'Indra Gunawan', 'Wahyu Nugroho', 'Yoga Prasetyo', 'Hendra Wijaya', 'Doni Firmansyah',
  'Adi Susanto', 'Rizal Maulana', 'Ilham Ramadhan', 'Galih Permana', 'Siti Aisyah',
  'Dewi Lestari', 'Nur Aini', 'Rina Oktaviani', 'Putri Maharani', 'Fitri Handayani',
  'Dian Puspitasari', 'Wulan Sari', 'Ayu Lestari', 'Intan Permatasari', 'Ratna Dewi',
  'Yuni Kartika', 'Rani Amelia', 'Citra Anggraini', 'Nabila Safitri', 'Sri Wahyuni',
  'Linda Sari', 'Desi Aprilia', 'Maya Kusuma', 'Erna Susanti', 'Joko Widodo',
  'Tri Susilo', 'Slamet Riyadi', 'Teguh Prakoso', 'Bayu Pamungkas', 'Yudi Setiawan',
  'Reza Pratama', 'Fikri Ananda', 'Zulfikar Hidayat', 'Farhan Akbar', 'Novi Anggraini',
  'Eka Wulandari', 'Melati Sari', 'Lilis Handayani', 'Vina Oktavia', 'Siska Marlina',
]

// 5 departments × 10 editors, managed by am1..am5 in order.
const DEPARTMENTS = [
  { id: 'd1', name: 'Photo Retouching' },
  { id: 'd2', name: 'Video Editing' },
  { id: 'd3', name: 'Color Grading' },
  { id: 'd4', name: 'Motion Graphics' },
  { id: 'd5', name: 'VFX & Compositing' },
]

const DEPARTMENT_SPECS: string[][] = [
  ['product_retouch', 'portrait_retouch', 'background_removal', 'color_correction'],
  ['video_edit', 'motion_graphics', 'color_grading'],
  ['color_grading', 'color_correction', 'video_edit'],
  ['motion_graphics', 'vfx', 'video_edit'],
  ['vfx', 'motion_graphics', 'color_grading'],
]

// ─── Deterministic "realistic" value helpers (no Math.random → reproducible) ──

function emailOf(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z ]/g, '').split(' ').join('.')}@manava.id`
}
function usernameOf(name: string): string {
  return name.toLowerCase().replace(/[^a-z ]/g, '').split(' ').join('_')
}
/** Spread values across a range using the index — stable between runs. */
function spread(i: number, min: number, max: number, step = 7): number {
  const span = max - min
  return min + ((i * step) % (span + 1))
}
function round1(n: number): number {
  return Math.round(n * 10) / 10
}

async function main() {
  const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, 10)
  console.log('🔐 Bcrypt hash for default password ready.')

  // ── Wipe everything (transactional tables stay empty on purpose) ─────────
  // Termasuk tabel yang dimiliki seed-demo.ts: seed-demo.ts membuat baris yang
  // FK ke Editor (Project, dll.), jadi kalau tabel-tabel itu tidak dikosongkan
  // di sini dulu, Editor.deleteMany() di bawah gagal FK constraint dan proses
  // berhenti SEBELUM sempat membuat ulang AdminManager/Department/Editor.
  await prisma.kpiSnapshot.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.escrowAccount.deleteMany()
  await prisma.review.deleteMany()
  await prisma.dispute.deleteMany()
  await prisma.message.deleteMany()
  await prisma.revisionRequest.deleteMany()
  await prisma.contract.deleteMany()
  await prisma.revisionEnvelope.deleteMany()
  await prisma.project.deleteMany()
  await prisma.payslip.deleteMany()
  await prisma.applicant.deleteMany()
  await prisma.jobPosting.deleteMany()
  await prisma.jobApplication.deleteMany()
  await prisma.warning.deleteMany()
  await prisma.leaveRequest.deleteMany()
  await prisma.attendanceRecord.deleteMany()
  await prisma.attendanceSession.deleteMany()
  await prisma.attendanceSetting.deleteMany()
  await prisma.editorMetrics.deleteMany()
  await prisma.departmentMember.deleteMany()
  await prisma.department.deleteMany()
  await prisma.adminManager.deleteMany()
  await prisma.editor.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.user.deleteMany()

  // ── Users ─────────────────────────────────────────────────────────────────
  const editorUsers = EDITOR_NAMES.map((full_name, i) => ({
    user_id: `ed${String(i + 1).padStart(2, '0')}`,
    full_name,
    role: UserRole.editor,
  }))

  const allUsers = [
    { user_id: 'sa1', full_name: 'Administrator Sistem', role: UserRole.superadmin },
    { ...HR_ADMIN, role: UserRole.hr_admin },
    ...ADMIN_MANAGERS.map(m => ({ ...m, role: UserRole.admin_manager })),
    ...editorUsers,
  ]

  for (const u of allUsers) {
    await prisma.user.create({
      data: {
        user_id: u.user_id,
        full_name: u.full_name,
        email: emailOf(u.full_name),
        username: usernameOf(u.full_name),
        password_hash,
        role: u.role,
        is_active: true,
      },
    })
  }
  console.log(`👤 Seeded ${allUsers.length} users (password: SEED_PASSWORD dari .env)`)

  // ── Admin Managers ─────────────────────────────────────────────────────────
  for (const [i, m] of ADMIN_MANAGERS.entries()) {
    await prisma.adminManager.create({
      data: {
        id: m.user_id, // AdminManager id mirrors the user id for readability
        user_id: m.user_id,
        full_name: m.full_name,
        department: DEPARTMENTS[i]!.name,
      },
    })
  }
  console.log(`🧑‍💼 Seeded ${ADMIN_MANAGERS.length} admin managers`)

  // ── Editors + metrics ──────────────────────────────────────────────────────
  for (const [i, u] of editorUsers.entries()) {
    const deptIndex = Math.floor(i / 10) // 10 editors per department
    const specPool = DEPARTMENT_SPECS[deptIndex]!
    const specialization = [specPool[i % specPool.length]!, specPool[(i + 1) % specPool.length]!]
    const rating = round1(spread(i, 32, 49, 3) / 10) // 3.2 – 4.9
    const completion_rate = spread(i, 72, 98, 5) // 72 – 98 %
    const manager_rating = round1(spread(i, 30, 48, 5) / 10) // 3.0 – 4.8
    const kpi_average = round1((rating + (completion_rate / 100) * 5 + manager_rating) / 3)
    const performance_band =
      rating >= 4.5 ? PerformanceBand.excellent
      : rating >= 3.5 ? PerformanceBand.good
      : PerformanceBand.needs_improvement
    const onboardMonth = (i % 18) + 1 // spread across Jan 2025 – Jun 2026
    const onboarded_at = new Date(Date.UTC(2025 + Math.floor((onboardMonth - 1) / 12), (onboardMonth - 1) % 12, (i % 27) + 1))

    const editor_id = `e${String(i + 1).padStart(2, '0')}`
    await prisma.editor.create({
      data: {
        editor_id,
        user_id: u.user_id,
        full_name: u.full_name,
        email: emailOf(u.full_name),
        department: DEPARTMENTS[deptIndex]!.name,
        specialization,
        base_salary: spread(i, 6_500_000, 10_500_000, 350_000),
        bank_name: ['BCA', 'Mandiri', 'BRI', 'BNI'][i % 4]!,
        bank_account_no: `12${String(3456780000 + i * 137)}`,
        bank_account_name: u.full_name,
        npwp: `09.${String(254 + i).padStart(3, '0')}.641.${i % 10}-013.000`,
        status: EditorStatus.active,
        onboarded_at,
        rating,
        completion_rate,
        active_projects: 0,
        performance_band,
      },
    })
    await prisma.editorMetrics.create({
      data: {
        editor_id,
        editor_name: u.full_name,
        avg_client_rating: rating,
        completion_rate,
        manager_rating,
        kpi_average,
        performance_band,
      },
    })
  }
  console.log(`🎨 Seeded ${editorUsers.length} editors + metrics`)

  // ── Departments + membership ───────────────────────────────────────────────
  for (const [i, d] of DEPARTMENTS.entries()) {
    await prisma.department.create({
      data: {
        id: d.id,
        name: d.name,
        manager_id: ADMIN_MANAGERS[i]!.user_id,
        members: {
          create: Array.from({ length: 10 }, (_, j) => ({
            editor_id: `e${String(i * 10 + j + 1).padStart(2, '0')}`,
          })),
        },
      },
    })
  }
  console.log(`🏢 Seeded ${DEPARTMENTS.length} departments (10 editor each)`)

  // ── Attendance schedule defaults ──────────────────────────────────────────
  await prisma.attendanceSetting.create({
    data: { id: 'default', clock_in_time: '09:00', clock_out_time: '17:00', code_duration_minutes: 30 },
  })
  console.log('🕐 Seeded attendance settings (09:00 – 17:00, kode 30 menit)')

  console.log('\n✅ Seed complete. Login dengan password dari SEED_PASSWORD di .env.')
  console.log('   Superadmin     : administrator.sistem@manava.id')
  console.log('   HR Admin       : andi.pratama@manava.id')
  console.log('   Admin Manajer  : muhammad.rizki@manava.id (dan 4 lainnya)')
  console.log('   Editor         : rudi.hartono@manava.id (dan 49 lainnya)')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
