import { useState } from 'react'
import { ArrowUpRightFromSquare, CheckCircle2, XCircle, Clock, Wallet, CalendarCheck2 } from 'lucide-react'
import { PageHeader, StatPillsRow } from '../../components/page/PageHeader'
import type { UserRole } from '../../types'

type EscalationType = 'cuti' | 'gaji'
type Level = 'menengah' | 'tinggi'
type Status = 'menunggu' | 'disetujui' | 'ditolak'

interface Escalation {
  id: string
  type: EscalationType
  level: Level
  submitter: string
  submitterRole: 'editor'
  department: string
  summary: string
  amount?: string
  status: Status
  submittedAt: string
  slaHours: number
}

const MOCK: Escalation[] = [
  { id: 'e1', type: 'cuti', level: 'menengah', submitter: 'Budi Santoso',   submitterRole: 'editor', department: 'Photo Retouching', summary: 'Cuti tahunan 5 hari saat ada 2 proyek aktif',                                       status: 'menunggu', submittedAt: '2026-06-26 09:12', slaHours: 36 },
  { id: 'e2', type: 'gaji', level: 'menengah', submitter: 'Maya Putri',     submitterRole: 'editor', department: 'Color Grading',     summary: 'Bonus proyek belum masuk payslip Mei — proyek selesai 30-Mei 23:50',              amount: 'IDR 1.250.000', status: 'menunggu', submittedAt: '2026-06-22 14:30', slaHours: 12 },
  { id: 'e3', type: 'cuti', level: 'tinggi',   submitter: 'Sari Dewi',      submitterRole: 'editor', department: 'Video Editing',    summary: 'Cuti darurat 14 hari — keluarga (eskalasi naik dari Manajer karena ada konflik proyek)', status: 'menunggu', submittedAt: '2026-06-25 11:00', slaHours: 6 },
  { id: 'e4', type: 'gaji', level: 'tinggi',   submitter: 'Andi Kurniawan', submitterRole: 'editor', department: 'Photo Retouching', summary: 'Dispute deduction 3 hari — klarifikasi sudah disetujui Manajer tapi tidak masuk hitungan', amount: 'IDR 720.000', status: 'disetujui', submittedAt: '2026-06-18 10:00', slaHours: 0 },
]

const LEVEL_TONE: Record<Level, string> = {
  menengah: 'bg-[#FEF3C7] text-[#B45309]',
  tinggi:   'bg-[#FEE2E2] text-[#B91C1C]',
}

const STATUS_TONE: Record<Status, string> = {
  menunggu:  'bg-[#021526] text-white',
  disetujui: 'bg-[#DCFCE7] text-[#047857]',
  ditolak:   'bg-[#FEE2E2] text-[#B91C1C]',
}

const HEADER_BY_ROLE: Record<UserRole, { eyebrow: string; title: string; description: string; canActOn: Level | 'both' | null }> = {
  superadmin:    { eyebrow: 'HR', title: 'Eskalasi', description: '', canActOn: null },
  hr_admin:      { eyebrow: 'Eskalasi tingkat tinggi', title: 'Eskalasi Cuti & Gaji', description: 'Kasus eskalasi tinggi yang naik dari Manajer atau dari masalah gaji yang membutuhkan otoritas HR Admin. Kasus menengah dipegang Manajer di departemen masing-masing.', canActOn: 'tinggi' },
  admin_manager: { eyebrow: 'Eskalasi tingkat menengah', title: 'Eskalasi Tim Saya', description: 'Pengajuan cuti & masalah gaji dari editor di departemen Anda. Eskalasi naik ke HR Admin jika tidak dapat diselesaikan di level tim.', canActOn: 'menengah' },
  editor:        { eyebrow: 'Eskalasi saya', title: 'Status Eskalasi', description: 'Eskalasi cuti & gaji yang Anda ajukan ke Manajer atau HR Admin.', canActOn: null },
  client:        { eyebrow: 'HR', title: 'Eskalasi', description: '', canActOn: null },
  mediator:      { eyebrow: 'HR', title: 'Eskalasi', description: '', canActOn: null },
  finance:       { eyebrow: 'HR (read-only)', title: 'Eskalasi Gaji', description: 'Konteks untuk verifikasi disbursement bulanan. Tidak ada hak approve/reject.', canActOn: null },
}

interface EscalationPageProps { role: UserRole }

