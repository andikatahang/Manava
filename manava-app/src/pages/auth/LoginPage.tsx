import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import logoLight from '../../assets/logo-light.png'
import logoDark from '../../assets/logo-dark.png'

interface LoginPageProps { onLogin: (identifier: string, password: string) => Promise<unknown> }

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const reduceMotion = useReducedMotion()

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

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full justify-center py-3 text-base mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Memeriksa…</>
                : <>Masuk <ArrowRight className="w-5 h-5" /></>}
            </button>

            {/* Pendaftaran mandiri hanya untuk role Klien — role internal
                (staf/admin) dibuatkan akunnya lewat rekrutmen atau superadmin. */}
            <Link
              to="/register"
              className="w-full flex items-center justify-center gap-2 py-3 text-base rounded-xl border border-border bg-white text-navy font-medium hover:border-navy/30 transition-colors"
            >
              Daftar sebagai Klien
            </Link>
          </form>
        </div>
      </div>
    </div>
  )
}
