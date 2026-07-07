import { Link } from 'react-router-dom'
import {
  Users, Briefcase, Clock, BarChart2,
  UserCheck, Shield, Settings, Wallet,
  ClipboardCheck, KeyRound, Cog, LifeBuoy, AlertOctagon, Database, Building2,
} from 'lucide-react'
import type { User, UserRole } from '../../types'
import { HomeHero } from '../../components/home/HomeHero'
import { QuickAttendance } from '../../components/home/QuickAttendance'
import { FeatureGrid, type FeatureTile } from '../../components/home/FeatureGrid'
import ClientHome from './ClientHome'
import EditorHome from './EditorHome'

interface RoleHomeConfig {
  roleLabel: string
  subtitle: string
  features: FeatureTile[]
}

const configs: Record<UserRole, RoleHomeConfig> = {
  superadmin: {
    roleLabel: 'System Admin',
    subtitle: 'Kelola akun pengguna, role, parameter sistem, dan pantau data lintas modul.',
    features: [
      { label: 'Pengguna & Role',    to: '/users',    icon: Users,    accent: 'lime' },
      { label: 'Parameter Sistem',   to: '/system',   icon: Cog,      accent: 'navy' },
      { label: 'Kunci Enkripsi',     to: '/system',   icon: KeyRound, accent: 'amber' },
      { label: 'Kesehatan Sistem',   to: '/system',   icon: Database, accent: 'emerald' },
      { label: 'Jejak Audit',        to: '/audit',    icon: Shield,   accent: 'pink' },
      { label: 'Pengaturan',         to: '/settings', icon: Settings, accent: 'navy' },
    ],
  },
  hr_admin: {
    roleLabel: 'HR Admin',
    subtitle: 'Siklus rekrutmen → onboarding, pantau KPI, terbitkan peringatan kerja, kelola presensi.',
    features: [
      { label: 'ATS Pipeline',       to: '/recruitment',  icon: Users,          accent: 'lime' },
      { label: 'Departemen',         to: '/departments',  icon: Building2,      accent: 'blue' },
      { label: 'Presensi',           to: '/departments?tab=presensi', icon: Clock, accent: 'amber' },
      { label: 'KPI Editor',         to: '/performance',  icon: BarChart2,      accent: 'pink' },
      { label: 'Peringatan Kerja',   to: '/warning',      icon: AlertOctagon,   accent: 'amber' },
      { label: 'Offboarding',        to: '/offboarding',  icon: UserCheck,      accent: 'navy' },
      { label: 'Layanan Mandiri',    to: '/ess',          icon: ClipboardCheck, accent: 'cyan' },
      { label: 'Pengaturan',         to: '/settings',     icon: Settings,       accent: 'navy' },
    ],
  },
  admin_manager: {
    roleLabel: 'Admin Manager',
    subtitle: 'Atur tim editor di departemen Anda, pantau KPI, dan setujui cuti tim sebelum naik ke HR Admin.',
    features: [
      { label: 'Dashboard Departemen', to: '/team-dashboard', icon: Building2,    accent: 'lime' },
      { label: 'Presensi Tim',         to: '/team-dashboard?tab=presensi', icon: Clock, accent: 'amber' },
      { label: 'KPI Tim',              to: '/team-dashboard?tab=kpi',      icon: BarChart2, accent: 'pink' },
      { label: 'Proyek Tim',           to: '/team-dashboard?tab=proyek',   icon: Briefcase, accent: 'blue' },
      { label: 'Peringatan Tim',       to: '/warning',        icon: AlertOctagon, accent: 'amber' },
      { label: 'Layanan Mandiri',      to: '/ess',            icon: ClipboardCheck, accent: 'cyan' },
      { label: 'Pengaturan',           to: '/settings',       icon: Settings,     accent: 'navy' },
    ],
  },
  editor: {
    roleLabel: 'Editor',
    subtitle: 'Proyek aktif, hasil kerja, dan layanan mandiri Anda.',
    features: [
      { label: 'Proyek Saya',        to: '/projects',  icon: Briefcase,      accent: 'lime' },
      { label: 'Layanan Mandiri',    to: '/ess',       icon: UserCheck,      accent: 'cyan' },
      { label: 'Ajukan Cuti',        to: '/ess',       icon: ClipboardCheck, accent: 'pink' },
      { label: 'Slip Gaji',          to: '/ess',       icon: Wallet,         accent: 'emerald' },
      { label: 'Peringatan Saya',    to: '/warning',   icon: AlertOctagon,   accent: 'amber' },
      { label: 'Pengaturan',         to: '/settings',  icon: Settings,       accent: 'navy' },
    ],
  },
  // client dirender oleh <ClientHome/> (inbox + proyek), bukan config ini.
  client:   { roleLabel: 'Klien',    subtitle: 'Cari editor, pantau proyek, dan beri ulasan.', features: [] },
  mediator: { roleLabel: 'Mediator', subtitle: 'Role nonaktif.',   features: [] },
  finance:  { roleLabel: 'Keuangan', subtitle: 'Role nonaktif.',   features: [] },
}

const headerCopy: Record<UserRole, { eyebrow: string; helper: string }> = {
  superadmin:     { eyebrow: 'Menu sistem',      helper: 'Akses penuh ke semua modul.' },
  hr_admin:       { eyebrow: 'Operasi HR',       helper: 'Siklus rekrutmen hingga presensi.' },
  admin_manager:  { eyebrow: 'Operasi tim',      helper: 'Persetujuan & penilaian harian.' },
  editor:         { eyebrow: 'Akses cepat',      helper: 'Pekerjaan dan layanan mandiri Anda.' },
  client:         { eyebrow: '', helper: '' },
  mediator:       { eyebrow: '', helper: '' },
  finance:        { eyebrow: '', helper: '' },
}

interface RoleHomePageProps { user: User }

export default function RoleHomePage({ user }: RoleHomePageProps) {
  // Home klien punya susunan sendiri (kotak masuk + proyek aktif + riwayat)
  // dan tanpa QuickAttendance — klien tidak melakukan presensi.
  if (user.role === 'client') return <ClientHome user={user} />
  // Home editor mengikuti pola yang sama supaya editor melihat inbox pesan
  // klien, proyek aktif, dan riwayat pesanan langsung dari halaman utama.
  if (user.role === 'editor') return <EditorHome user={user} />

  const cfg = configs[user.role] ?? configs.editor
  const copy = headerCopy[user.role] ?? headerCopy.editor

  return (
    <div
      className="space-y-7 sm:space-y-8 max-w-[1140px] mx-auto"
      style={{ fontFamily: "'Inter Display', 'Open Runde', sans-serif" }}
    >
      <HomeHero
        fullName={user.full_name}
        roleLabel={cfg.roleLabel}
        subtitle={cfg.subtitle}
      />

      <QuickAttendance />

      <FeatureGrid title={copy.eyebrow} features={cfg.features} />
      <p className="-mt-4 text-[12px] text-[#596074]">{copy.helper}</p>

      <footer className="pt-4 flex items-center justify-between text-[11px] text-[#596074]/80">
        <span className="inline-flex items-center gap-1.5">
          <LifeBuoy className="w-3.5 h-3.5" />
          Butuh bantuan? Buka <Link to="/settings" className="text-[#021526] font-medium hover:underline">Pengaturan → Dukungan</Link>
        </span>
        <span className="hidden sm:inline">Manava ERP</span>
      </footer>
    </div>
  )
}
