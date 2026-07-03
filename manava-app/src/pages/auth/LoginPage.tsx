import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import logoLight from '../../assets/logo-light.png'
import logoDark from '../../assets/logo-dark.png'
import type { UserRole } from '../../types'

// Demo accounts seeded by manava-api (prisma/seed.ts). Selecting one
// pre-fills the form; authentication still goes through the real backend.
// Hanya role aktif — client, mediator, dan finance dinonaktifkan sementara.
const DEMO_PASSWORD = 'manava123'
const demoAccounts: { role: UserRole; email: string; label: string; desc: string }[] = [
  { role: 'superadmin',    email: 'admin@manava.id', label: 'Superadmin',    desc: 'Akun, role, parameter sistem' },
  { role: 'hr_admin',      email: 'hasna@manava.id', label: 'HR Admin',      desc: 'ATS, departemen, peringatan' },
  { role: 'admin_manager', email: 'eko@manava.id',   label: 'Admin Manager', desc: 'Tim, KPI, persetujuan cuti' },
  { role: 'editor',        email: 'budi@manava.id',  label: 'Editor',        desc: 'Kerjakan proyek & ESS' },
]

interface LoginPageProps { onLogin: (identifier: string, password: string) => Promise<unknown> }

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [identifier, setIdentifier] = useState('hasna@manava.id')
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const reduceMotion = useReducedMotion()

  const selectedDemo = demoAccounts.find(a => a.email === identifier)

  function pickDemo(account: (typeof demoAccounts)[number]) {
    setIdentifier(account.email)
    setPassword(DEMO_PASSWORD)
    setError('')
  }

  async function handleSubmit() {
    if (!identifier.trim() || !password) {
      setError('Email/username dan kata sandi wajib diisi.')
      return
    }
    setIsSubmitting(true)
    setError('')
    try {
      await onLogin(identifier.trim(), password)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login gagal'
      setError(
        message === 'Invalid credentials'
          ? 'Email atau kata sandi salah.'
          : message === 'Role dinonaktifkan'
            ? 'Akun ini memakai role yang sedang dinonaktifkan.'
            : `Tidak dapat masuk: ${message}`,
      )
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-primary flex">
      {/* Left panel */}
      <div className="relative hidden lg:flex flex-col justify-between w-[44%] bg-navy p-12 overflow-hidden">
        {/* ambient auto-rotating glow */}
        {!reduceMotion && (
          <>
            <motion.div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2"
              style={{
                background:
                  'conic-gradient(from 0deg at 50% 50%, rgba(0,80,248,0) 0deg, rgba(0,80,248,0.38) 110deg, rgba(208,241,0,0.14) 210deg, rgba(0,80,248,0) 340deg)',
                filter: 'blur(60px)',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 38, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(208,241,0,0.16) 0%, rgba(2,21,38,0) 70%)' }}
              animate={{ y: [0, -28, 0], scale: [1, 1.12, 1] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            />
          </>
        )}

        <img src={logoLight} alt="Manava" className="relative z-10 h-8 w-auto object-contain object-left" />
        <div className="relative z-10">
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-5">
            Revisi yang adil.<br />Bayaran yang adil.<br />Hasil yang adil.
          </h2>
        </div>
        <div className="relative z-10 h-8" />
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-10">
            <img src={logoDark} alt="Manava" className="h-8 w-auto object-contain object-left" />
          </div>

          <h1 className="text-3xl font-bold text-navy mb-1">Selamat datang kembali</h1>
          <p className="text-navy/50 text-sm mb-8">Masuk ke akun Anda</p>

          <form
            className="space-y-5"
            onSubmit={e => { e.preventDefault(); void handleSubmit() }}
          >
            <div>
              <label className="label">Email atau username</label>
              <input
                type="text"
                className="input"
                value={identifier}
                onChange={e => { setIdentifier(e.target.value); setError('') }}
                placeholder="anda@manava.id atau username"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="label">Kata sandi</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-11"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Demo account quick-fill */}
            <div>
              <label className="label">Akun demo <span className="text-navy/40 font-normal">(isi otomatis)</span></label>
              <div className="grid grid-cols-2 gap-2">
                {demoAccounts.map(a => (
                  <button
                    key={a.role}
                    type="button"
                    onClick={() => pickDemo(a)}
                    className={`p-3 rounded-xl border text-left transition-all duration-150 ${selectedDemo?.role === a.role ? 'border-navy bg-navy-50' : 'border-border bg-white hover:border-navy/30'}`}
                  >
                    <p className={`text-sm font-medium ${selectedDemo?.role === a.role ? 'text-navy' : 'text-navy/80'}`}>{a.label}</p>
                    <p className="text-xs text-navy/40 mt-0.5">{a.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full justify-center py-3 text-base mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Memeriksa…</>
                : <>Masuk{selectedDemo ? ` sebagai ${selectedDemo.label}` : ''} <ArrowRight className="w-5 h-5" /></>}
            </button>
          </form>

          <p className="text-center text-sm text-navy/50 mt-6">
            Pendaftaran klien sedang dinonaktifkan sementara.
          </p>
        </div>
      </div>
    </div>
  )
}
