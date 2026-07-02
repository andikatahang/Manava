import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import logoLight from '../../assets/logo-light.png'
import logoDark from '../../assets/logo-dark.png'

const MIN_PASSWORD_LENGTH = 8

interface RegisterPageProps {
  onRegister: (input: {
    email: string
    username: string
    firstName: string
    lastName: string
    password: string
  }) => Promise<unknown>
}

export default function RegisterPage({ onRegister }: RegisterPageProps) {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const reduceMotion = useReducedMotion()

  function validate(): string {
    if (!email.trim() || !username.trim() || !firstName.trim() || !lastName.trim() || !password || !confirmPassword) {
      return 'Semua kolom wajib diisi.'
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      return 'Format email tidak valid.'
    }
    if (username.trim().length < 3) {
      return 'Username minimal 3 karakter.'
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
      return 'Username tanpa spasi; hanya huruf, angka, dan simbol "-" atau "_".'
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Kata sandi minimal ${MIN_PASSWORD_LENGTH} karakter.`
    }
    if (password !== confirmPassword) {
      return 'Konfirmasi kata sandi tidak cocok.'
    }
    return ''
  }

  async function handleSubmit() {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setIsSubmitting(true)
    setError('')
    try {
      await onRegister({
        email: email.trim(),
        username: username.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password,
      })
      // Register auto-login: App re-renders into the authenticated routes.
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Pendaftaran gagal'
      const friendly: Record<string, string> = {
        'Email already registered': 'Email ini sudah terdaftar. Silakan masuk.',
        'Username already taken': 'Username ini sudah dipakai. Pilih yang lain.',
      }
      setError(friendly[message] ?? `Tidak dapat mendaftar: ${message}`)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-primary flex">
      {/* Left panel */}
      <div className="relative hidden lg:flex flex-col justify-between w-[44%] bg-navy p-12 overflow-hidden">
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
            Pesan layanan visual.<br />Bayar dengan aman.<br />Revisi yang adil.
          </h2>
          <p className="text-white/60 text-sm max-w-sm">
            Akun klien memberi Anda akses untuk memesan editor, memantau proyek, dan mengelola pembayaran escrow.
          </p>
        </div>
        <div className="relative z-10 h-8" />
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-10">
            <img src={logoDark} alt="Manava" className="h-8 w-auto object-contain object-left" />
          </div>

          <h1 className="text-3xl font-bold text-navy mb-1">Buat akun klien</h1>
          <p className="text-navy/50 text-sm mb-8">Daftar untuk mulai memesan layanan</p>

          <form
            className="space-y-5"
            onSubmit={e => { e.preventDefault(); void handleSubmit() }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Nama depan</label>
                <input
                  type="text"
                  className="input"
                  value={firstName}
                  onChange={e => { setFirstName(e.target.value); setError('') }}
                  placeholder="Andika"
                  autoComplete="given-name"
                />
              </div>
              <div>
                <label className="label">Nama belakang</label>
                <input
                  type="text"
                  className="input"
                  value={lastName}
                  onChange={e => { setLastName(e.target.value); setError('') }}
                  placeholder="Tahang"
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div>
              <label className="label">Alamat email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="anda@perusahaan.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">Username</label>
              <input
                type="text"
                className="input"
                value={username}
                onChange={e => { setUsername(e.target.value); setError('') }}
                placeholder="username_anda"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="label">Kata sandi <span className="text-navy/40 font-normal">(min. {MIN_PASSWORD_LENGTH} karakter)</span></label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-11"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Konfirmasi kata sandi</label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setError('') }}
                autoComplete="new-password"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full justify-center py-3 text-base mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Mendaftarkan…</>
                : <>Daftar <ArrowRight className="w-5 h-5" /></>}
            </button>
          </form>

          <p className="text-center text-sm text-navy/50 mt-6">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-navy font-medium hover:underline">Masuk</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
