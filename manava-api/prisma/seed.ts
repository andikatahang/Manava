// Seed the database with the same fixture data used by the frontend mocks
// so the app looks identical after wiring. All seeded users share the
// password "manava123" (bcrypt-hashed) so any role can log in during defense.

import { PrismaClient, UserRole, EditorStatus, PerformanceBand } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEFAULT_PASSWORD = 'manava123'

// ─── Fixture data (ported from manava-app/src/data/mockData.ts) ───────────────

const users = [
  { user_id: 'u1',  full_name: 'Ahmad Superadmin', email: 'admin@manava.id', role: UserRole.superadmin,    is_active: true },
  { user_id: 'u11', full_name: 'Hasna HR Admin',    email: 'hasna@manava.id', role: UserRole.hr_admin,      is_active: true },
  { user_id: 'u2',  full_name: 'Budi Santoso',      email: 'budi@manava.id',  role: UserRole.editor,        is_active: true, avatar: 'https://i.pravatar.cc/480?img=12' },
  { user_id: 'u3',  full_name: 'Citra Client',      email: 'citra@client.com', role: UserRole.client,       is_active: true },
  { user_id: 'u4',  full_name: 'Dewi Mediator',     email: 'dewi@manava.id',  role: UserRole.mediator,      is_active: true },
  { user_id: 'u5',  full_name: 'Eko Manager',       email: 'eko@manava.id',   role: UserRole.admin_manager, is_active: true, avatar: 'https://i.pravatar.cc/480?img=68' },
  { user_id: 'u6',  full_name: 'Fani Finance',      email: 'fani@manava.id',  role: UserRole.finance,       is_active: true },
  // Editor role users (needed for their Editor rows)
  { user_id: 'u7',  full_name: 'Sari Dewi',        email: 'sari@manava.id',  role: UserRole.editor,        is_active: true, avatar: 'https://i.pravatar.cc/480?img=47' },
  { user_id: 'u8',  full_name: 'Andi Kurniawan',   email: 'andi@manava.id',  role: UserRole.editor,        is_active: true, avatar: 'https://i.pravatar.cc/480?img=33' },
  { user_id: 'u9',  full_name: 'Maya Putri',       email: 'maya@manava.id',  role: UserRole.editor,        is_active: true, avatar: 'https://i.pravatar.cc/480?img=45' },
  { user_id: 'u10', full_name: 'Rizky Hakim',      email: 'rizky@manava.id', role: UserRole.editor,        is_active: false, avatar: 'https://i.pravatar.cc/480?img=51' },
]

const editors = [
  { editor_id: 'e1', user_id: 'u2',  full_name: 'Budi Santoso',    email: 'budi@manava.id',  department: 'Photo Retouching', specialization: ['product_retouch', 'color_correction'], base_salary: 8000000,  status: EditorStatus.active,    onboarded_at: '2026-01-15', rating: 4.8, completion_rate: 94, active_projects: 2, performance_band: PerformanceBand.excellent,          avatar: 'https://i.pravatar.cc/480?img=12' },
  { editor_id: 'e2', user_id: 'u7',  full_name: 'Sari Dewi',       email: 'sari@manava.id',  department: 'Video Editing',    specialization: ['video_edit', 'color_grading'],           base_salary: 9000000,  status: EditorStatus.active,    onboarded_at: '2026-02-01', rating: 4.5, completion_rate: 88, active_projects: 1, performance_band: PerformanceBand.good,               avatar: 'https://i.pravatar.cc/480?img=47' },
  { editor_id: 'e3', user_id: 'u8',  full_name: 'Andi Kurniawan',  email: 'andi@manava.id',  department: 'Photo Retouching', specialization: ['portrait_retouch', 'background_removal'], base_salary: 7500000,  status: EditorStatus.active,    onboarded_at: '2026-03-10', rating: 3.9, completion_rate: 75, active_projects: 3, performance_band: PerformanceBand.good,               avatar: 'https://i.pravatar.cc/480?img=33' },
  { editor_id: 'e4', user_id: 'u9',  full_name: 'Maya Putri',      email: 'maya@manava.id',  department: 'Color Grading',    specialization: ['color_grading', 'vfx'],                  base_salary: 10000000, status: EditorStatus.active,    onboarded_at: '2026-01-05', rating: 4.9, completion_rate: 97, active_projects: 2, performance_band: PerformanceBand.excellent,          avatar: 'https://i.pravatar.cc/480?img=45' },
  { editor_id: 'e5', user_id: 'u10', full_name: 'Rizky Hakim',     email: 'rizky@manava.id', department: 'Video Editing',    specialization: ['video_edit', 'motion_graphics'],         base_salary: 8500000,  status: EditorStatus.suspended, onboarded_at: '2026-02-20', rating: 2.8, completion_rate: 60, active_projects: 0, performance_band: PerformanceBand.needs_improvement,  avatar: 'https://i.pravatar.cc/480?img=51' },
]

