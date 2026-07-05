// The big in-page header block was removed by request: the page name now
// lives in the top bar (Header), so this module only keeps the StatPill
// primitives that pages still use for inline stats.

interface StatPillProps {
  label: string
  value: string | number
  tone?: 'navy' | 'blue' | 'emerald' | 'amber' | 'red' | 'lime'
  hint?: string
}

const STAT_TONE: Record<NonNullable<StatPillProps['tone']>, string> = {
  navy: 'text-[#021526]',
  blue: 'text-[#0050F8]',
  emerald: 'text-[#047857]',
  amber: 'text-[#B45309]',
  red: 'text-[#B91C1C]',
  lime: 'text-[#021526]',
}

// Slim pill: label + angka dalam satu baris, hint jadi tooltip — statistik
// tidak lagi berupa kartu besar yang memakan ruang vertikal.
export function StatPill({ label, value, tone = 'navy', hint }: StatPillProps) {
  return (
    <div
      className="inline-flex items-center gap-2.5 rounded-full bg-[#fbfbfb] border border-black/[0.05] px-4 py-2"
      style={{ fontFamily: "'Inter Display', 'Open Runde', sans-serif" }}
      title={hint}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#596074] whitespace-nowrap">
        {label}
      </span>
      <span className={`text-[15px] font-bold tracking-[-0.02em] tabular-nums leading-none ${STAT_TONE[tone]}`}>
        {value}
      </span>
    </div>
  )
}

interface StatPillsRowProps {
  items: StatPillProps[]
  /** Dipertahankan untuk kompatibilitas pemanggil lama; layout kini flex-wrap. */
  cols?: 2 | 3 | 4
}

export function StatPillsRow({ items }: StatPillsRowProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(it => <StatPill key={it.label} {...it} />)}
    </div>
  )
}
