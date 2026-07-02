import { Link } from 'react-router-dom'
import {
  Users, Briefcase, FileText, CreditCard, Clock, BarChart2, AlertTriangle,
  MessageSquare, UserCheck, Shield, PackageCheck, Search, Settings, BadgeDollarSign,
  ClipboardCheck, Wallet, Scale, FileSearch, KeyRound, Cog,
  LifeBuoy, ScanLine, Bell, ArrowUpRight, AlertOctagon,
  Database, Building2,
} from 'lucide-react'
import type { User, UserRole } from '../../types'
import { HomeHero } from '../../components/home/HomeHero'
import { QuickAttendance } from '../../components/home/QuickAttendance'
import { FeatureGrid, type FeatureTile } from '../../components/home/FeatureGrid'

interface RoleHomeConfig {
  roleLabel: string
  subtitle: string
  features: FeatureTile[]
  /** Optional "spotlight" insights shown below the feature grid. */
  spotlight?: { label: string; value: string; hint: string; to: string }[]
}

const configs: Record<UserRole, RoleHomeConfig> = {
  superadmin: {
    roleLabel: 'System Admin',
    subtitle: 'Kelola akun pengguna, role, parameter sistem, dan pantau data lintas modul. Tidak terlibat dalam proses bisnis maupun eskalasi.',
    features: [
      { label: 'Pengguna & Role',    to: '/users',  icon: Users,    accent: 'lime' },
      { label: 'Tambah Akun',        to: '/users',  icon: KeyRound, accent: 'blue' },
      { label: 'Parameter Sistem',   to: '/system', icon: Cog,      accent: 'navy' },
      { label: 'Kunci Enkripsi',     to: '/system', icon: KeyRound, accent: 'amber' },
      { label: 'Kesehatan Sistem',   to: '/system', icon: Database, accent: 'emerald' },
      { label: 'Jejak Audit',        to: '/audit',  icon: Shield,   accent: 'pink' },
      { label: 'Pengaturan',         to: '/settings', icon: Settings, accent: 'navy' },
    ],
    spotlight: [
      { label: 'Akun aktif',        value: '7', hint: 'lintas 7 role', to: '/users' },
      { label: 'Kunci due rotasi',  value: '1', hint: '< 30 hari',     to: '/system' },
      { label: 'DENY rate',         value: '0.4%', hint: 'baseline normal', to: '/audit' },
    ],
  },
  hr_admin: {
    roleLabel: 'HR Admin',
    subtitle: 'Siklus rekrutmen → onboarding, pantau KPI, terbitkan peringatan kerja, tangani eskalasi cuti & gaji tingkat tinggi.',
    features: [
      { label: 'ATS Pipeline',       to: '/recruitment',  icon: Users,                 accent: 'lime' },
      { label: 'Onboarding',         to: '/recruitment',  icon: ClipboardCheck,        accent: 'blue' },
      { label: 'Presensi',           to: '/attendance',   icon: Clock,                 accent: 'amber' },
      { label: 'Cutoff Bulanan',     to: '/attendance',   icon: KeyRound,              accent: 'navy' },
      { label: 'Departemen',         to: '/departments',  icon: Building2,             accent: 'blue' },
      { label: 'KPI Editor',         to: '/performance',  icon: BarChart2,             accent: 'pink' },
      { label: 'Peringatan Kerja',   to: '/warning',      icon: AlertOctagon,          accent: 'amber',   badge: '3' },
      { label: 'Offboarding',        to: '/offboarding',  icon: UserCheck,             accent: 'navy' },
      { label: 'Pengaturan',         to: '/settings',     icon: Settings,              accent: 'navy' },
    ],
    spotlight: [
      { label: 'Lowongan aktif',      value: '4',  hint: '23 pelamar baru',                  to: '/recruitment' },
      { label: 'Peringatan aktif',    value: '3',  hint: '1 berat butuh action plan',        to: '/warning' },
    ],
  },
  admin_manager: {
    roleLabel: 'Admin Manager',
    subtitle: 'Atur tim editor di departemen Anda, pantau KPI, dan setujui cuti tim sebelum naik ke HR Admin.',
    features: [
      { label: 'Dashboard Departemen', to: '/team-dashboard', icon: Building2,       accent: 'lime' },
      { label: 'Peringatan Tim',       to: '/warning',        icon: AlertOctagon,    accent: 'amber' },
      { label: 'Pengaturan',           to: '/settings',       icon: Settings,        accent: 'navy' },
    ],
    spotlight: [
      { label: 'Cuti menunggu',     value: '3',   hint: 'aksi Anda',                   to: '/team-dashboard' },
      { label: 'Assessment Q2',     value: '5/8', hint: 'belum diisi',                 to: '/team-dashboard' },
    ],
  },
  editor: {
    roleLabel: 'Editor',
    subtitle: 'Proyek aktif, hasil kerja, dan layanan mandiri Anda.',
    features: [
      { label: 'Proyek Saya',        to: '/projects',  icon: Briefcase,    accent: 'lime',  badge: '2' },
      { label: 'Chat Klien',         to: '/chat',      icon: MessageSquare, accent: 'blue', badge: '1' },
      { label: 'Layanan Mandiri',    to: '/ess',       icon: UserCheck,    accent: 'cyan' },
      { label: 'Presensi',           to: '/attendance', icon: Clock,       accent: 'amber' },
      { label: 'Ajukan Cuti',        to: '/ess',       icon: ClipboardCheck, accent: 'pink' },
      { label: 'Slip Gaji',          to: '/ess',       icon: Wallet,       accent: 'emerald' },
      { label: 'KPI Saya',           to: '/dashboard', icon: BarChart2,    accent: 'navy' },
      { label: 'Pengaturan',         to: '/settings',  icon: Settings,     accent: 'navy' },
    ],
    spotlight: [
      { label: 'Revisi menunggu', value: '1', hint: 'Major — top-up dibutuhkan', to: '/projects' },
      { label: 'KPI bulan ini', value: '4.7★', hint: 'band: Excellent', to: '/dashboard' },
      { label: 'Slip gaji terbaru', value: 'Jun', hint: 'siap diunduh', to: '/ess' },
    ],
  },
  client: {
    roleLabel: 'Klien',
    subtitle: 'Pesan editor, lacak proyek, dan kelola pembayaran escrow.',
    features: [
      { label: 'Cari Editor',        to: '/browse-editors', icon: Search,        accent: 'lime' },
      { label: 'Proyek Saya',        to: '/projects',       icon: Briefcase,     accent: 'blue',  badge: '2' },
      { label: 'Tinjau Hasil',       to: '/projects',       icon: PackageCheck,  accent: 'emerald' },
      { label: 'Brief Aktif',        to: '/projects',       icon: FileText,      accent: 'cyan' },
      { label: 'Pembayaran',         to: '/projects',       icon: CreditCard,    accent: 'amber' },
      { label: 'Sengketa',           to: '/projects',       icon: Scale,         accent: 'pink' },
      { label: 'Pengaturan',         to: '/settings',       icon: Settings,      accent: 'navy' },
    ],
    spotlight: [
      { label: 'Menunggu review', value: '1', hint: 'v3 deliverable', to: '/projects' },
      { label: 'Top-up dibutuhkan', value: '1', hint: 'IDR 350K', to: '/projects' },
      { label: 'Proyek aktif', value: '2', hint: 'on track', to: '/projects' },
    ],
  },
  mediator: {
    roleLabel: 'Mediator',
    subtitle: 'Queue sengketa Anda dengan SLA 48 jam — bukti tersedia di dashboard.',
    features: [
      { label: 'Queue Sengketa',     to: '/disputes',  icon: AlertTriangle, accent: 'lime',   badge: '3' },
      { label: 'Bukti & Evidence',   to: '/disputes',  icon: FileSearch,    accent: 'blue' },
      { label: 'AI Change Detection', to: '/disputes', icon: ScanLine,      accent: 'cyan' },
      { label: 'Riwayat Keputusan',  to: '/disputes',  icon: Scale,         accent: 'pink' },
      { label: 'Proyek',             to: '/projects',  icon: Briefcase,     accent: 'navy' },
      { label: 'Pengaturan',         to: '/settings',  icon: Settings,      accent: 'navy' },
    ],
    spotlight: [
      { label: 'SLA mepet', value: '1', hint: '< 4 jam tersisa', to: '/disputes' },
      { label: 'Decision rate', value: '92%', hint: 'on-time bulan ini', to: '/disputes' },
      { label: 'Kasus terbuka', value: '3', hint: 'ditugaskan ke Anda', to: '/disputes' },
    ],
  },
  finance: {
    roleLabel: 'Keuangan',
    subtitle: 'Rekonsiliasi escrow, laporan pendapatan IFRS 15, dan disbursement payslip.',
    features: [
      { label: 'Escrow Ledger',      to: '/payments',   icon: Wallet,         accent: 'lime' },
      { label: 'Rekonsiliasi',       to: '/payments',   icon: ClipboardCheck, accent: 'blue',   badge: '!' },
      { label: 'Revenue Report',     to: '/payments',   icon: BarChart2,      accent: 'emerald' },
      { label: 'Disbursement',       to: '/attendance', icon: BadgeDollarSign, accent: 'amber' },
      { label: 'P&L Bulanan',        to: '/audit',      icon: FileText,       accent: 'cyan' },
      { label: 'Jejak Audit',        to: '/audit',      icon: Shield,         accent: 'pink' },
      { label: 'Pengaturan',         to: '/settings',   icon: Settings,       accent: 'navy' },
    ],
    spotlight: [
      { label: 'Escrow siap rilis', value: '5', hint: 'IDR 48.2 jt total', to: '/payments' },
      { label: 'Selisih ledger', value: '0', hint: 'reconciled hari ini', to: '/payments' },
      { label: 'Batch payslip', value: '12', hint: 'menunggu disburse', to: '/attendance' },
    ],
  },
}

