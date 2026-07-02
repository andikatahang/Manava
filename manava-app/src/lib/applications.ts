// Public job-application store. No backend in this build, so submissions are
// persisted in localStorage and surfaced to the HR admin from there. A cookie
// guards against a candidate submitting the same vacancy twice.

export type ApplicationStatus = 'pending' | 'interview' | 'accepted' | 'rejected'

export interface InterviewInfo {
  interviewer: string
  datetime: string
  mode: 'online' | 'offline'
  location?: string
  notes?: string
  sent_at: string
}

export interface JobApplication {
  id: string
  full_name: string
  email: string
  age: number
  phone: string
  education: string
  gpa: number
  graduation_year: number
  skills: string[]
  cv_name: string
  status: ApplicationStatus
  submitted_at: string
  interview?: InterviewInfo
}

const STORAGE_KEY = 'manava_applications'

// Bump this when a new vacancy opens — candidates may then apply again.
export const CURRENT_VACANCY_ID = 'vac-2026-06'
const COOKIE_KEY = `manava_applied_${CURRENT_VACANCY_ID}`

const SEED: JobApplication[] = [
  {
    id: 'app-seed-1', full_name: 'Dimas Pratama', email: 'dimas.pratama@mail.com',
    age: 24, phone: '+62 812-1111-2222', education: 'S1', gpa: 3.62, graduation_year: 2024,
    skills: ['Product Retouch', 'Color Correction'], cv_name: 'CV_Dimas_Pratama.pdf',
    status: 'pending', submitted_at: '2026-06-25T09:12:00.000Z',
  },
  {
    id: 'app-seed-2', full_name: 'Anindya Rahmawati', email: 'anindya.r@mail.com',
    age: 27, phone: '+62 813-3333-4444', education: 'S1', gpa: 3.81, graduation_year: 2021,
    skills: ['Video Edit', 'Motion Graphics'], cv_name: 'CV_Anindya.pdf',
    status: 'interview', submitted_at: '2026-06-23T14:40:00.000Z',
    interview: {
      interviewer: 'Eko Manager', datetime: '2026-06-30T10:00', mode: 'online',
      sent_at: '2026-06-24T08:00:00.000Z',
    },
  },
  {
    id: 'app-seed-3', full_name: 'Rangga Saputra', email: 'rangga.s@mail.com',
    age: 22, phone: '+62 815-5555-6666', education: 'D3', gpa: 3.40, graduation_year: 2025,
    skills: ['BG Removal', 'Portrait Retouch'], cv_name: 'CV_Rangga.pdf',
    status: 'pending', submitted_at: '2026-06-26T11:05:00.000Z',
  },
]

function read(): JobApplication[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as JobApplication[]
  } catch {
    // corrupt storage — fall through to seed
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED))
  return SEED
}

function write(apps: JobApplication[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps))
}

export function getApplications(): JobApplication[] {
  return read().sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))
}

export function addApplication(
  data: Omit<JobApplication, 'id' | 'status' | 'submitted_at'>,
): JobApplication {
  const app: JobApplication = {
    ...data,
    id: `app-${Date.now()}`,
    status: 'pending',
    submitted_at: new Date().toISOString(),
  }
  write([app, ...read()])
  return app
}

export function updateApplication(id: string, patch: Partial<JobApplication>): JobApplication[] {
  const next = read().map(a => (a.id === id ? { ...a, ...patch } : a))
  write(next)
  return next.sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))
}

// ── Cookie guard ──────────────────────────────────────────────────────────
export function hasApplied(): boolean {
  return document.cookie.split('; ').some(c => c.startsWith(`${COOKIE_KEY}=`))
}

export function markApplied(): void {
  const maxAge = 60 * 60 * 24 * 90 // 90 days
  document.cookie = `${COOKIE_KEY}=1; path=/; max-age=${maxAge}; SameSite=Lax`
}

export const SKILL_OPTIONS = [
  'Product Retouch', 'Color Correction', 'Portrait Retouch', 'BG Removal',
  'Video Edit', 'Color Grading', 'Motion Graphics', 'VFX',
]

export const EDUCATION_OPTIONS = ['SMA/SMK', 'D3', 'D4', 'S1', 'S2', 'S3']
