import { useState } from 'react'
import { AlertOctagon, Plus, Filter, Calendar } from 'lucide-react'
import { PageHeader, StatPillsRow } from '../../components/page/PageHeader'
import type { UserRole } from '../../types'

type Severity = 'ringan' | 'sedang' | 'berat'
type Status = 'aktif' | 'diakui' | 'kedaluwarsa'

interface Warning {
  id: string
  targetName: string
  targetRole: 'editor' | 'admin_manager'
  reason: string
  severity: Severity
  status: Status
  issuedBy: string
  issuedAt: string
  expiresAt: string
}

const SEVERITY_TONE: Record<Severity, string> = {
  ringan: 'bg-[#FEF3C7] text-[#B45309] border-[#FCD34D]',
  sedang: 'bg-[#FFEDD5] text-[#C2410C] border-[#FDBA74]',
  berat:  'bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]',
}

const STATUS_TONE: Record<Status, string> = {
  aktif:       'bg-[#021526] text-white',
  diakui:      'bg-[#DCFCE7] text-[#047857]',
  kedaluwarsa: 'bg-[#E5EBF0] text-[#596074]',
}

const MOCK_WARNINGS: Warning[] = [
  { id: 'w1', targetName: 'Rizky Hakim',   targetRole: 'editor',        reason: 'Completion rate < 70% selama 2 bulan berturut-turut',         severity: 'berat',  status: 'aktif',  issuedBy: 'Hasna HR Admin', issuedAt: '2026-06-15', expiresAt: '2026-12-15' },
  { id: 'w2', targetName: 'Andi Kurniawan', targetRole: 'editor',       reason: 'Tiga kali missing clock-out tanpa klarifikasi bulan Mei',      severity: 'sedang', status: 'diakui', issuedBy: 'Hasna HR Admin', issuedAt: '2026-06-02', expiresAt: '2026-09-02' },
  { id: 'w3', targetName: 'Eko Manager',    targetRole: 'admin_manager', reason: 'Manager Assessment Q2 telat — KPI editor tidak dapat dihitung', severity: 'ringan', status: 'aktif', issuedBy: 'Hasna HR Admin', issuedAt: '2026-06-20', expiresAt: '2026-08-20' },
]

interface WarningPageProps { role: UserRole }

const HEADER_BY_ROLE: Record<UserRole, { eyebrow: string; title: string; description: string; canIssue: boolean }> = {
  superadmin:    { eyebrow: 'HR oversight', title: 'Peringatan Kerja', description: '', canIssue: false },
  hr_admin:      { eyebrow: 'HR enforcement', title: 'Peringatan Kerja', description: 'Terbitkan peringatan kerja kepada editor atau manajer berdasarkan KPI, kepatuhan absensi, atau performa departemen.', canIssue: true },
  admin_manager: { eyebrow: 'Tim saya', title: 'Peringatan Diterima', description: 'Peringatan kerja yang diterbitkan HR Admin terhadap Anda atau anggota tim Anda.', canIssue: false },
  editor:        { eyebrow: 'Catatan untuk saya', title: 'Peringatan Diterima', description: 'Peringatan kerja yang HR Admin terbitkan untuk Anda. Akui peringatan dan ambil tindakan korektif sebelum kedaluwarsa.', canIssue: false },
  client:        { eyebrow: 'HR', title: 'Peringatan Kerja', description: '', canIssue: false },
  mediator:      { eyebrow: 'HR', title: 'Peringatan Kerja', description: '', canIssue: false },
  finance:       { eyebrow: 'HR', title: 'Peringatan Kerja', description: '', canIssue: false },
}

export default function WarningPage({ role }: WarningPageProps) {
  const h = HEADER_BY_ROLE[role] ?? HEADER_BY_ROLE.hr_admin
  const [filter, setFilter] = useState<Status | 'all'>('all')

  const filtered = filter === 'all' ? MOCK_WARNINGS : MOCK_WARNINGS.filter(w => w.status === filter)

  const stats = [
    { label: 'Aktif',       value: MOCK_WARNINGS.filter(w => w.status === 'aktif').length, tone: 'red' as const,     hint: 'belum diakui' },
    { label: 'Diakui',      value: MOCK_WARNINGS.filter(w => w.status === 'diakui').length, tone: 'emerald' as const, hint: 'sudah dikonfirmasi' },
    { label: 'Severity berat', value: MOCK_WARNINGS.filter(w => w.severity === 'berat').length, tone: 'amber' as const, hint: 'butuh action plan' },
  ]

  return (
    <div className="space-y-6 max-w-[1140px]">
      <PageHeader
        eyebrow={h.eyebrow}
        title={h.title}
        description={h.description}
        role={role}
        actions={h.canIssue ? [{ label: 'Terbitkan Peringatan', icon: Plus }] : undefined}
      >
        <StatPillsRow items={stats} cols={3} />
      </PageHeader>

      <div className="flex items-center gap-1.5 overflow-x-auto" style={{ fontFamily: "'Inter Display', 'Open Runde', sans-serif" }}>
        <Filter className="w-3.5 h-3.5 text-[#596074] flex-shrink-0" />
        {(['all', 'aktif', 'diakui', 'kedaluwarsa'] as const).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all ${filter === s ? 'bg-[#021526] text-white' : 'bg-white text-[#596074] border border-black/[0.06] hover:border-[#021526]/20'}`}
          >
            {s === 'all' ? 'Semua' : s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(w => (
          <article key={w.id} className="rounded-[12px] border border-black/[0.06] bg-[#fbfbfb] p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <span className="w-11 h-11 rounded-full bg-[#FEE2E2] text-[#B91C1C] flex items-center justify-center flex-shrink-0">
                  <AlertOctagon className="w-5 h-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-[#021526] text-[14.5px]">{w.targetName}</h3>
                    <span className="text-[11px] text-[#596074]/80">· {w.targetRole === 'admin_manager' ? 'Admin Manager' : 'Editor'}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.06em] border ${SEVERITY_TONE[w.severity]}`}>
                      {w.severity}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${STATUS_TONE[w.status]}`}>
                      {w.status}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#021526]/80 mt-2 leading-relaxed">{w.reason}</p>
                  <div className="flex items-center gap-3 mt-3 text-[11.5px] text-[#596074]">
                    <span>Diterbitkan oleh <span className="font-medium text-[#021526]">{w.issuedBy}</span></span>
                    <span className="text-[#596074]/30">·</span>
                    <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {w.issuedAt}</span>
                    <span className="text-[#596074]/30">·</span>
                    <span>Kedaluwarsa {w.expiresAt}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {role === 'editor' && w.status === 'aktif' && (
                  <button className="bg-[#021526] hover:brightness-110 text-white font-semibold px-3.5 py-1.5 rounded-full text-[12px]">
                    Akui peringatan
                  </button>
                )}
                <button className="text-[12px] font-semibold text-[#021526] hover:underline">Detail</button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <p className="text-[11.5px] text-[#596074]/80">
        HR Admin adalah satu-satunya role yang dapat menerbitkan peringatan kerja formal.
        Manajer & editor melihat peringatan yang diterima dan menindaklanjuti dengan action plan.
      </p>
    </div>
  )
}
