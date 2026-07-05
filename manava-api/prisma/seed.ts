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

// Minimal one-page PDF so the HR detail page has a real CV preview in dev.
const SAMPLE_PDF = [
  '%PDF-1.4',
  '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj',
  '4 0 obj<</Length 60>>stream',
  'BT /F1 18 Tf 72 770 Td (Curriculum Vitae - Manava) Tj ET',
  'endstream endobj',
  '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj',
  'trailer<</Root 1 0 R>>',
  '%%EOF',
].join('\n')
const SAMPLE_CV_DATA = `data:application/pdf;base64,${Buffer.from(SAMPLE_PDF).toString('base64')}`

const jobApplications = [
  {
    application_id: 'app1', full_name: 'Dimas Pratama', email: 'dimas.pratama@mail.com',
    age: 24, phone: '+62 812-1111-2222', education: 'S1', gpa: 3.62, graduation_year: 2024,
    skills: ['Product Retouch', 'Color Correction'], status: 'new' as const,
    ai_summary:
      'Dimas Pratama (24 tahun) adalah lulusan S1 tahun 2024 dengan IPK di atas rata-rata (3.62). ' +
      'Kandidat memiliki pengalaman sekitar 2 tahun sejak kelulusan dan menonjol pada keahlian Product Retouch, Color Correction. ' +
      'Profil keahliannya paling cocok untuk departemen Color Grading. ' +
      'Rekomendasi: lanjutkan ke tahap interview untuk memvalidasi portofolio dan kecocokan tim.',
    submitted_at: '2026-06-25T09:12:00.000Z',
  },
  {
    application_id: 'app2', full_name: 'Anindya Rahmawati', email: 'anindya.r@mail.com',
    age: 27, phone: '+62 813-3333-4444', education: 'S1', gpa: 3.81, graduation_year: 2021,
    skills: ['Video Edit', 'Motion Graphics'], status: 'interview' as const,
    ai_summary:
      'Anindya Rahmawati (27 tahun) adalah lulusan S1 tahun 2021 dengan IPK di atas rata-rata (3.81). ' +
      'Kandidat memiliki pengalaman sekitar 5 tahun sejak kelulusan dan menonjol pada keahlian Video Edit, Motion Graphics. ' +
      'Profil keahliannya paling cocok untuk departemen Video Editing. ' +
      'Rekomendasi: lanjutkan ke tahap interview untuk memvalidasi portofolio dan kecocokan tim.',
    submitted_at: '2026-06-23T14:40:00.000Z',
    invited_at: '2026-06-24T08:00:00.000Z',
  },
  {
    application_id: 'app3', full_name: 'Rangga Saputra', email: 'rangga.s@mail.com',
    age: 22, phone: '+62 815-5555-6666', education: 'D3', gpa: 3.4, graduation_year: 2025,
    skills: ['BG Removal', 'Portrait Retouch'], status: 'new' as const,
    ai_summary:
      'Rangga Saputra (22 tahun) adalah lulusan D3 tahun 2025 dengan IPK cukup baik (3.40). ' +
      'Kandidat memiliki pengalaman sekitar 1 tahun sejak kelulusan dan menonjol pada keahlian BG Removal, Portrait Retouch. ' +
      'Profil keahliannya paling cocok untuk departemen Photo Retouching. ' +
      'Rekomendasi: lanjutkan ke tahap interview untuk memvalidasi portofolio dan kecocokan tim.',
    submitted_at: '2026-06-26T11:05:00.000Z',
  },
]

async function main() {
  const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, 10)
  console.log('🔐 Bcrypt hash for default password ready.')

  // ── Wipe in FK-safe order to make the seed idempotent ────────────────────
  await prisma.jobApplication.deleteMany()
  await prisma.warning.deleteMany()
  await prisma.leaveRequest.deleteMany()
  await prisma.attendanceRecord.deleteMany()
  await prisma.attendanceSession.deleteMany()
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

  // ── Job applications (recruitment) ───────────────────────────────────────
  for (const a of jobApplications) {
    await prisma.jobApplication.create({
      data: {
        application_id: a.application_id,
        full_name: a.full_name,
        email: a.email,
        age: a.age,
        phone: a.phone,
        education: a.education,
        gpa: a.gpa,
        graduation_year: a.graduation_year,
        skills: a.skills,
        cv_name: `CV_${a.full_name.replace(/\s+/g, '_')}.pdf`,
        cv_mime: 'application/pdf',
        cv_data: SAMPLE_CV_DATA,
        ai_summary: a.ai_summary,
        status: a.status,
        submitted_at: new Date(a.submitted_at),
        invited_at: a.invited_at ? new Date(a.invited_at) : null,
      },
    })
  }
  console.log(`📄 Seeded ${jobApplications.length} job applications`)

  // ── Attendance ───────────────────────────────────────────────────────────
  // A few recent days for Budi (editor) + Eko (admin manager) so the calendar
  // has color, plus one forgotten clock-out each state: pending (in HR's
  // review queue), approved (repaired by HR), rejected (counted absent).
  const wib = (day: string, hm: string) => new Date(`${day}T${hm}:00+07:00`)
  const yesterday = (offset: number) => {
    const d = new Date()
    d.setDate(d.getDate() - offset)
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d)
  }
  const [d1, d2, d3, d4] = [yesterday(1), yesterday(2), yesterday(3), yesterday(4)]
  const attendanceSeed = [
    // Budi: normal day, late day, and a forgotten clock-out awaiting HR.
    { user_id: 'u2', date: d4!, in: '07:58', out: '17:02', status: 'present', review: 'none' },
    { user_id: 'u2', date: d3!, in: '08:24', out: '17:05', status: 'late', review: 'none' },
    { user_id: 'u2', date: d1!, in: '08:03', out: null, status: 'incomplete', review: 'pending' },
    // Eko: normal day + a forgotten clock-out already repaired by HR.
    { user_id: 'u5', date: d3!, in: '07:55', out: '17:00', status: 'present', review: 'none' },
    {
      user_id: 'u5', date: d2!, in: '08:01', out: null, status: 'present', review: 'approved',
      adjusted_out: '17:00', note: 'Konfirmasi via WA — lupa clock-out, pulang normal.',
      explanation: 'Lupa clock-out, langsung pulang setelah meeting sore.', proposed: '17:00',
    },
    // Sari: forgotten clock-out that HR rejected → counted absent.
    {
      user_id: 'u7', date: d2!, in: '08:05', out: null, status: 'absent', review: 'rejected',
      note: 'Tidak ada konfirmasi hingga cutoff — dihitung absen.',
    },
  ] as const
  for (const a of attendanceSeed) {
    await prisma.attendanceRecord.create({
      data: {
        user_id: a.user_id,
        date: new Date(a.date),
        clock_in: wib(a.date, a.in),
        clock_out: a.out ? wib(a.date, a.out) : null,
        status: a.status,
        review: a.review,
        adjusted_clock_out: 'adjusted_out' in a ? wib(a.date, a.adjusted_out) : null,
        adjusted_by_id: a.review === 'approved' || a.review === 'rejected' ? 'u11' : null,
        adjusted_at: a.review === 'approved' || a.review === 'rejected' ? new Date() : null,
        adjustment_note: 'note' in a ? a.note : null,
        user_explanation: 'explanation' in a ? a.explanation : null,
        proposed_clock_out: 'proposed' in a ? wib(a.date, a.proposed) : null,
      },
    })
  }
  console.log(`🕐 Seeded ${attendanceSeed.length} attendance records (1 pending HR review)`)

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
