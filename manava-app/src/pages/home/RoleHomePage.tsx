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
    roleLabel: 'HR Admin • Level Strategis',
    subtitle: 'Rekapitulasi organisasi, laporan eksekutif, dan pengambilan keputusan tingkat perusahaan.',
    features: [
      { label: 'Pipeline Talent',       to: '/recruitment',  icon: Users,          accent: 'lime' },
      { label: 'Struktur Organisasi',   to: '/departments',  icon: Building2,      accent: 'blue' },
      { label: 'Rekap Kehadiran',       to: '/departments?tab=presensi', icon: Clock, accent: 'amber' },
      { label: 'Rapor Performa',        to: '/performance',  icon: BarChart2,      accent: 'pink' },
      { label: 'Indikator Peringatan',  to: '/warning',      icon: AlertOctagon,   accent: 'amber' },
      { label: 'Analisis Turnover',     to: '/offboarding',  icon: UserCheck,      accent: 'navy' },
      { label: 'Data Pribadi',          to: '/ess',          icon: ClipboardCheck, accent: 'cyan' },
      { label: 'Pengaturan',            to: '/settings',     icon: Settings,       accent: 'navy' },
    ],
  },
  admin_manager: {
    roleLabel: 'Admin Manager • Level Taktis',
    subtitle: 'Validasi & persetujuan tim, kirim laporan agregasi ke HR, kelola ketersediaan departemen.',
    features: [
      { label: 'Manajemen Tim',           to: '/team-dashboard', icon: Building2,    accent: 'lime' },
      { label: 'Ketersediaan Tim',        to: '/team-dashboard?tab=presensi', icon: Clock, accent: 'amber' },
      { label: 'Tren Kinerja',            to: '/team-dashboard?tab=kpi',      icon: BarChart2, accent: 'pink' },
      { label: 'Alokasi Proyek',          to: '/team-dashboard?tab=proyek',   icon: Briefcase, accent: 'blue' },
      { label: 'Validasi Peringatan',     to: '/warning',        icon: AlertOctagon, accent: 'amber' },
      { label: 'Data Pribadi',            to: '/ess',            icon: ClipboardCheck, accent: 'cyan' },
      { label: 'Pengaturan',              to: '/settings',       icon: Settings,     accent: 'navy' },
    ],
  },
  editor: {
    roleLabel: 'Editor • Level Operasional',
    subtitle: 'Input data harian: absensi, cuti, dan lihat informasi pribadi Anda (KPI, gaji, proyek).',
    features: [
      { label: 'Proyek Saya',        to: '/projects',  icon: Briefcase,      accent: 'lime' },
      { label: 'Input Absensi',      to: '/ess',       icon: Clock,          accent: 'cyan' },
      { label: 'Ajukan Cuti',        to: '/ess',       icon: ClipboardCheck, accent: 'pink' },
      { label: 'Slip Gaji Saya',     to: '/ess',       icon: Wallet,         accent: 'emerald' },
      { label: 'KPI Score Saya',     to: '/ess',       icon: BarChart2,      accent: 'blue' },
      { label: 'Pengaturan',         to: '/settings',  icon: Settings,       accent: 'navy' },
    ],
  },
  // client dirender oleh <ClientHome/> (inbox + proyek), bukan config ini.
  client:   { roleLabel: 'Klien',    subtitle: 'Cari editor, pantau proyek, dan beri ulasan.', features: [] },
  mediator: { roleLabel: 'Mediator', subtitle: 'Role nonaktif.',   features: [] },
  finance:  { roleLabel: 'Keuangan', subtitle: 'Role nonaktif.',   features: [] },
}

const headerCopy: Record<UserRole, { eyebrow: string; helper: string }> = {
  superadmin:     { eyebrow: 'Menu sistem',           helper: 'Akses penuh ke semua modul.' },
  hr_admin:       { eyebrow: 'Informasi Strategis',   helper: 'Rekapitulasi & laporan eksekutif lintas organisasi.' },
  admin_manager:  { eyebrow: 'Informasi Taktis',      helper: 'Validasi tim & kirim agregasi ke HR.' },
  editor:         { eyebrow: 'Input Operasional',     helper: 'Entry data harian & lihat informasi pribadi Anda.' },
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
