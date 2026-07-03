import { useState } from 'react'
import { Shield, UserPlus, Search, MoreHorizontal, KeyRound, CircleSlash2, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '../../components/page/PageHeader'
import { StatPillsRow } from '../../components/page/PageHeader'
import { mockUsers } from '../../data/mockData'
import { isRoleDisabled } from '../../lib/roles'
import type { UserRole } from '../../types'

const ROLE_LABEL: Record<UserRole, string> = {
  superadmin: 'System Admin',
  hr_admin: 'HR Admin',
  admin_manager: 'Admin Manager',
  editor: 'Editor',
  client: 'Klien',
  mediator: 'Mediator',
  finance: 'Keuangan',
}

const ROLE_TONE: Record<UserRole, string> = {
  superadmin: 'bg-[#021526] text-white',
  hr_admin: 'bg-[#DCE9FF] text-[#0050F8]',
  admin_manager: 'bg-[#FCE7F3] text-[#BE185D]',
  editor: 'bg-[#D0F100] text-[#021526]',
  client: 'bg-[#DCFCE7] text-[#047857]',
  mediator: 'bg-[#FEF3C7] text-[#B45309]',
  finance: 'bg-[#CFFAFE] text-[#0E7490]',
}

export default function UsersPage() {
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')

  // Akun ber-role nonaktif (client/mediator/finance) disembunyikan dari
  // manajemen akun selama role tersebut dinonaktifkan.
  const allUsers = Object.values(mockUsers).filter(u => !isRoleDisabled(u.role))
  const filtered = allUsers.filter(u => {
    const matchesQuery = !query || u.full_name.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase())
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    return matchesQuery && matchesRole
  })

  const stats = [
    { label: 'Total akun', value: allUsers.length, tone: 'navy' as const, hint: 'aktif di sistem' },
    { label: 'Staf admin', value: allUsers.filter(u => ['superadmin', 'hr_admin', 'admin_manager'].includes(u.role)).length, tone: 'blue' as const, hint: '3 role admin' },
    { label: 'Editor', value: allUsers.filter(u => u.role === 'editor').length, tone: 'emerald' as const, hint: 'tenaga produksi' },
    { label: 'Suspended', value: allUsers.filter(u => !u.is_active).length, tone: 'red' as const, hint: 'dinonaktifkan' },
  ]

  return (
    <div className="space-y-6 max-w-[1140px]">
      <PageHeader
        eyebrow="Manajemen akun"
        title="Pengguna & Role"
        description="Pantau seluruh akun pengguna, atur role, suspend akun, dan rotasi credential. Tindakan write tercatat di Jejak Audit secara immutable."
        role="superadmin"
        actions={[
          { label: 'Tambah Akun', icon: UserPlus },
          { label: 'Audit Log', icon: Shield, variant: 'secondary', to: '/audit' },
        ]}
      >
        <StatPillsRow items={stats} />
      </PageHeader>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#596074]" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cari nama atau email"
            className="w-full bg-white border border-black/[0.06] rounded-full pl-10 pr-4 py-2.5 text-[13.5px] text-[#021526] placeholder:text-[#596074]/60 focus:outline-none focus:border-[#021526]/30 focus:ring-2 focus:ring-[#021526]/[0.04]"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(['all', 'superadmin', 'hr_admin', 'admin_manager', 'editor'] as const).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-semibold tracking-[-0.01em] whitespace-nowrap transition-all ${roleFilter === r ? 'bg-[#021526] text-white' : 'bg-white text-[#596074] border border-black/[0.06] hover:border-[#021526]/20'}`}
            >
              {r === 'all' ? 'Semua' : ROLE_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      {/* User table */}
      <div className="rounded-[12px] border border-black/[0.06] bg-[#fbfbfb] overflow-hidden">
        <table className="w-full text-[13px]" style={{ fontFamily: "'Inter Display', 'Open Runde', sans-serif" }}>
          <thead className="bg-[#021526]/[0.03]">
            <tr className="text-left text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#596074]">
              <th className="px-5 py-3">Akun</th>
              <th className="px-5 py-3 hidden md:table-cell">Email</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3 hidden lg:table-cell">Status</th>
              <th className="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.05]">
            {filtered.map(u => {
              const initials = u.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
              return (
                <tr key={u.user_id} className="hover:bg-[#021526]/[0.02] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-full bg-[#021526] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#021526] truncate">{u.full_name}</p>
                        <p className="text-[11.5px] text-[#596074] md:hidden truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell text-[#596074]">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${ROLE_TONE[u.role]}`}>
                      {ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    {u.is_active ? (
                      <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#047857]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#B91C1C]">
                        <CircleSlash2 className="w-3.5 h-3.5" /> Suspended
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        className="p-1.5 rounded-full text-[#596074] hover:text-[#021526] hover:bg-[#021526]/[0.06] transition-colors"
                        aria-label="Rotasi credential"
                        title="Rotasi credential"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        className="p-1.5 rounded-full text-[#596074] hover:text-[#021526] hover:bg-[#021526]/[0.06] transition-colors"
                        aria-label="More"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-[13px] text-[#596074]">
            Tidak ada akun yang cocok dengan filter.
          </div>
        )}
      </div>

      <p className="text-[11.5px] text-[#596074]/80">
        SUPERADMIN hanya mengelola data akun dan role assignment. Proses bisnis (rekrutmen, payroll, sengketa, escrow)
        ditangani oleh role bisnis terkait — superadmin tidak terlibat dalam eskalasi operasional.
      </p>
    </div>
  )
}
