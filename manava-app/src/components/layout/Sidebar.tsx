import { useState } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { cn } from '../../lib/utils'
import type { UserRole } from '../../types'
import logoDark from '../../assets/logo-dark.png'
import {
  LayoutDashboard, Users, Briefcase, UserCheck,
  Settings, ChevronLeft, ChevronDown, LogOut, Shield, X, User, Home,
  Cog, Building2, Search, Wallet, FileText, BarChart2,
} from 'lucide-react'

// A nav item either navigates directly (`to`) or expands into sub-pages
// (`children` link to the same route with a ?tab= param the page reads).
interface NavChild { to: string; tab: string; label: string }
interface NavItem { to: string; icon: typeof LayoutDashboard; label: string; children?: NavChild[] }

const navByRole: Record<UserRole, NavItem[]> = {
  superadmin: [
    { to: '/dashboard', icon: Home, label: 'Home' },
    { to: '/users', icon: Users, label: 'Pengguna & Role' },
    {
      to: '/system', icon: Cog, label: 'Sistem & Enkripsi',
      children: [
        { to: '/system?tab=params', tab: 'params', label: 'Parameter Global' },
        { to: '/system?tab=keys', tab: 'keys', label: 'Kunci Enkripsi' },
        { to: '/system?tab=health', tab: 'health', label: 'Kesehatan Sistem' },
      ],
    },
    { to: '/audit', icon: Shield, label: 'Jejak Audit' },
  ],
  hr_admin: [
    { to: '/dashboard', icon: Home, label: 'Dashboard Strategis' },
    { to: '/recruitment', icon: Users, label: 'Pipeline Talent & Rekrutmen' },
    { to: '/recruitment/jobs', icon: Briefcase, label: 'Kelola Lowongan' },
    {
      to: '/departments', icon: Building2, label: 'Rekapitulasi Organisasi',
      children: [
        { to: '/departments?tab=departemen', tab: 'departemen', label: 'Struktur Departemen' },
        { to: '/departments?tab=presensi', tab: 'presensi', label: 'Rekap Kehadiran' },
        { to: '/departments?tab=peringatan', tab: 'peringatan', label: 'Indikator Peringatan' },
        { to: '/departments?tab=offboarding', tab: 'offboarding', label: 'Analisis Turnover' },
        { to: '/departments?tab=laporan', tab: 'laporan', label: 'Laporan Eksekutif' },
      ],
    },
    { to: '/payments', icon: Wallet, label: 'Manajemen Payroll & Budget' },
    { to: '/ess', icon: UserCheck, label: 'Layanan Mandiri' },
  ],
  admin_manager: [
    { to: '/dashboard', icon: Home, label: 'Dashboard Taktis' },
    { to: '/laporan-bulanan', icon: FileText, label: 'Laporan Bulanan' },
    {
      to: '/team-dashboard', icon: Building2, label: 'Manajemen Tim',
      children: [
        { to: '/team-dashboard?tab=anggota', tab: 'anggota', label: 'Rapor Performa & Evaluasi' },
        { to: '/team-dashboard?tab=presensi', tab: 'presensi', label: 'Dashboard Ketersediaan Tim' },
        { to: '/team-dashboard?tab=klaim', tab: 'klaim', label: 'Persetujuan Klaim Dana' },
        { to: '/team-dashboard?tab=kpi', tab: 'kpi', label: 'Tren Kinerja & Target' },
        { to: '/team-dashboard?tab=proyek', tab: 'proyek', label: 'Alokasi Proyek' },
      ],
    },
    { to: '/ess', icon: UserCheck, label: 'Layanan Mandiri' },
  ],
  editor: [
    { to: '/dashboard', icon: Home, label: 'Dashboard Operasional' },
    { to: '/performance', icon: BarChart2, label: 'Grafik & Indeks Kepuasan Klien' },
    { to: '/projects', icon: Briefcase, label: 'Proyek Saya' },
    { to: '/ess', icon: UserCheck, label: 'Data Pribadi & Absensi' },
  ],
  client: [
    { to: '/dashboard', icon: Home, label: 'Home' },
    { to: '/browse-editors', icon: Search, label: 'Cari Jasa' },
    { to: '/projects', icon: Briefcase, label: 'Proyek Saya' },
  ],
  mediator: [],
  finance: [],
}

