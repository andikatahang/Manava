// seed-demo.ts — Demo dataset layered ON TOP of seed.ts.
// Jalankan `npm run prisma:seed` dulu (akun inti), lalu `npm run prisma:seed-demo`.
// Mengisi SEMUA tabel transaksional dengan riwayat bervariasi agar UI terlihat
// seperti aplikasi yang sudah lama dipakai: presensi ±26 hari kerja, cuti/izin,
// peringatan, lamaran kerja (CV PDF valid), proyek + kontrak + revisi + chat +
// sengketa + review + escrow + transaksi, dan slip gaji 3 bulan.
// Deterministik — tanpa Math.random, hasil sama di setiap run.

import 'dotenv/config'
import {
  Prisma, PrismaClient, UserRole, AttendanceStatus, AttendanceReview, AttendanceSessionType,
  LeaveType, LeaveStatus, RequesterRole, WarningSeverity, WarningStatus, WarningTargetRole,
  JobStatus, ApplicantStage, ApplicationStatus, ProjectStatus, ContractStatus,
  RevisionAiLabel, RevisionFinalLabel, RevisionStatus, MessageType,
  DisputeStatus, DisputeOpenerRole, DisputeResolutionType,
  PayslipStatus, TransactionType, TransactionStatus,
} from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEFAULT_PASSWORD = process.env.SEED_PASSWORD
if (!DEFAULT_PASSWORD || DEFAULT_PASSWORD.length < 8) {
  console.error('❌ SEED_PASSWORD wajib diset di .env (min. 8 karakter).')
  process.exit(1)
}

// ─── Deterministic helpers ────────────────────────────────────────────────────