const adminManagers = [
  { id: 'u5',  user_id: 'u5', full_name: 'Eko Manager', department: 'Photo Retouching', avatar: 'https://i.pravatar.cc/480?img=68' },
  { id: 'am2', full_name: 'Rina Wijaya',                department: 'Video Editing',    avatar: 'https://i.pravatar.cc/480?img=15' },
  { id: 'am3', full_name: 'Dani Kusuma',                department: 'Color Grading',    avatar: 'https://i.pravatar.cc/480?img=25' },
]

const departments = [
  { id: 'd1', name: 'Photo Retouching', manager_id: 'u5',  member_ids: ['e1', 'e3'] },
  { id: 'd2', name: 'Video Editing',    manager_id: 'am2', member_ids: ['e2', 'e5'] },
  { id: 'd3', name: 'Color Grading',    manager_id: 'am3', member_ids: ['e4'] },
]

const editorMetrics = [
  { editor_id: 'e1', editor_name: 'Budi Santoso',    avg_client_rating: 4.8, completion_rate: 94, manager_rating: 4.5, kpi_average: 4.7, performance_band: PerformanceBand.excellent },
  { editor_id: 'e2', editor_name: 'Sari Dewi',       avg_client_rating: 4.5, completion_rate: 88, manager_rating: 4.2, kpi_average: 4.3, performance_band: PerformanceBand.excellent },
  { editor_id: 'e3', editor_name: 'Andi Kurniawan',  avg_client_rating: 3.9, completion_rate: 75, manager_rating: 3.5, kpi_average: 3.7, performance_band: PerformanceBand.good },
  { editor_id: 'e4', editor_name: 'Maya Putri',      avg_client_rating: 4.9, completion_rate: 97, manager_rating: 4.8, kpi_average: 4.9, performance_band: PerformanceBand.excellent },
  { editor_id: 'e5', editor_name: 'Rizky Hakim',     avg_client_rating: 2.8, completion_rate: 60, manager_rating: 2.5, kpi_average: 2.6, performance_band: PerformanceBand.needs_improvement },
]

async function main() {
  const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, 10)
  console.log('🔐 Bcrypt hash for default password ready.')

  // ── Wipe in FK-safe order to make the seed idempotent ────────────────────
  await prisma.warning.deleteMany()
  await prisma.leaveRequest.deleteMany()
  await prisma.attendanceRecord.deleteMany()
  await prisma.editorMetrics.deleteMany()
  await prisma.departmentMember.deleteMany()
  await prisma.department.deleteMany()
  await prisma.adminManager.deleteMany()
  await prisma.editor.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.user.deleteMany()

  // ── Users ────────────────────────────────────────────────────────────────
  for (const u of users) {
    await prisma.user.create({
      data: {
        user_id: u.user_id,
        full_name: u.full_name,
        email: u.email,
        username: u.email.split('@')[0],
        password_hash,
        role: u.role,
        is_active: u.is_active,
        avatar: u.avatar,
      },
    })
  }
  console.log(`👤 Seeded ${users.length} users (password: "${DEFAULT_PASSWORD}")`)

  // ── Editors ──────────────────────────────────────────────────────────────
  for (const e of editors) {
    await prisma.editor.create({
      data: {
        editor_id: e.editor_id,
        user_id: e.user_id,
        full_name: e.full_name,
        email: e.email,
        department: e.department,
        specialization: e.specialization,
        base_salary: e.base_salary,
        status: e.status,
        onboarded_at: new Date(e.onboarded_at),
        rating: e.rating,
        completion_rate: e.completion_rate,
        active_projects: e.active_projects,
        performance_band: e.performance_band,
        avatar: e.avatar,
      },
    })
  }
  console.log(`🎨 Seeded ${editors.length} editors`)

  // ── Admin Managers ───────────────────────────────────────────────────────
  for (const m of adminManagers) {
    await prisma.adminManager.create({
      data: {
        id: m.id,
        user_id: m.user_id,
        full_name: m.full_name,
        department: m.department,
        avatar: m.avatar,
      },
    })
  }
  console.log(`🧑‍💼 Seeded ${adminManagers.length} admin managers`)

  // ── Departments + membership ─────────────────────────────────────────────
  for (const d of departments) {
    await prisma.department.create({
      data: {
        id: d.id,
        name: d.name,
        manager_id: d.manager_id,
        members: {
          create: d.member_ids.map(editor_id => ({ editor_id })),
        },
      },
    })
  }
  console.log(`🏢 Seeded ${departments.length} departments`)

  // ── Editor metrics ───────────────────────────────────────────────────────
  for (const m of editorMetrics) {
    await prisma.editorMetrics.create({ data: m })
  }
  console.log(`📈 Seeded ${editorMetrics.length} editor metrics`)

  console.log('\n✅ Seed complete.')
  console.log('   Try: hasna@manava.id / manava123  (HR Admin)')
  console.log('        budi@manava.id  / manava123  (Editor)')
  console.log('        eko@manava.id   / manava123  (Admin Manager)')
}

main()
  .catch(async e => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
