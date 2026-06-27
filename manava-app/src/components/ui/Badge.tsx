import { cn } from '../../lib/utils'

type Variant = 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'navy'

const variantClasses: Record<Variant, string> = {
  blue:   'bg-blue-50 text-blue-700',
  green:  'bg-emerald-50 text-emerald-700',
  yellow: 'bg-amber-50 text-amber-700',
  red:    'bg-red-50 text-red-700',
  gray:   'bg-gray-100 text-gray-600',
  navy:   'bg-navy-50 text-navy',
}

interface BadgeProps {
  variant?: Variant
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'gray', children, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variantClasses[variant], className)}>
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: Variant }> = {
    // Projects
    draft:              { label: 'Draf', variant: 'gray' },
    awaiting_dp:        { label: 'Menunggu DP', variant: 'yellow' },
    in_progress:        { label: 'Berjalan', variant: 'blue' },
    in_review:          { label: 'Ditinjau', variant: 'navy' },
    revision:           { label: 'Revisi', variant: 'yellow' },
    disputed:           { label: 'Disengketakan', variant: 'red' },
    completed:          { label: 'Selesai', variant: 'green' },
    cancelled:          { label: 'Dibatalkan', variant: 'gray' },
    // Applicants
    applied:            { label: 'Melamar', variant: 'gray' },
    screening:          { label: 'Seleksi', variant: 'blue' },
    interview:          { label: 'Wawancara', variant: 'navy' },
    offered:            { label: 'Ditawari', variant: 'yellow' },
    offer_accepted:     { label: 'Tawaran Diterima', variant: 'green' },
    confirmed:          { label: 'Terkonfirmasi', variant: 'green' },
    rejected:           { label: 'Ditolak', variant: 'red' },
    offer_expired:      { label: 'Kedaluwarsa', variant: 'gray' },
    // Leave & Payslip
    pending:            { label: 'Menunggu', variant: 'yellow' },
    approved:           { label: 'Disetujui', variant: 'green' },
    rejected_leave:     { label: 'Ditolak', variant: 'red' },
    finalized:          { label: 'Difinalisasi', variant: 'blue' },
    paid:               { label: 'Dibayar', variant: 'green' },
    voided:             { label: 'Dibatalkan', variant: 'red' },
    // Dispute
    open:               { label: 'Terbuka', variant: 'red' },
    in_mediation:       { label: 'Mediasi', variant: 'yellow' },
    resolved:           { label: 'Selesai', variant: 'green' },
    // Editor
    active:             { label: 'Aktif', variant: 'green' },
    suspended:          { label: 'Ditangguhkan', variant: 'red' },
    excellent:          { label: 'Sangat Baik', variant: 'green' },
    good:               { label: 'Baik', variant: 'blue' },
    needs_improvement:  { label: 'Perlu Peningkatan', variant: 'red' },
    // Transaction
    success:            { label: 'Berhasil', variant: 'green' },
    failed:             { label: 'Gagal', variant: 'red' },
    // Deliverable versions
    pending_review:     { label: 'Menunggu Tinjauan', variant: 'yellow' },
    revision_requested: { label: 'Diminta Revisi', variant: 'yellow' },
    // Revision
    minor:              { label: 'Minor', variant: 'green' },
    major:              { label: 'Major', variant: 'red' },
    uncertain:          { label: 'Tidak Pasti', variant: 'yellow' },
    awaiting_topup:     { label: 'Menunggu Top-up', variant: 'yellow' },
    accepted:           { label: 'Diterima', variant: 'green' },
  }
  const c = config[status] ?? { label: status, variant: 'gray' as Variant }
  return <Badge variant={c.variant}>{c.label}</Badge>
}
