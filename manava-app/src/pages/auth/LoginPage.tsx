import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import logoLight from '../../assets/logo-light.png'
import logoDark from '../../assets/logo-dark.png'
import type { UserRole } from '../../types'

const roles: { value: UserRole; label: string; desc: string }[] = [
  { value: 'superadmin',    label: 'Superadmin',     desc: 'Akun, role, parameter sistem' },
  { value: 'hr_admin',      label: 'HR Admin',       desc: 'ATS, payroll, peringatan, eskalasi tinggi' },
  { value: 'admin_manager', label: 'Admin Manager',  desc: 'Tim, KPI, eskalasi menengah' },
  { value: 'editor',        label: 'Editor',         desc: 'Kerjakan proyek & ESS' },
  { value: 'client',        label: 'Klien',          desc: 'Pesan & lacak layanan' },
  { value: 'mediator',      label: 'Mediator',       desc: 'Selesaikan sengketa' },
  { value: 'finance',       label: 'Keuangan',       desc: 'Escrow & penggajian' },
]

interface LoginPageProps { onLogin: (role: UserRole) => void }

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState<UserRole>('superadmin')
  const [email, setEmail] = useState('admin@manava.id')
  const reduceMotion = useReducedMotion()

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

          <div className="space-y-5">
            <div>
              <label className="label">Alamat email</label>
              <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="anda@manava.id" />
            </div>
            <div>
              <label className="label">Kata sandi</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} className="input pr-11" defaultValue="••••••••" />
                <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Role selector */}
            <div>
              <label className="label">Peran demo</label>
              <div className="grid grid-cols-2 gap-2">
                {roles.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setSelectedRole(r.value)}
                    className={`p-3 rounded-xl border text-left transition-all duration-150 ${selectedRole === r.value ? 'border-navy bg-navy-50' : 'border-border bg-white hover:border-navy/30'}`}
                  >
                    <p className={`text-sm font-medium ${selectedRole === r.value ? 'text-navy' : 'text-navy/80'}`}>{r.label}</p>
                    <p className="text-xs text-navy/40 mt-0.5">{r.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => onLogin(selectedRole)} className="btn-primary w-full justify-center py-3 text-base mt-2">
              Masuk sebagai {roles.find(r => r.value === selectedRole)?.label} <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <p className="text-center text-sm text-navy/50 mt-6">
            Belum punya akun?{' '}
            <Link to="/login" className="text-navy font-medium hover:underline">Daftar sebagai Editor</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