/** Pseudo-random 0..1 dari seed integer — stabil antar run. */
function rnd(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}
/** @db.Date value (UTC midnight). */
function d(key: string): Date {
  return new Date(`${key}T00:00:00Z`)
}
/** Instant "HH:MM" WIB pada tanggal tertentu. */
function t(key: string, hm: string): Date {
  return new Date(`${key}T${hm}:00+07:00`)
}
function hm(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(Math.floor(minute)).padStart(2, '0')}`
}
/** Hari kerja (Sen–Jum) inklusif antara dua tanggal YYYY-MM-DD. */
function workingDays(fromKey: string, toKey: string): string[] {
  const out: string[] = []
  const end = new Date(`${toKey}T00:00:00Z`).getTime()
  for (let ms = new Date(`${fromKey}T00:00:00Z`).getTime(); ms <= end; ms += 86_400_000) {
    const day = new Date(ms)
    if (day.getUTCDay() >= 1 && day.getUTCDay() <= 5) out.push(day.toISOString().slice(0, 10))
  }
  return out
}
function round1(n: number): number {
  return Math.round(n * 10) / 10
}
function code6(seed: number): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i++) out += chars[Math.floor(rnd(seed * 7 + i) * chars.length)]!
  return out
}

// ─── Minimal valid PDF (untuk CV pelamar) ─────────────────────────────────────

function buildCvPdf(lines: string[]): string {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
  const content =
    `BT\n/F1 11 Tf\n56 770 Td\n16 TL\n` +
    lines.map(l => `(${esc(l)}) Tj\nT*`).join('\n') +
    `\nET`
  const objects = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>`,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`,
  ]
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  for (const [i, body] of objects.entries()) {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`
  }
  const xrefAt = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`
  return `data:application/pdf;base64,${Buffer.from(pdf, 'latin1').toString('base64')}`
}

// ─── Static demo definitions ─────────────────────────────────────────────────

const TODAY = '2026-07-07'
const STAFF_IDS = ['hr1', 'am1', 'am2', 'am3', 'am4', 'am5',
  ...Array.from({ length: 50 }, (_, i) => `ed${String(i + 1).padStart(2, '0')}`)]

// Cuti/izin — sebagian sudah diputus (riwayat), sebagian masih pending.
const LEAVE_PLAN: Array<{
  user: string; role: RequesterRole; type: LeaveType
  start: string; end: string; status: LeaveStatus; filed: string
}> = [
  { user: 'ed22', role: 'editor',        type: 'izin', start: '2026-06-04', end: '2026-06-04', status: 'approved', filed: '2026-06-03' },
  { user: 'am2',  role: 'admin_manager', type: 'cuti', start: '2026-06-10', end: '2026-06-11', status: 'approved', filed: '2026-06-02' },
  { user: 'ed12', role: 'editor',        type: 'cuti', start: '2026-06-08', end: '2026-06-09', status: 'rejected', filed: '2026-06-05' },
  { user: 'ed03', role: 'editor',        type: 'cuti', start: '2026-06-15', end: '2026-06-17', status: 'approved', filed: '2026-06-08' },
  { user: 'ed31', role: 'editor',        type: 'izin', start: '2026-06-18', end: '2026-06-18', status: 'rejected', filed: '2026-06-17' },
  { user: 'am1',  role: 'admin_manager', type: 'cuti', start: '2026-06-19', end: '2026-06-19', status: 'approved', filed: '2026-06-12' },
  { user: 'ed17', role: 'editor',        type: 'izin', start: '2026-06-22', end: '2026-06-22', status: 'approved', filed: '2026-06-21' },
  { user: 'ed28', role: 'editor',        type: 'cuti', start: '2026-06-25', end: '2026-06-26', status: 'approved', filed: '2026-06-18' },
  { user: 'ed44', role: 'editor',        type: 'cuti', start: '2026-06-29', end: '2026-06-30', status: 'approved', filed: '2026-06-22' },
  { user: 'ed40', role: 'editor',        type: 'cuti', start: '2026-05-11', end: '2026-05-13', status: 'approved', filed: '2026-05-04' },
  { user: 'ed15', role: 'editor',        type: 'izin', start: '2026-05-27', end: '2026-05-27', status: 'approved', filed: '2026-05-26' },
  { user: 'ed35', role: 'editor',        type: 'izin', start: '2026-07-09', end: '2026-07-09', status: 'pending',  filed: '2026-07-06' },
  { user: 'am4',  role: 'admin_manager', type: 'izin', start: '2026-07-10', end: '2026-07-10', status: 'pending',  filed: '2026-07-07' },
  { user: 'ed07', role: 'editor',        type: 'cuti', start: '2026-07-13', end: '2026-07-15', status: 'pending',  filed: '2026-07-05' },
  { user: 'ed09', role: 'editor',        type: 'cuti', start: '2026-07-20', end: '2026-07-24', status: 'pending',  filed: '2026-07-06' },
]

// Kasus lupa clock-out: pending menunggu HR, approved (HR isi), rejected (absen).
const INCOMPLETE_CASES: Array<{
  user: string; date: string; review: AttendanceReview
  explanation?: string; proposed?: string; note?: string
}> = [
  { user: 'ed06', date: '2026-07-06', review: 'pending', explanation: 'Lupa clock-out karena lembur render sampai malam.', proposed: '19:30' },
  { user: 'ed23', date: '2026-07-03', review: 'pending', explanation: 'Langsung ke lokasi klien sore hari, lupa presensi keluar.', proposed: '17:15' },
  { user: 'am5',  date: '2026-07-06', review: 'pending', explanation: 'Rapat vendor di luar kantor hingga jam pulang.', proposed: '17:30' },
  { user: 'ed14', date: '2026-06-16', review: 'approved', explanation: 'Lupa clock-out, pulang jam normal.', proposed: '17:05', note: 'Dikonfirmasi manajer, hadir penuh.' },
  { user: 'ed30', date: '2026-06-19', review: 'approved', explanation: 'HP tertinggal di ruang editing.', proposed: '17:10', note: 'Bukti CCTV lobi jam 17:12.' },
  { user: 'ed48', date: '2026-06-24', review: 'approved', explanation: 'Sesi keluar sudah tutup saat saya keluar.', proposed: '17:20', note: 'Disetujui, sesi keluar tutup lebih awal.' },
  { user: 'ed26', date: '2026-06-12', review: 'rejected', explanation: 'Lupa presensi keluar.', proposed: '17:00', note: 'Tidak ada bukti kehadiran sore, dihitung tidak hadir.' },
  { user: 'ed39', date: '2026-06-23', review: 'rejected', note: 'Tanpa penjelasan hingga batas review, dihitung tidak hadir.' },
]

const WARNINGS: Array<{
  target: string; role: WarningTargetRole; severity: WarningSeverity; status: WarningStatus
  issuer: string; issued: string; expires: string; reason: string
}> = [
  { target: 'ed05', role: 'editor', severity: 'ringan', status: 'aktif',       issuer: 'am1', issued: '2026-06-24', expires: '2026-07-24', reason: 'Terlambat masuk 3 kali dalam satu minggu tanpa keterangan.' },
  { target: 'ed13', role: 'editor', severity: 'sedang', status: 'diakui',      issuer: 'am2', issued: '2026-06-10', expires: '2026-08-10', reason: 'Deadline deliverable proyek video terlewat 2 hari tanpa komunikasi ke klien.' },
  { target: 'ed27', role: 'editor', severity: 'berat',  status: 'aktif',       issuer: 'hr1', issued: '2026-07-01', expires: '2026-10-01', reason: 'Membagikan file mentah klien ke pihak luar tanpa izin — pelanggaran NDA.' },
  { target: 'ed08', role: 'editor', severity: 'ringan', status: 'kedaluwarsa', issuer: 'am1', issued: '2026-04-02', expires: '2026-05-02', reason: 'Tidak mengikuti standar penamaan file proyek retouching.' },
  { target: 'am3',  role: 'admin_manager', severity: 'sedang', status: 'aktif', issuer: 'hr1', issued: '2026-06-28', expires: '2026-08-28', reason: 'Laporan kapasitas tim departemen terlambat dua periode berturut-turut.' },
  { target: 'ed36', role: 'editor', severity: 'ringan', status: 'diakui',      issuer: 'am4', issued: '2026-05-20', expires: '2026-07-20', reason: 'Menggunakan aset stock tanpa lisensi pada draft motion graphics.' },
  { target: 'ed42', role: 'editor', severity: 'sedang', status: 'aktif',       issuer: 'am5', issued: '2026-07-03', expires: '2026-09-03', reason: 'Revisi klien dikerjakan di luar scope tanpa approval envelope.' },
  { target: 'ed19', role: 'editor', severity: 'ringan', status: 'kedaluwarsa', issuer: 'am2', issued: '2026-03-15', expires: '2026-04-15', reason: 'Lupa update status proyek di sistem selama satu minggu.' },
]

const JOB_POSTINGS = [
  { job_id: 'j1', title: 'Senior Photo Retoucher',     specialization: ['product_retouch', 'portrait_retouch'], status: JobStatus.open,   created: '2026-06-01' },
  { job_id: 'j2', title: 'Video Editor',               specialization: ['video_edit', 'color_grading'],         status: JobStatus.open,   created: '2026-06-10' },
  { job_id: 'j3', title: 'Motion Graphics Designer',   specialization: ['motion_graphics', 'vfx'],              status: JobStatus.open,   created: '2026-06-20' },
  { job_id: 'j4', title: 'Colorist (Film & Iklan)',    specialization: ['color_grading'],                       status: JobStatus.closed, created: '2026-04-05' },
]

const APPLICANTS: Array<{ job: string; name: string; email: string; tahap: ApplicantStage; score: number | null; created: string }> = [
  { job: 'j1', name: 'Raka Ardiansyah',   email: 'raka.ardiansyah@gmail.com',  tahap: 'applied',        score: null, created: '2026-07-05' },
  { job: 'j1', name: 'Salsabila Zahra',   email: 'salsabila.zahra@gmail.com',  tahap: 'screening',      score: 78,   created: '2026-07-01' },
  { job: 'j1', name: 'Yohanes Krisna',    email: 'yohanes.krisna@gmail.com',   tahap: 'interview',      score: 84,   created: '2026-06-24' },
  { job: 'j1', name: 'Amelia Rosa',       email: 'amelia.rosa@gmail.com',      tahap: 'rejected',       score: 52,   created: '2026-06-15' },
  { job: 'j2', name: 'Fadhil Ramadhan',   email: 'fadhil.ramadhan@gmail.com',  tahap: 'applied',        score: null, created: '2026-07-06' },
  { job: 'j2', name: 'Karina Putri',      email: 'karina.putri@gmail.com',     tahap: 'interview',      score: 88,   created: '2026-06-26' },
  { job: 'j2', name: 'Bagus Nugraha',     email: 'bagus.nugraha@gmail.com',    tahap: 'offered',        score: 91,   created: '2026-06-18' },
  { job: 'j2', name: 'Tiara Anindya',     email: 'tiara.anindya@gmail.com',    tahap: 'rejected',       score: 47,   created: '2026-06-20' },
  { job: 'j3', name: 'Gilang Mahesa',     email: 'gilang.mahesa@gmail.com',    tahap: 'screening',      score: 73,   created: '2026-07-02' },
  { job: 'j3', name: 'Nadia Safira',      email: 'nadia.safira@gmail.com',     tahap: 'offer_accepted', score: 89,   created: '2026-06-22' },
  { job: 'j4', name: 'Hafiz Alamsyah',    email: 'hafiz.alamsyah@gmail.com',   tahap: 'confirmed',      score: 93,   created: '2026-04-20' },
  { job: 'j4', name: 'Rosa Kirana',       email: 'rosa.kirana@gmail.com',      tahap: 'offer_expired',  score: 82,   created: '2026-04-15' },
]

interface ApplicationSpec {
  name: string; email: string; phone: string; age: number
  education: string; gpa: number; gradYear: number; skills: string[]
  dept: string; meets: boolean | null; source: 'openai' | 'heuristic'; confidence: number | null
  status: ApplicationStatus; submitted: string; invited?: string; decided?: string
  summary: string
}
const APPLICATIONS: ApplicationSpec[] = [
  { name: 'Rizky Febrian', email: 'rizky.febrian@gmail.com', phone: '081234567801', age: 26,
    education: 'S1 Desain Komunikasi Visual — Universitas Bina Nusantara', gpa: 3.62, gradYear: 2022,
    skills: ['Adobe Photoshop', 'Capture One', 'Frequency Separation', 'Product Retouching'],
    dept: 'Photo Retouching', meets: true, source: 'openai', confidence: 0.91,
    status: 'new', submitted: '2026-07-06',
    summary: 'Kandidat kuat untuk Photo Retouching: 3 tahun pengalaman retouching komersial di studio e-commerce, portofolio produk fashion dan kosmetik, menguasai frequency separation dan color correction tingkat lanjut.' },
  { name: 'Annisa Maharani', email: 'annisa.maharani@gmail.com', phone: '081234567802', age: 24,
    education: 'S1 Film dan Televisi — Institut Kesenian Jakarta', gpa: 3.48, gradYear: 2024,
    skills: ['Premiere Pro', 'After Effects', 'Storytelling', 'Color Grading Dasar'],
    dept: 'Video Editing', meets: true, source: 'openai', confidence: 0.84,
    status: 'new', submitted: '2026-07-05',
    summary: 'Fresh graduate dengan 1 tahun freelance video editing untuk brand lokal; kuat di narrative cut dan pacing, perlu pendalaman color grading profesional.' },
  { name: 'Devan Pradana', email: 'devan.pradana@gmail.com', phone: '081234567803', age: 29,
    education: 'D3 Multimedia — Politeknik Negeri Media Kreatif', gpa: 3.31, gradYear: 2019,
    skills: ['DaVinci Resolve', 'Color Grading', 'HDR Workflow'],
    dept: 'Color Grading', meets: null, source: 'heuristic', confidence: null,
    status: 'new', submitted: '2026-07-07',
    summary: 'CV menyebut pengalaman grading iklan regional namun detail proyek dan durasi kerja tidak lengkap — perlu review manual untuk verifikasi.' },
  { name: 'Larasati Wibowo', email: 'larasati.wibowo@gmail.com', phone: '081234567804', age: 27,
    education: 'S1 Desain Produk — Institut Teknologi Bandung', gpa: 3.71, gradYear: 2021,
    skills: ['After Effects', 'Cinema 4D', 'Motion Design', 'Lottie'],
    dept: 'Motion Graphics', meets: true, source: 'openai', confidence: 0.88,
    status: 'interview', submitted: '2026-06-28', invited: '2026-07-01',
    summary: '4 tahun motion design di agensi digital; portofolio bumper TV dan explainer video, terbiasa pipeline C4D + AE, cocok untuk tim Motion Graphics.' },
  { name: 'Bima Saputra', email: 'bima.saputra@gmail.com', phone: '081234567805', age: 31,
    education: 'S1 Teknik Informatika — Universitas Gadjah Mada', gpa: 3.29, gradYear: 2017,
    skills: ['Nuke', 'After Effects', 'Rotoscoping', 'Compositing', 'Python'],
    dept: 'VFX & Compositing', meets: true, source: 'openai', confidence: 0.86,
    status: 'interview', submitted: '2026-06-25', invited: '2026-06-29',
    summary: '6 tahun compositing film dan iklan, termasuk 2 tahun di studio pasca-produksi Jakarta; menguasai Nuke node-based workflow dan scripting otomasi.' },
  { name: 'Citra Ayudia', email: 'citra.ayudia@gmail.com', phone: '081234567806', age: 25,
    education: 'S1 Fotografi — Universitas Pasundan', gpa: 3.55, gradYear: 2023,
    skills: ['Photoshop', 'Lightroom', 'Beauty Retouching'],
    dept: 'Photo Retouching', meets: true, source: 'heuristic', confidence: null,
    status: 'interview', submitted: '2026-06-27', invited: '2026-07-02',
    summary: 'Retoucher beauty & portrait dengan klien fotografer wedding; skill dodge-and-burn halus, belum banyak pengalaman retouching produk komersial.' },
  { name: 'Aditya Wardhana', email: 'aditya.wardhana@gmail.com', phone: '081234567807', age: 28,
    education: 'S1 Sistem Informasi — Universitas Indonesia', gpa: 3.44, gradYear: 2020,
    skills: ['Premiere Pro', 'DaVinci Resolve', 'Sound Design'],
    dept: 'Video Editing', meets: true, source: 'openai', confidence: 0.9,
    status: 'approved', submitted: '2026-06-18', invited: '2026-06-21', decided: '2026-06-30',
    summary: '5 tahun editing dokumenter dan konten YouTube berskala besar; cepat, terstruktur, dan punya dasar sound design yang jarang dimiliki editor.' },
  { name: 'Puspita Sari', email: 'puspita.sari.kerja@gmail.com', phone: '081234567808', age: 26,
    education: 'S1 Desain Komunikasi Visual — Universitas Sebelas Maret', gpa: 3.58, gradYear: 2022,
    skills: ['After Effects', 'Illustrator', 'Motion Graphics'],
    dept: 'Motion Graphics', meets: true, source: 'openai', confidence: 0.82,
    status: 'approved', submitted: '2026-06-15', invited: '2026-06-18', decided: '2026-06-26',
    summary: 'Motion designer in-house brand FMCG 3 tahun; kuat di kinetic typography dan social media asset, portofolio konsisten dan rapi.' },
  { name: 'Yusuf Hamdani', email: 'yusuf.hamdani@gmail.com', phone: '081234567809', age: 23,
    education: 'SMK Multimedia — SMKN 1 Surabaya', gpa: 0, gradYear: 2021,
    skills: ['Photoshop Dasar', 'CapCut'],
    dept: 'Photo Retouching', meets: false, source: 'openai', confidence: 0.77,
    status: 'rejected', submitted: '2026-06-20', decided: '2026-06-24',
    summary: 'Pengalaman terbatas pada editing kasual media sosial; belum memenuhi kriteria retouching komersial yang membutuhkan portofolio produk profesional.' },
  { name: 'Mega Utami', email: 'mega.utami@gmail.com', phone: '081234567810', age: 30,
    education: 'S1 Manajemen — Universitas Trisakti', gpa: 3.12, gradYear: 2018,
    skills: ['Canva', 'Manajemen Proyek'],
    dept: 'Video Editing', meets: false, source: 'heuristic', confidence: null,
    status: 'rejected', submitted: '2026-06-22', decided: '2026-06-27',
    summary: 'Latar belakang manajemen proyek kreatif tanpa pengalaman hands-on editing; tidak cocok untuk posisi teknis editor video.' },
]

const CLIENTS = [
  { id: 'cl1', name: 'Budi Wijaya',      company: 'PT Wijaya Kreatif',      email: 'budi@wijayakreatif.co.id' },
  { id: 'cl2', name: 'Sari Dewanti',     company: 'Studio Pelangi',         email: 'sari@studiopelangi.id' },
  { id: 'cl3', name: 'Anton Salim',      company: 'CV Mitra Visual',        email: 'anton@mitravisual.co.id' },
  { id: 'cl4', name: 'Maria Tanuwijaya', company: 'Tanu Films',             email: 'maria@tanufilms.com' },
  { id: 'cl5', name: 'Rendra Prakoso',   company: 'Prakoso Media',          email: 'rendra@prakosomedia.id' },
  { id: 'cl6', name: 'Lina Halim',       company: 'Halim Property',         email: 'lina@halimproperty.co.id' },
  { id: 'cl7', name: 'Dimas Aryo',       company: 'Aryo Wedding Organizer', email: 'dimas@aryowedding.id' },
  { id: 'cl8', name: 'Yulia Kartika',    company: 'Kartika Fashion',        email: 'yulia@kartikafashion.co.id' },
]

interface ProjectSpec {
  id: string; client: string; editor: string; title: string; description: string
  status: ProjectStatus; value: number; started?: string; completed?: string; created: string
  allowance: number; consumed: number
  included: string; excluded: string
  contract: { scope: string; style: string; elements: string; days: number; status: ContractStatus; approved?: string }
  revisions: Array<{ text: string; ai: RevisionAiLabel; conf: number; final?: RevisionFinalLabel; price?: number; status: RevisionStatus; at: string }>
  review?: { rating: number; comment: string }
}
const PROJECTS: ProjectSpec[] = [
  { id: 'p01', client: 'cl8', editor: 'e01', title: 'Retouching Katalog Fashion 60 Foto',
    description: 'Retouching high-end 60 foto katalog koleksi Lebaran: skin retouch model, koreksi warna kain, dan background putih konsisten.',
    status: 'completed', value: 12_000_000, created: '2026-03-28', started: '2026-04-01', completed: '2026-04-28',
    allowance: 3, consumed: 2,
    included: 'Skin retouch natural, koreksi warna kain sesuai sampel fisik, background putih seragam, hingga 3 ronde revisi minor.',
    excluded: 'Penggantian model/pose, manipulasi bentuk tubuh, penambahan foto di luar 60 frame.',
    contract: { scope: '60 foto katalog fashion siap cetak & web', style: 'Clean commercial, warna akurat ke sampel kain', elements: 'Skin retouch, color matching kain, background putih', days: 20, status: 'closed', approved: '2026-03-30' },
    revisions: [
      { text: 'Warna kerudung di 8 foto masih terlalu gelap dibanding sampel.', ai: 'minor', conf: 0.93, final: 'minor', status: 'resolved', at: '2026-04-14' },
      { text: 'Tolong rapikan helai rambut model di 5 foto close-up.', ai: 'minor', conf: 0.9, final: 'minor', status: 'resolved', at: '2026-04-21' },
    ],
    review: { rating: 5, comment: 'Hasil sangat memuaskan, warna kain akurat dan pengerjaan cepat. Pasti order lagi untuk koleksi berikutnya.' } },
  { id: 'p02', client: 'cl5', editor: 'e11', title: 'Video Company Profile Prakoso Media',
    description: 'Editing video company profile durasi 3 menit dari 4 jam footage: struktur narasi, grading sinematik, subtitle Indonesia-Inggris.',
    status: 'completed', value: 25_000_000, created: '2026-04-20', started: '2026-04-25', completed: '2026-05-15',
    allowance: 2, consumed: 2,
    included: 'Editing hingga 3 menit, grading sinematik, subtitle 2 bahasa, musik berlisensi, 2 ronde revisi minor.',
    excluded: 'Shooting tambahan, animasi logo 3D, versi durasi berbeda.',
    contract: { scope: 'Video company profile 3 menit, master 4K + versi 1080p', style: 'Sinematik korporat, tone warm', elements: 'Narasi CEO, footage kantor & tim, subtitle bilingual', days: 15, status: 'closed', approved: '2026-04-22' },
    revisions: [
      { text: 'Potong bagian sambutan CEO 10 detik, terasa terlalu panjang.', ai: 'minor', conf: 0.88, final: 'minor', status: 'resolved', at: '2026-05-05' },
      { text: 'Tambahkan segmen baru profil divisi logistik (footage baru dari kami).', ai: 'major', conf: 0.91, final: 'major', price: 1_500_000, status: 'resolved', at: '2026-05-09' },
    ],
    review: { rating: 4, comment: 'Kualitas editing bagus dan komunikatif. Sempat ada tambahan biaya revisi besar, tapi prosesnya transparan.' } },
  { id: 'p03', client: 'cl7', editor: 'e13', title: 'Wedding Highlight Reel — Anisa & Raffi',
    description: 'Highlight video pernikahan 5 menit dari dokumentasi 2 hari acara, gaya sinematik dengan voice-over janji pernikahan.',
    status: 'completed', value: 8_000_000, created: '2026-05-02', started: '2026-05-06', completed: '2026-05-22',
    allowance: 2, consumed: 1,
    included: 'Highlight 5 menit, color grading, audio mixing voice-over, 2 ronde revisi minor.',
    excluded: 'Video full ceremony, same-day-edit, cetak album.',
    contract: { scope: 'Wedding highlight 5 menit siap sosial media', style: 'Sinematik romantis, warm tone', elements: 'Voice-over janji, momen akad & resepsi', days: 12, status: 'closed', approved: '2026-05-04' },
    revisions: [
      { text: 'Ganti lagu latar bagian resepsi dengan pilihan kedua dari list.', ai: 'minor', conf: 0.95, final: 'minor', status: 'resolved', at: '2026-05-16' },
    ],
    review: { rating: 5, comment: 'Klien kami menangis nonton hasilnya. Eksekusi rapi, on-time, komunikasi enak. Terima kasih!' } },
  { id: 'p04', client: 'cl4', editor: 'e21', title: 'Color Grading TVC Minuman 30 detik',
    description: 'Grading iklan TV 30 detik: look vibrant summer, konsistensi 14 shot, deliver rec709 + versi digital.',
    status: 'completed', value: 18_000_000, created: '2026-05-08', started: '2026-05-12', completed: '2026-05-30',
    allowance: 2, consumed: 1,
    included: 'Grading 14 shot, 1 look utama + adaptasi sosial media, 2 ronde revisi minor.',
    excluded: 'Online editing, VFX cleanup, re-conform dari editor lain.',
    contract: { scope: 'TVC 30 detik master rec709 + 9:16 sosial media', style: 'Vibrant summer, saturasi tinggi terkontrol', elements: '14 shot, product hero konsisten', days: 10, status: 'closed', approved: '2026-05-10' },
    revisions: [
      { text: 'Warna kemasan produk di shot 7 dan 9 kurang punchy dibanding shot hero.', ai: 'minor', conf: 0.87, final: 'minor', status: 'resolved', at: '2026-05-24' },
    ],
    review: { rating: 4, comment: 'Look akhir disukai brand manager. Ada satu ronde revisi ekstra soal konsistensi produk tapi hasil akhirnya solid.' } },
  { id: 'p05', client: 'cl3', editor: 'e04', title: 'Retouch 120 Foto Produk E-commerce',
    description: 'Retouching batch 120 foto produk peralatan dapur untuk marketplace: background removal, shadow natural, koreksi eksposur.',
    status: 'completed', value: 6_500_000, created: '2026-04-01', started: '2026-04-03', completed: '2026-04-18',
    allowance: 3, consumed: 0,
    included: 'Background putih marketplace-compliant, natural shadow, hingga 3 ronde revisi minor.',
    excluded: 'Foto ulang produk, 3D render, infografis.',
    contract: { scope: '120 foto produk siap upload marketplace', style: 'Clean pack-shot, shadow lembut', elements: 'Background removal, shadow, eksposur seragam', days: 12, status: 'closed', approved: '2026-04-02' },
    revisions: [],
    review: { rating: 5, comment: 'Nol revisi, semua foto langsung lolos QC marketplace. Kerja sangat teliti.' } },
  { id: 'p06', client: 'cl2', editor: 'e31', title: 'Motion Graphics Explainer Aplikasi 90 detik',
    description: 'Explainer video animasi 2D 90 detik untuk peluncuran aplikasi: storyboard, ilustrasi karakter, animasi, sound design.',
    status: 'completed', value: 15_000_000, created: '2026-05-18', started: '2026-05-22', completed: '2026-06-12',
    allowance: 2, consumed: 2,
    included: 'Storyboard, animasi 90 detik, 2 karakter, voice-over 1 bahasa, 2 ronde revisi minor.',
    excluded: 'Versi bahasa tambahan, karakter di atas 2, cut-down 15/30 detik.',
    contract: { scope: 'Explainer 90 detik 1080p + file project', style: 'Flat design playful, palet brand', elements: 'Storyboard, 2 karakter, VO Indonesia', days: 18, status: 'closed', approved: '2026-05-20' },
    revisions: [
      { text: 'Perbesar teks fitur utama di scene 3, kurang terbaca di mobile.', ai: 'minor', conf: 0.92, final: 'minor', status: 'resolved', at: '2026-06-03' },
      { text: 'Warna baju karakter utama disamakan dengan warna logo baru.', ai: 'minor', conf: 0.85, final: 'minor', status: 'resolved', at: '2026-06-08' },
    ],
    review: { rating: 4, comment: 'Animasi halus dan sesuai brand. Timeline sempat mundur 2 hari tapi dikomunikasikan dengan baik.' } },
  { id: 'p07', client: 'cl5', editor: 'e41', title: 'VFX Compositing Music Video "Senja"',
    description: 'Compositing 22 shot music video: sky replacement, screen replacement, cleanup wire, partikel atmosfer.',
    status: 'in_progress', value: 30_000_000, created: '2026-06-15', started: '2026-06-20',
    allowance: 3, consumed: 0,
    included: '22 shot compositing sesuai shot list terlampir, 3 ronde revisi minor per shot.',
    excluded: 'Shot tambahan di luar list, CG asset 3D baru, grading final.',
    contract: { scope: '22 shot VFX music video, EXR + ProRes', style: 'Naturalistik, golden hour', elements: 'Sky replacement, cleanup, partikel', days: 30, status: 'active', approved: '2026-06-18' },
    revisions: [] },
  { id: 'p08', client: 'cl6', editor: 'e02', title: 'Retouch Foto Kampanye Billboard Properti',
    description: 'Retouching 12 foto arsitektur & lifestyle untuk billboard: sky replacement, penghapusan objek konstruksi, compositing keluarga.',
    status: 'in_progress', value: 9_000_000, created: '2026-06-25', started: '2026-06-28',
    allowance: 2, consumed: 1,
    included: '12 foto final print-ready 300dpi, 2 ronde revisi minor.',
    excluded: 'Foto ulang lokasi, perubahan konsep kreatif, desain layout billboard.',
    contract: { scope: '12 foto kampanye print-ready', style: 'Bright & aspirational', elements: 'Sky replacement, object removal, compositing', days: 14, status: 'active', approved: '2026-06-26' },
    revisions: [
      { text: 'Langit di foto utama diganti ke varian sore hari seperti moodboard.', ai: 'minor', conf: 0.89, final: 'minor', status: 'accepted', at: '2026-07-04' },
    ] },
  { id: 'p09', client: 'cl1', editor: 'e15', title: 'Video Dokumentasi Grand Opening Pabrik',
    description: 'Editing dokumentasi grand opening: aftermovie 4 menit + 3 klip sosial media vertikal dari footage 2 kamera.',
    status: 'in_progress', value: 14_000_000, created: '2026-06-27', started: '2026-07-01',
    allowance: 2, consumed: 0,
    included: 'Aftermovie 4 menit, 3 klip 9:16, grading, musik berlisensi, 2 ronde revisi minor.',
    excluded: 'Multicam sync di luar 2 kamera, drone footage tambahan.',
    contract: { scope: 'Aftermovie + 3 klip vertikal', style: 'Energik korporat', elements: 'Sambutan direksi, tur fasilitas, testimoni', days: 12, status: 'active', approved: '2026-06-29' },
    revisions: [] },
  { id: 'p10', client: 'cl2', editor: 'e24', title: 'Color Grading Film Pendek "Rumah Kaca"',
    description: 'Grading film pendek 18 menit untuk submission festival: look moody teal, konsistensi 120 shot, deliver DCP-ready.',
    status: 'in_review', value: 11_000_000, created: '2026-06-05', started: '2026-06-10',
    allowance: 2, consumed: 1,
    included: 'Grading 18 menit, 1 look utama, konsultasi look 1 sesi, 2 ronde revisi minor.',
    excluded: 'Pembuatan DCP final, VFX, conform ulang.',
    contract: { scope: 'Film pendek 18 menit graded, ProRes 4444', style: 'Moody teal-orange restrained', elements: '120 shot, day/night interior', days: 15, status: 'active', approved: '2026-06-08' },
    revisions: [
      { text: 'Scene interior malam (menit 09–12) dinaikkan sedikit exposure, detail bayangan hilang di proyektor.', ai: 'minor', conf: 0.9, final: 'minor', status: 'resolved', at: '2026-06-26' },
    ] },
  { id: 'p11', client: 'cl8', editor: 'e33', title: 'Motion Bumper Fashion Show 15 detik',
    description: 'Bumper pembuka fashion show: animasi logo, tipografi koleksi, transisi kain digital.',
    status: 'revision', value: 7_500_000, created: '2026-06-18', started: '2026-06-22',
    allowance: 2, consumed: 1,
    included: 'Bumper 15 detik 4K, 2 alternatif musik, 2 ronde revisi minor.',
    excluded: 'Versi durasi lain, animasi 3D logo, konten LED stage tambahan.',
    contract: { scope: 'Bumper 15 detik 4K landscape + versi square', style: 'Elegan high-fashion, gold on black', elements: 'Logo animation, tipografi, simulasi kain', days: 10, status: 'active', approved: '2026-06-20' },
    revisions: [
      { text: 'Gerakan kain di detik 8 terlalu cepat, tolong lebih mengalir mengikuti musik.', ai: 'minor', conf: 0.86, final: 'minor', status: 'in_progress', at: '2026-07-05' },
    ] },
  { id: 'p12', client: 'cl3', editor: 'e07', title: 'Retouch 40 Foto Katalog Perhiasan',
    description: 'High-end retouching 40 foto perhiasan emas & berlian: dust cleanup, penajaman refleksi, koreksi warna logam.',
    status: 'disputed', value: 10_000_000, created: '2026-06-08', started: '2026-06-12',
    allowance: 2, consumed: 2,
    included: 'Dust & scratch cleanup, koreksi warna logam ke standar brand, 2 ronde revisi minor.',
    excluded: 'Penggantian batu permata secara digital, re-modeling bentuk perhiasan.',
    contract: { scope: '40 foto perhiasan siap katalog premium', style: 'Luxury, refleksi tajam terkontrol', elements: 'Cleanup, koreksi warna emas, penajaman berlian', days: 15, status: 'active', approved: '2026-06-10' },
    revisions: [
      { text: 'Kilau berlian kurang keluar di 12 foto, tolong lebih berkilau.', ai: 'minor', conf: 0.72, final: 'minor', status: 'resolved', at: '2026-06-22' },
      { text: 'Bentuk cincin di 6 foto terlihat kurang simetris, mohon diperbaiki bentuknya.', ai: 'major', conf: 0.68, status: 'disputed', at: '2026-07-01' },
    ] },
  { id: 'p13', client: 'cl1', editor: 'e16', title: 'Video Profil Sekolah Bina Bangsa',
    description: 'Video profil sekolah 5 menit untuk penerimaan siswa baru: editing dari footage internal + motion graphics statistik.',
    status: 'awaiting_dp', value: 13_000_000, created: '2026-07-03',
    allowance: 2, consumed: 0,
    included: 'Video 5 menit, motion graphics statistik, subtitle, 2 ronde revisi minor.',
    excluded: 'Shooting baru, drone, versi bahasa Inggris.',
    contract: { scope: 'Video profil 5 menit 1080p', style: 'Hangat dan meyakinkan orang tua', elements: 'Fasilitas, kegiatan siswa, testimoni alumni', days: 14, status: 'pending_client_approval' },
    revisions: [] },
  { id: 'p14', client: 'cl7', editor: 'e05', title: 'Restorasi 30 Foto Arsip Keluarga',
    description: 'Restorasi dan pewarnaan 30 foto keluarga era 1970-an untuk hadiah ulang tahun pernikahan emas.',
    status: 'cancelled', value: 4_000_000, created: '2026-05-25', started: '2026-05-28',
    allowance: 2, consumed: 0,
    included: 'Restorasi sobekan & noda, pewarnaan natural, cetak-ready 300dpi.',
    excluded: 'Rekonstruksi wajah yang hilang total, penambahan orang.',
    contract: { scope: '30 foto arsip terestorasi & diwarnai', style: 'Natural period-accurate', elements: 'Repair fisik, colorization, upscale', days: 20, status: 'rejected' },
    revisions: [] },
]

// Konversi id editor (e01) → id user (ed01) — penomoran seed dasar sejajar.
const editorUserId = (editorId: string) => `ed${editorId.slice(1)}`

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const users = await prisma.user.findMany({ select: { user_id: true, full_name: true, role: true } })
  const nameOf = new Map(users.map(u => [u.user_id, u.full_name]))
  if (!nameOf.has('hr1') || !nameOf.has('ed50')) {
    console.error('❌ Akun inti tidak ditemukan. Jalankan `npm run prisma:seed` dulu.')
    process.exit(1)
  }
  const editors = await prisma.editor.findMany({ orderBy: { editor_id: 'asc' } })
  const editorById = new Map(editors.map(e => [e.editor_id, e]))

  // ── Wipe transaksional (anak dulu, lalu induk) ────────────────────────────
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
  await prisma.user.deleteMany({ where: { role: UserRole.client } })
  console.log('🧹 Tabel transaksional dikosongkan.')

  // ── Klien (role client — nonaktif di gerbang login, hanya untuk data) ─────
  const password_hash = await bcrypt.hash(DEFAULT_PASSWORD!, 10)
  for (const c of CLIENTS) {
    await prisma.user.create({
      data: {
        user_id: c.id, full_name: c.name, email: c.email,
        username: c.email.split('@')[0]! + '.' + c.id,
        password_hash, role: UserRole.client, is_active: false,
      },
    })
  }
  console.log(`🤝 ${CLIENTS.length} klien dibuat.`)

  // ── Cuti / izin ───────────────────────────────────────────────────────────
  const leaveDays = new Map<string, Set<string>>() // user → tanggal cuti approved
  for (const l of LEAVE_PLAN) {
    if (l.status === 'approved') {
      const set = leaveDays.get(l.user) ?? new Set<string>()
      for (const day of workingDays(l.start, l.end)) set.add(day)
      leaveDays.set(l.user, set)
    }
    await prisma.leaveRequest.create({
      data: {
        requester_id: l.user, requester_name: nameOf.get(l.user)!, requester_role: l.role,
        leave_type: l.type, start_date: d(l.start), end_date: d(l.end), status: l.status,
        created_at: t(l.filed, '09:30'),
      },
    })
  }
  console.log(`🏖️  ${LEAVE_PLAN.length} pengajuan cuti/izin.`)

  // ── Presensi: 1 Juni – 6 Juli, 56 staf ────────────────────────────────────
  const days = workingDays('2026-06-01', '2026-07-06')
  const incompleteByKey = new Map(INCOMPLETE_CASES.map(c => [`${c.user}|${c.date}`, c]))
  const records: Prisma.AttendanceRecordCreateManyInput[] = []
  for (const [ui, user] of STAFF_IDS.entries()) {
    for (const [di, day] of days.entries()) {
      const seed = ui * 1000 + di
      const special = incompleteByKey.get(`${user}|${day}`)
      if (special) {
        const inAt = t(day, hm(8, 35 + Math.floor(rnd(seed) * 20)))
        const base = {
          user_id: user, date: d(day), clock_in: inAt, clock_out: null,
          user_explanation: special.explanation ?? null,
          proposed_clock_out: special.proposed ? t(day, special.proposed) : null,
        }
        if (special.review === 'pending') {
          records.push({ ...base, status: AttendanceStatus.incomplete, review: AttendanceReview.pending })
        } else if (special.review === 'approved') {
          records.push({
            ...base, status: AttendanceStatus.present, review: AttendanceReview.approved,
            adjusted_clock_out: t(day, special.proposed!), adjusted_by_id: 'hr1',
            adjusted_at: t(day, '18:30'), adjustment_note: special.note ?? null,
          })
        } else {
          records.push({
            ...base, status: AttendanceStatus.absent, review: AttendanceReview.rejected,
            adjusted_by_id: 'hr1', adjusted_at: t(day, '18:30'), adjustment_note: special.note ?? null,
          })
        }
        continue
      }
      if (leaveDays.get(user)?.has(day)) {
        records.push({ user_id: user, date: d(day), status: AttendanceStatus.leave, review: AttendanceReview.none })
        continue
      }
      const r = rnd(seed)
      if (r < 0.03) {
        records.push({ user_id: user, date: d(day), status: AttendanceStatus.absent, review: AttendanceReview.none })
      } else if (r < 0.13) {
        const inAt = t(day, hm(9, 5 + Math.floor(rnd(seed + 1) * 45)))
        const outAt = t(day, hm(17, 5 + Math.floor(rnd(seed + 2) * 35)))
        records.push({ user_id: user, date: d(day), clock_in: inAt, clock_out: outAt, status: AttendanceStatus.late, review: AttendanceReview.none })
      } else {
        const inAt = t(day, hm(8, 28 + Math.floor(rnd(seed + 1) * 30)))
        const outAt = t(day, hm(17, 1 + Math.floor(rnd(seed + 2) * 44)))
        records.push({ user_id: user, date: d(day), clock_in: inAt, clock_out: outAt, status: AttendanceStatus.present, review: AttendanceReview.none })
      }
    }
  }
  await prisma.attendanceRecord.createMany({ data: records })
  console.log(`🕐 ${records.length} catatan presensi (${days.length} hari kerja × ${STAFF_IDS.length} staf).`)

  // ── Sesi presensi (riwayat Buka Presensi oleh HR) ─────────────────────────
  const sessions: Prisma.AttendanceSessionCreateManyInput[] = []
  for (const [di, day] of days.entries()) {
    sessions.push({
      date: d(day), type: AttendanceSessionType.masuk, code: code6(di * 2 + 1),
      duration_minutes: 45, opened_by_id: 'hr1',
      opened_at: t(day, '08:15'), expires_at: t(day, '09:00'),
    })
    sessions.push({
      date: d(day), type: AttendanceSessionType.keluar, code: code6(di * 2 + 2),
      duration_minutes: 45, opened_by_id: 'hr1',
      opened_at: t(day, '16:55'), expires_at: t(day, '17:40'),
    })
  }
  await prisma.attendanceSession.createMany({ data: sessions })
  console.log(`🔑 ${sessions.length} sesi presensi (masuk/keluar per hari).`)

  // ── Peringatan kerja ──────────────────────────────────────────────────────
  for (const w of WARNINGS) {
    await prisma.warning.create({
      data: {
        target_user_id: w.target, target_name: nameOf.get(w.target)!, target_role: w.role,
        reason: w.reason, severity: w.severity, status: w.status,
        issued_by_id: w.issuer, issued_at: t(w.issued, '10:00'), expires_at: t(w.expires, '23:59'),
      },
    })
  }
  console.log(`⚠️  ${WARNINGS.length} peringatan kerja.`)

  // ── Rekrutmen: lowongan + pelamar legacy ──────────────────────────────────
  for (const j of JOB_POSTINGS) {
    const count = APPLICANTS.filter(a => a.job === j.job_id).length
    await prisma.jobPosting.create({
      data: { job_id: j.job_id, title: j.title, specialization: j.specialization, status: j.status, created_at: t(j.created, '09:00'), applicant_count: count },
    })
  }
  for (const [i, a] of APPLICANTS.entries()) {
    await prisma.applicant.create({
      data: {
        job_id: a.job, name: a.name, email: a.email, tahap: a.tahap, score: a.score,
        portfolio_url: `https://portfolio.example.id/${a.email.split('@')[0]}`,
        created_at: t(a.created, hm(9, 10 + i * 3)),
        offer_accepted_at: a.tahap === 'offer_accepted' || a.tahap === 'confirmed' ? t(a.created, '15:00') : null,
      },
    })
  }
  console.log(`📢 ${JOB_POSTINGS.length} lowongan + ${APPLICANTS.length} pelamar (pipeline).`)

  // ── Lamaran publik (JobApplication, CV PDF valid) ─────────────────────────
  for (const a of APPLICATIONS) {
    const cv = buildCvPdf([
      `CURRICULUM VITAE`, ``,
      `Nama            : ${a.name}`,
      `Email           : ${a.email}`,
      `Telepon         : ${a.phone}`,
      `Usia            : ${a.age} tahun`,
      `Pendidikan      : ${a.education}`,
      a.gpa > 0 ? `IPK             : ${a.gpa.toFixed(2)} (lulus ${a.gradYear})` : `Lulus           : ${a.gradYear}`,
      ``,
      `KEAHLIAN`,
      ...a.skills.map(s => `  - ${s}`),
      ``,
      `RINGKASAN`,
      `Melamar posisi di departemen ${a.dept} Manava.`,
    ])
    await prisma.jobApplication.create({
      data: {
        full_name: a.name, email: a.email, phone: a.phone, age: a.age,
        education: a.education, gpa: a.gpa > 0 ? a.gpa : null, graduation_year: a.gradYear,
        skills: a.skills,
        cv_name: `CV_${a.name.replace(/ /g, '_')}.pdf`, cv_mime: 'application/pdf', cv_data: cv,
        ai_summary: a.summary, ai_source: a.source, ai_confidence: a.confidence,
        ai_department: a.dept, ai_meets_criteria: a.meets,
        status: a.status,
        invited_at: a.invited ? t(a.invited, '10:00') : null,
        interview_email: a.invited
          ? `Halo ${a.name},\n\nTerima kasih telah melamar di Manava. Kami mengundang Anda untuk sesi wawancara posisi ${a.dept}.\n\nJadwal akan dikonfirmasi tim HR melalui email ini.\n\nSalam,\nTim Rekrutmen Manava`
          : null,
        decided_at: a.decided ? t(a.decided, '14:00') : null,
        submitted_at: t(a.submitted, '11:20'),
      },
    })
  }
  console.log(`📄 ${APPLICATIONS.length} lamaran publik dengan CV PDF.`)

  // ── Proyek + kontrak + revisi + chat + escrow + transaksi + review ────────
  let msgCount = 0
  let trxCount = 0
  for (const p of PROJECTS) {
    const editor = editorById.get(p.editor)!
    const client = CLIENTS.find(c => c.id === p.client)!
    const clientLabel = `${client.name} — ${client.company}`
    const dp = p.value / 2
    const createdAt = t(p.created, '10:00')

    await prisma.project.create({
      data: {
        project_id: p.id, client_id: client.id, client_name: clientLabel,
        editor_id: editor.editor_id, editor_name: editor.full_name,
        title: p.title, description: p.description, status: p.status,
        dp_amount: dp, final_amount: dp, project_value: p.value,
        started_at: p.started ? t(p.started, '09:00') : null,
        completed_at: p.completed ? t(p.completed, '16:00') : null,
        created_at: createdAt,
      },
    })
    await prisma.revisionEnvelope.create({
      data: {
        project_id: p.id, included_scope: p.included, excluded_scope: p.excluded,
        allowance_count: p.allowance, allowance_consumed: p.consumed,
      },
    })
    await prisma.contract.create({
      data: {
        project_id: p.id, scope: p.contract.scope, style: p.contract.style,
        key_elements: p.contract.elements, estimated_duration_days: p.contract.days,
        project_value: p.value, status: p.contract.status,
        issued_at: createdAt,
        approved_at: p.contract.approved ? t(p.contract.approved, '13:00') : null,
      },
    })
    for (const r of p.revisions) {
      await prisma.revisionRequest.create({
        data: {
          project_id: p.id, request_text: r.text, ai_label: r.ai, ai_confidence: r.conf,
          final_label: r.final ?? null, price: r.price ?? null, status: r.status,
          created_at: t(r.at, '11:00'),
        },
      })
    }

    // Percakapan proyek — bervariasi mengikuti status.
    const conv: Array<{ sender: string; role: UserRole; type: MessageType; body: string; at: Date }> = []
    const edUser = editorUserId(editor.editor_id)
    conv.push({ sender: 'sa1', role: 'superadmin', type: 'system', body: `Proyek "${p.title}" dibuat. Menunggu persetujuan kontrak dan pembayaran DP 50%.`, at: createdAt })
    conv.push({ sender: client.id, role: 'client', type: 'brief', body: `Brief: ${p.description}`, at: t(p.created, '10:30') })
    if (p.started) {
      conv.push({ sender: 'sa1', role: 'superadmin', type: 'system', body: 'DP 50% diterima dan ditahan di escrow. Pengerjaan dimulai.', at: t(p.started, '09:00') })
      conv.push({ sender: edUser, role: 'editor', type: 'text', body: 'Terima kasih, brief sudah saya pelajari. Saya mulai kerjakan hari ini dan akan update progres berkala di sini.', at: t(p.started, '09:45') })
      conv.push({ sender: client.id, role: 'client', type: 'text', body: 'Siap, ditunggu previewnya. Kalau ada yang kurang jelas dari brief langsung tanya saja ya.', at: t(p.started, '10:20') })
    }
    for (const [ri, r] of p.revisions.entries()) {
      conv.push({ sender: edUser, role: 'editor', type: 'deliverable', body: `Preview ronde ${ri + 1} sudah saya unggah, silakan direview.`, at: t(r.at, '09:30') })
      conv.push({ sender: client.id, role: 'client', type: 'revision_request', body: r.text, at: t(r.at, '11:00') })
      conv.push({ sender: 'sa1', role: 'superadmin', type: 'ai_summary', body: `Klasifikasi AI: revisi ${r.ai === 'major' ? 'MAJOR (berbayar)' : r.ai === 'minor' ? 'MINOR (gratis, dalam allowance)' : 'TIDAK PASTI (perlu review mediator)'} — confidence ${(r.conf * 100).toFixed(0)}%.`, at: t(r.at, '11:05') })
    }
    if (p.completed) {
      conv.push({ sender: edUser, role: 'editor', type: 'deliverable', body: 'File final sudah diunggah lengkap dengan seluruh format yang disepakati. Terima kasih atas kerjasamanya!', at: t(p.completed, '14:00') })
      conv.push({ sender: client.id, role: 'client', type: 'text', body: 'Sudah kami terima dan cek semua, hasilnya bagus. Pembayaran final segera kami proses.', at: t(p.completed, '15:30') })
      conv.push({ sender: 'sa1', role: 'superadmin', type: 'system', body: 'Pembayaran final diterima. Dana escrow dirilis ke perusahaan. Proyek selesai.', at: t(p.completed, '16:00') })
    }
    if (p.status === 'cancelled') {
      conv.push({ sender: client.id, role: 'client', type: 'text', body: 'Mohon maaf, karena kondisi keluarga proyek ini kami batalkan dulu. Bagaimana prosedur refund DP-nya?', at: t('2026-06-02', '09:00') })
      conv.push({ sender: 'sa1', role: 'superadmin', type: 'system', body: 'Proyek dibatalkan atas permintaan klien. Refund DP diproses sesuai ketentuan.', at: t('2026-06-03', '10:00') })
    }
    for (const m of conv) {
      await prisma.message.create({
        data: { project_id: p.id, sender_id: m.sender, sender_name: nameOf.get(m.sender) ?? client.name, sender_role: m.role, body: m.body, message_type: m.type, created_at: m.at },
      })
    }
    msgCount += conv.length

    if (p.review && p.completed) {
      await prisma.review.create({
        data: { project_id: p.id, rating: p.review.rating, comment: p.review.comment, reviewer_name: clientLabel, created_at: t(p.completed, '17:30') },
      })
    }

    // Escrow + transaksi konsisten dengan status proyek.
    const held = p.status === 'completed' ? 0 : p.status === 'awaiting_dp' || p.status === 'cancelled' ? 0 : dp
    const released = p.status === 'completed' ? p.value : 0
    const refunded = p.status === 'cancelled' ? dp : 0
    await prisma.escrowAccount.create({
      data: { project_id: p.id, project_title: p.title, client_name: clientLabel, held_balance: held, released_balance: released, refunded_balance: refunded },
    })
    const trx: Array<{ type: TransactionType; amount: number; status: TransactionStatus; at: Date }> = []
    if (p.status === 'awaiting_dp') {
      trx.push({ type: 'dp_payment', amount: dp, status: 'pending', at: createdAt })
    } else if (p.started) {
      trx.push({ type: 'dp_payment', amount: dp, status: 'success', at: t(p.started, '08:30') })
      trx.push({ type: 'escrow_hold', amount: dp, status: 'success', at: t(p.started, '08:31') })
    }
    for (const r of p.revisions) {
      if (r.final === 'major' && r.price) trx.push({ type: 'major_topup', amount: r.price, status: 'success', at: t(r.at, '15:00') })
    }
    if (p.completed) {
      trx.push({ type: 'final_payment', amount: dp, status: 'success', at: t(p.completed, '15:45') })
      trx.push({ type: 'escrow_release', amount: p.value, status: 'success', at: t(p.completed, '16:00') })
    }
    if (p.status === 'cancelled') {
      trx.push({ type: 'refund', amount: dp, status: 'success', at: t('2026-06-03', '11:00') })
    }
    for (const x of trx) {
      await prisma.transaction.create({
        data: { project_id: p.id, project_title: p.title, type: x.type, amount: x.amount, status: x.status, created_at: x.at },
      })
    }
    trxCount += trx.length
  }
  console.log(`📁 ${PROJECTS.length} proyek + kontrak/revisi/escrow, ${msgCount} pesan, ${trxCount} transaksi.`)

  // ── Sengketa ──────────────────────────────────────────────────────────────
  const p12 = PROJECTS.find(p => p.id === 'p12')!
  const p04 = PROJECTS.find(p => p.id === 'p04')!
  await prisma.dispute.create({
    data: {
      project_id: 'p12', project_title: p12.title,
      client_name: 'Anton Salim — CV Mitra Visual', editor_name: editorById.get('e07')!.full_name,
      opened_by: 'Anton Salim', opened_by_role: DisputeOpenerRole.client,
      reason: 'Klien menganggap perbaikan simetri cincin adalah revisi minor (koreksi kualitas), sementara klasifikasi AI dan editor menilai re-modeling bentuk sebagai revisi major berbayar di luar scope.',
      evidence: ['https://files.manava.id/disputes/p12/perbandingan-foto-cincin.pdf', 'https://files.manava.id/disputes/p12/brief-awal.pdf'],
      status: DisputeStatus.in_mediation,
      opened_at: t('2026-07-02', '09:15'), sla_deadline: t('2026-07-09', '17:00'),
    },
  })
  await prisma.dispute.create({
    data: {
      project_id: 'p04', project_title: p04.title,
      client_name: 'Maria Tanuwijaya — Tanu Films', editor_name: editorById.get('e21')!.full_name,
      opened_by: 'Maria Tanuwijaya', opened_by_role: DisputeOpenerRole.client,
      reason: 'Klien keberatan revisi konsistensi warna kemasan dianggap menghabiskan jatah allowance karena merasa itu kesalahan grading awal.',
      evidence: ['https://files.manava.id/disputes/p04/still-shot7-shot9.png'],
      status: DisputeStatus.resolved, resolution_type: DisputeResolutionType.free_revision,
      resolution_note: 'Mediator memutuskan revisi dikerjakan tanpa memotong allowance — deviasi warna terukur di atas toleransi kontrak. Editor menyelesaikan dalam 2 hari.',
      opened_at: t('2026-05-25', '10:00'), resolved_at: t('2026-05-28', '15:00'),
      sla_deadline: t('2026-06-01', '17:00'),
    },
  })
  console.log('⚖️  2 sengketa (1 mediasi berjalan, 1 selesai).')

  // ── Slip gaji: April, Mei (paid) & Juni (finalized) ───────────────────────
  const BONUS: Record<string, Record<string, number>> = {
    '2026-04': { e01: 1_200_000, e04: 650_000 },
    '2026-05': { e11: 2_500_000, e13: 800_000, e21: 1_800_000 },
    '2026-06': { e31: 1_500_000 },
  }
  const PERIODS = [
    { key: '2026-04', start: '2026-04-01', end: '2026-04-30', status: PayslipStatus.paid, gen: '2026-05-01' },
    { key: '2026-05', start: '2026-05-01', end: '2026-05-31', status: PayslipStatus.paid, gen: '2026-06-01' },
    { key: '2026-06', start: '2026-06-01', end: '2026-06-30', status: PayslipStatus.finalized, gen: '2026-07-01' },
  ]
  const payslips: Prisma.PayslipCreateManyInput[] = []
  for (const [pi, period] of PERIODS.entries()) {
    for (const [i, e] of editors.entries()) {
      const seed = pi * 100 + i
      const deduction = rnd(seed) < 0.25 ? Math.floor(rnd(seed + 1) * 4) * 100_000 + 100_000 : 0
      const bonus = BONUS[period.key]?.[e.editor_id] ?? 0
      const reimburse = rnd(seed + 2) < 0.15 ? Math.floor(rnd(seed + 3) * 3) * 100_000 + 100_000 : 0
      payslips.push({
        editor_id: e.editor_id, editor_name: e.full_name,
        period_start: d(period.start), period_end: d(period.end),
        base_salary: e.base_salary, attendance_deduction: deduction,
        project_bonus: bonus, reimbursement_total: reimburse,
        net_salary: e.base_salary - deduction + bonus + reimburse,
        status: period.status, generated_at: t(period.gen, '08:00'),
      })
    }
  }
  await prisma.payslip.createMany({ data: payslips })
  console.log(`💰 ${payslips.length} slip gaji (April–Juni, 50 editor).`)

  // ── Sinkronkan active_projects editor ─────────────────────────────────────
  const activeCount = new Map<string, number>()
  for (const p of PROJECTS) {
    if (['in_progress', 'in_review', 'revision', 'disputed'].includes(p.status)) {
      activeCount.set(p.editor, (activeCount.get(p.editor) ?? 0) + 1)
    }
  }
  await prisma.editor.updateMany({ data: { active_projects: 0 } })
  for (const [editorId, count] of activeCount) {
    await prisma.editor.update({ where: { editor_id: editorId }, data: { active_projects: count } })
  }
  console.log(`🎯 active_projects disinkronkan untuk ${activeCount.size} editor.`)

  // ── KPI snapshots: 6 bulan (Jan–Jun 2026) per editor ──────────────────────
  // Bulan Jun 2026 dikunci ke nilai KPI saat ini (dari EditorMetrics), lalu
  // mundur ke belakang dengan drift kecil deterministik — supaya tren
  // bulan-ke-bulan halus dan konsisten dengan snapshot Q2 yang tampil.
  const PERIODS_KPI = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06']
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
  const snapshots: Prisma.KpiSnapshotCreateManyInput[] = []
  for (const [ei, e] of editors.entries()) {
    const metrics = await prisma.editorMetrics.findUnique({ where: { editor_id: e.editor_id } })
    if (!metrics) continue
    for (const [pi, period] of PERIODS_KPI.entries()) {
      // pi=5 (Juni) → snapshot = nilai sekarang. Bulan sebelumnya = nilai
      // sekarang ± drift kecil, diarahkan naik agar tren terlihat berkembang.
      const monthsBack = PERIODS_KPI.length - 1 - pi
      const trendPush = monthsBack * 0.04  // penurunan ke belakang
      const jitter = (rnd(ei * 17 + pi * 3) - 0.5) * 0.25
      const rating = pi === PERIODS_KPI.length - 1
        ? metrics.avg_client_rating
        : clamp(round1(metrics.avg_client_rating - trendPush + jitter), 2.5, 5.0)
      const completion = pi === PERIODS_KPI.length - 1
        ? metrics.completion_rate
        : clamp(Math.round(metrics.completion_rate - monthsBack * 1.4 + (rnd(ei * 11 + pi) - 0.5) * 6), 60, 100)
      const mgr = pi === PERIODS_KPI.length - 1
        ? metrics.manager_rating
        : clamp(round1(metrics.manager_rating - trendPush + (rnd(ei * 23 + pi * 5) - 0.5) * 0.3), 2.5, 5.0)
      const kpi = round1((rating + (completion / 100) * 5 + mgr) / 3)
      snapshots.push({
        editor_id: e.editor_id, department: e.department, period,
        avg_client_rating: rating, completion_rate: completion,
        manager_rating: mgr, kpi_average: kpi,
      })
    }
  }
  await prisma.kpiSnapshot.createMany({ data: snapshots })
  console.log(`📈 ${snapshots.length} KPI snapshot (${PERIODS_KPI.length} bulan × ${editors.length} editor).`)

  console.log('\n✅ Demo seed selesai — semua tabel terisi data bervariasi dengan riwayat.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
