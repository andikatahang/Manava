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
    draft:              { label: 'Draft', variant: 'gray' },
    awaiting_dp:        { label: 'Awaiting DP', variant: 'yellow' },
    in_progress:        { label: 'In Progress', variant: 'blue' },
    in_review:          { label: 'In Review', variant: 'navy' },
    revision:           { label: 'Revision', variant: 'yellow' },
    disputed:           { label: 'Disputed', variant: 'red' },
    completed:          { label: 'Completed', variant: 'green' },
    cancelled:          { label: 'Cancelled', variant: 'gray' },
    // Applicants
    applied:            { label: 'Applied', variant: 'gray' },
    screening:          { label: 'Screening', variant: 'blue' },
    interview:          { label: 'Interview', variant: 'navy' },
    offered:            { label: 'Offered', variant: 'yellow' },
    offer_accepted:     { label: 'Offer Accepted', variant: 'green' },
    confirmed:          { label: 'Confirmed', variant: 'green' },
    rejected:           { label: 'Rejected', variant: 'red' },
    offer_expired:      { label: 'Expired', variant: 'gray' },
    // Leave & Payslip
    pending:            { label: 'Pending', variant: 'yellow' },
    approved:           { label: 'Approved', variant: 'green' },
    rejected_leave:     { label: 'Rejected', variant: 'red' },
    finalized:          { label: 'Finalized', variant: 'blue' },
    paid:               { label: 'Paid', variant: 'green' },
    voided:             { label: 'Voided', variant: 'red' },
    // Dispute
    open:               { label: 'Open', variant: 'red' },
    in_mediation:       { label: 'In Mediation', variant: 'yellow' },
    resolved:           { label: 'Resolved', variant: 'green' },
    // Editor
    active:             { label: 'Active', variant: 'green' },
    suspended:          { label: 'Suspended', variant: 'red' },
    excellent:          { label: 'Excellent', variant: 'green' },
    good:               { label: 'Good', variant: 'blue' },
    needs_improvement:  { label: 'Needs Improvement', variant: 'red' },
    // Transaction
    success:            { label: 'Success', variant: 'green' },
    failed:             { label: 'Failed', variant: 'red' },
    // Revision
    minor:              { label: 'Minor', variant: 'green' },
    major:              { label: 'Major', variant: 'red' },
    uncertain:          { label: 'Uncertain', variant: 'yellow' },
    awaiting_topup:     { label: 'Awaiting Top-up', variant: 'yellow' },
    accepted:           { label: 'Accepted', variant: 'green' },
  }
  const c = config[status] ?? { label: status, variant: 'gray' as Variant }
  return <Badge variant={c.variant}>{c.label}</Badge>
}