export default function EscalationPage({ role }: EscalationPageProps) {
  const h = HEADER_BY_ROLE[role] ?? HEADER_BY_ROLE.admin_manager
  const [filter, setFilter] = useState<'all' | EscalationType>('all')

  // Scope visibility by role
  const visible = MOCK.filter(e => {
    if (role === 'hr_admin') return e.level === 'tinggi'
    if (role === 'admin_manager') return e.level === 'menengah'
    if (role === 'editor') return true
    return true
  }).filter(e => filter === 'all' || e.type === filter)

  const stats = [
    { label: 'Menunggu', value: visible.filter(e => e.status === 'menunggu').length, tone: 'amber' as const, hint: 'aksi Anda' },
    { label: 'SLA mepet', value: visible.filter(e => e.slaHours > 0 && e.slaHours <= 12).length, tone: 'red' as const, hint: '< 12 jam' },
    { label: 'Disetujui', value: visible.filter(e => e.status === 'disetujui').length, tone: 'emerald' as const, hint: '30 hari terakhir' },
  ]

  return (
    <div className="space-y-6 max-w-[1140px]">
      <PageHeader
        eyebrow={h.eyebrow}
        title={h.title}
        description={h.description}
        role={role}
      >
        <StatPillsRow items={stats} cols={3} />
      </PageHeader>

      <div className="flex items-center gap-1.5" style={{ fontFamily: "'Inter Display', 'Open Runde', sans-serif" }}>
        {(['all', 'cuti', 'gaji'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-semibold tracking-[-0.01em] transition-all ${filter === t ? 'bg-[#021526] text-white' : 'bg-white text-[#596074] border border-black/[0.06] hover:border-[#021526]/20'}`}
          >
            {t === 'all' ? 'Semua' : t === 'cuti' ? 'Cuti' : 'Gaji'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.map(e => {
          const Icon = e.type === 'cuti' ? CalendarCheck2 : Wallet
          const isUrgent = e.slaHours > 0 && e.slaHours <= 12
          const canAct = (h.canActOn === e.level || h.canActOn === 'both') && e.status === 'menunggu'
          return (
            <article key={e.id} className="rounded-[12px] border border-black/[0.06] bg-[#fbfbfb] p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <span className="w-11 h-11 rounded-full bg-[#021526]/[0.06] text-[#021526] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-[#021526] text-[14.5px]">{e.submitter}</h3>
                      <span className="text-[11.5px] text-[#596074]">· {e.department}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.06em] ${LEVEL_TONE[e.level]}`}>
                        Eskalasi {e.level}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${STATUS_TONE[e.status]}`}>
                        {e.status}
                      </span>
                    </div>
                    <p className="text-[13px] text-[#021526]/80 mt-2 leading-relaxed">{e.summary}</p>
                    <div className="flex items-center gap-3 mt-3 text-[11.5px] text-[#596074] flex-wrap">
                      <span className="inline-flex items-center gap-1"><ArrowUpRightFromSquare className="w-3 h-3" /> {e.type === 'cuti' ? 'Cuti' : 'Gaji'}</span>
                      {e.amount && <><span className="text-[#596074]/30">·</span><span className="font-mono font-semibold text-[#021526]">{e.amount}</span></>}
                      <span className="text-[#596074]/30">·</span>
                      <span>Diajukan {e.submittedAt}</span>
                      {e.status === 'menunggu' && (
                        <>
                          <span className="text-[#596074]/30">·</span>
                          <span className={isUrgent ? 'text-[#B91C1C] font-semibold inline-flex items-center gap-1' : 'inline-flex items-center gap-1'}>
                            <Clock className="w-3 h-3" /> Sisa {e.slaHours} jam SLA
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {canAct && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button className="inline-flex items-center gap-1 bg-[#D0F100] hover:brightness-95 text-[#021526] font-semibold px-3.5 py-1.5 rounded-full text-[12px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Setujui
                    </button>
                    <button className="inline-flex items-center gap-1 bg-white border border-[#021526]/15 hover:border-[#021526]/30 text-[#021526] font-semibold px-3.5 py-1.5 rounded-full text-[12px]">
                      <XCircle className="w-3.5 h-3.5" /> Tolak
                    </button>
                  </div>
                )}
              </div>
            </article>
          )
        })}
        {visible.length === 0 && (
          <div className="rounded-[12px] border border-dashed border-black/[0.08] bg-white text-center py-12 text-[13px] text-[#596074]">
            Tidak ada eskalasi {filter !== 'all' ? filter : ''} di scope Anda saat ini.
          </div>
        )}
      </div>

      <p className="text-[11.5px] text-[#596074]/80">
        <strong className="text-[#021526] font-semibold">Eskalasi menengah</strong> ditangani Manajer di departemen masing-masing.
        Bila tidak dapat diselesaikan, naik ke <strong className="text-[#021526] font-semibold">eskalasi tinggi</strong> yang ditangani HR Admin.
      </p>
    </div>
  )
}