const roleLabels: Record<UserRole, string> = {
  superadmin: 'System Admin',
  hr_admin: 'HR Admin',
  admin_manager: 'Admin Manager',
  editor: 'Staf',
  client: 'Klien',
  mediator: 'Mediator',
  finance: 'Keuangan',
}

interface SidebarProps {
  role: UserRole
  userName: string
  collapsed: boolean
  onCollapse: (v: boolean) => void
  onLogout: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ role, userName, collapsed, onCollapse, onLogout, mobileOpen, onMobileClose }: SidebarProps) {
  const items = navByRole[role] ?? navByRole.superadmin
  const initials = userName.split(' ').map(n => n[0]).slice(0, 2).join('')
  const location = useLocation()
  const activeTab = new URLSearchParams(location.search).get('tab')

  // Groups start open when their route is active; user toggles override.
  const [groupOverrides, setGroupOverrides] = useState<Record<string, boolean>>({})
  const isGroupOpen = (item: NavItem) =>
    groupOverrides[item.to] ?? location.pathname.startsWith(item.to)
  const toggleGroup = (item: NavItem) =>
    setGroupOverrides(prev => ({ ...prev, [item.to]: !isGroupOpen(item) }))

  const isChildActive = (item: NavItem, child: NavChild) =>
    location.pathname.startsWith(item.to)
    && (activeTab ? activeTab === child.tab : child === item.children![0])

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-[#fbfbfb] border-r border-[#EDEDED] flex flex-col z-50',
        'transition-all duration-300',
        'lg:translate-x-0',
        collapsed ? 'lg:w-16' : 'lg:w-60',
        'w-60',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}
      style={{ fontFamily: "'Inter Display', 'Open Runde', sans-serif" }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-[#EDEDED]">
        {!collapsed && (
          <img src={logoDark} alt="Manava" className="h-7 w-auto object-contain object-left" />
        )}
        {collapsed && (
          <img src={logoDark} alt="Manava" className="h-7 w-auto object-contain mx-auto" />
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1 rounded-lg text-[#596074] hover:text-[#021526] hover:bg-[#021526]/[0.04] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          {!collapsed && (
            <button
              onClick={() => onCollapse(true)}
              className="hidden lg:block p-1 rounded-lg text-[#596074] hover:text-[#021526] hover:bg-[#021526]/[0.04] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Role label */}
      {!collapsed && (
        <div className="px-4 py-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#596074]">{roleLabels[role]}</span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-1 overflow-y-auto lg:overflow-y-visible space-y-0.5">
        {items.map(item => {
          const { to, icon: Icon, label, children } = item

          if (!children) {
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/dashboard'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-full text-[13.5px] font-medium tracking-[-0.01em] transition-all duration-150',
                    isActive
                      ? 'text-[#021526] bg-[#D0F100]'
                      : 'text-[#596074] hover:text-[#021526] hover:bg-[#021526]/[0.04]',
                    collapsed && 'lg:justify-center',
                  )
                }
                title={collapsed ? label : undefined}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.85} />
                <span className={cn(collapsed && 'lg:hidden')}>{label}</span>
              </NavLink>
            )
          }

          const routeActive = location.pathname.startsWith(to)
          const open = isGroupOpen(item)

          return (
            <div key={to} className="relative group">
              {/* Parent row: expands/collapses its sub-pages */}
              <button
                type="button"
                onClick={() => toggleGroup(item)}
                aria-expanded={open}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-full text-[13.5px] font-medium tracking-[-0.01em] transition-all duration-150',
                  routeActive
                    ? 'text-[#021526] bg-[#D0F100]'
                    : 'text-[#596074] hover:text-[#021526] hover:bg-[#021526]/[0.04]',
                  collapsed && 'lg:justify-center',
                )}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.85} />
                <span className={cn('flex-1 text-left', collapsed && 'lg:hidden')}>{label}</span>
                <ChevronDown
                  className={cn(
                    'w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200',
                    open && 'rotate-180',
                    collapsed && 'lg:hidden',
                  )}
                  strokeWidth={2}
                />
              </button>

              {/* Expanded: sub-pages with tree connector lines */}
              {open && (
                <ul className={cn('mt-0.5 mb-1 ml-[21px] pl-0 space-y-0.5', collapsed && 'lg:hidden')}>
                  {children.map(child => {
                    const active = isChildActive(item, child)
                    return (
                      <li key={child.tab} className="relative pl-4">
                        {/* elbow connector ala tree view */}
                        <span aria-hidden className="absolute left-0 top-0 bottom-0 w-px bg-[#E4E4E4]" />
                        <span aria-hidden className="absolute left-0 top-1/2 w-3 h-px bg-[#E4E4E4]" />
                        <Link
                          to={child.to}
                          onClick={onMobileClose}
                          className={cn(
                            'flex items-center px-3 py-2 rounded-full text-[13px] font-medium tracking-[-0.01em] transition-all duration-150',
                            active
                              ? 'text-[#021526] bg-[#021526]/[0.06] font-semibold'
                              : 'text-[#596074] hover:text-[#021526] hover:bg-[#021526]/[0.04]',
                          )}
                        >
                          {child.label}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}

              {/* Collapsed (desktop): flyout with label chip + sub-pages on hover */}
              {collapsed && (
                <div className="hidden lg:group-hover:block absolute left-full top-0 pl-2 z-[60]">
                  <span className="inline-flex items-center bg-[#021526] text-white text-[12px] font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap">
                    {label}
                  </span>
                  <ul className="mt-1.5 w-52 bg-white border border-[#EDEDED] rounded-xl shadow-lg p-1.5 space-y-0.5">
                    {children.map(child => {
                      const active = isChildActive(item, child)
                      return (
                        <li key={child.tab}>
                          <Link
                            to={child.to}
                            className={cn(
                              'flex items-center px-3 py-2 rounded-lg text-[13px] font-medium transition-colors',
                              active
                                ? 'text-[#021526] bg-[#D0F100]'
                                : 'text-[#596074] hover:text-[#021526] hover:bg-[#021526]/[0.04]',
                            )}
                          >
                            {child.label}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* User + controls */}
      <div className="px-2 py-3 border-t border-[#EDEDED] space-y-1">
        {collapsed ? (
          <button
            onClick={() => onCollapse(false)}
            className="hidden lg:flex w-full justify-center p-2.5 rounded-full text-[#596074] hover:text-[#021526] hover:bg-[#021526]/[0.04] transition-colors"
          >
            <ChevronLeft className="w-4 h-4 rotate-180" />
          </button>
        ) : (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-[#021526] flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[#021526] text-[13px] font-semibold truncate">{userName}</p>
              <p className="text-[#596074] text-[11px]">{roleLabels[role]}</p>
            </div>
          </div>
        )}

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-full text-[13.5px] font-medium transition-all',
              isActive
                ? 'text-[#021526] bg-[#021526]/[0.06]'
                : 'text-[#596074] hover:text-[#021526] hover:bg-[#021526]/[0.04]',
              collapsed && 'lg:justify-center',
            )
          }
          title={collapsed ? 'Profil' : undefined}
        >
          <User className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.85} />
          <span className={cn(collapsed && 'lg:hidden')}>Profil</span>
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-full text-[13.5px] font-medium transition-all',
              isActive
                ? 'text-[#021526] bg-[#021526]/[0.06]'
                : 'text-[#596074] hover:text-[#021526] hover:bg-[#021526]/[0.04]',
              collapsed && 'lg:justify-center',
            )
          }
          title={collapsed ? 'Pengaturan' : undefined}
        >
          <Settings className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.85} />
          <span className={cn(collapsed && 'lg:hidden')}>Pengaturan</span>
        </NavLink>

        <button
          onClick={onLogout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-full text-[13.5px] font-medium text-[#596074] hover:text-[#021526] hover:bg-[#021526]/[0.04] transition-colors',
            collapsed && 'lg:justify-center',
          )}
          title={collapsed ? 'Keluar' : undefined}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.85} />
          <span className={cn(collapsed && 'lg:hidden')}>Keluar</span>
        </button>
      </div>
    </aside>
  )
}