const headerCopy: Record<UserRole, { eyebrow: string; helper: string }> = {
  superadmin:     { eyebrow: 'Menu sistem',    helper: 'Akses penuh ke semua modul.' },
  hr_admin:       { eyebrow: 'Operasi HR',     helper: 'Siklus rekrutmen hingga payroll.' },
  admin_manager:  { eyebrow: 'Operasi tim',    helper: 'Persetujuan & penilaian harian.' },
  editor:         { eyebrow: 'Akses cepat',    helper: 'Pekerjaan dan layanan mandiri Anda.' },
  client:         { eyebrow: 'Akses cepat',    helper: 'Cari, pesan, dan kelola proyek.' },
  mediator:       { eyebrow: 'Queue mediasi',  helper: 'Bukti dan SLA terpantau.' },
  finance:        { eyebrow: 'Operasi finansial', helper: 'Escrow, pendapatan, payroll.' },
}

interface RoleHomePageProps { user: User }

export default function RoleHomePage({ user }: RoleHomePageProps) {
  const cfg = configs[user.role] ?? configs.editor
  const copy = headerCopy[user.role] ?? headerCopy.editor
  const showAttendance = user.role !== 'client'

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

      {showAttendance && <QuickAttendance />}

      <FeatureGrid
        title={copy.eyebrow}
        features={cfg.features}
      />
      <p className="-mt-4 text-[12px] text-[#596074]">{copy.helper}</p>

      {cfg.spotlight && cfg.spotlight.length > 0 && (
        <section aria-labelledby="spotlight-heading" className="pt-2">
          <header className="flex items-end justify-between mb-4">
            <h2 id="spotlight-heading" className="text-[15px] font-semibold tracking-[-0.01em] text-[#021526]">
              Perlu perhatian
            </h2>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#596074]">
              <Bell className="w-3 h-3" />
              Hari ini
            </span>
          </header>
          <div className="grid sm:grid-cols-3 gap-3">
            {cfg.spotlight.map(s => (
              <Link
                key={s.label}
                to={s.to}
                className="group rounded-[8px] border border-black/[0.05] bg-[#fbfbfb] p-5 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(2,21,38,0.18)] transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#596074]">
                    {s.label}
                  </p>
                  <ArrowUpRight className="w-4 h-4 text-[#596074] group-hover:text-[#021526] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-[clamp(1.5rem,3vw,1.9rem)] font-bold tracking-[-0.03em] text-[#021526] leading-none mt-3 tabular-nums">
                  {s.value}
                </p>
                <p className="text-[12.5px] text-[#596074] mt-1.5">{s.hint}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <footer className="pt-4 flex items-center justify-between text-[11px] text-[#596074]/80">
        <span className="inline-flex items-center gap-1.5">
          <LifeBuoy className="w-3.5 h-3.5" />
          Butuh bantuan? Buka <Link to="/settings" className="text-[#021526] font-medium hover:underline">Pengaturan → Dukungan</Link>
        </span>
        <span className="hidden sm:inline">Manava ERP · v2.3.1</span>
      </footer>
    </div>
  )
}
