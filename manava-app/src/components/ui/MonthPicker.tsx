// Calendar-style month/year picker — replaces the bare native <input type="month">
// for periode selection (report generation, filters, etc).

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

interface MonthPickerProps {
  value: string // "YYYY-MM"
  onChange: (period: string) => void
  maxPeriod?: string // "YYYY-MM" — disallow months after this (defaults to current month)
}

function formatLabel(period: string): string {
  const [y, m] = period.split('-')
  const idx = Number(m) - 1
  return `${MONTH_LABELS[idx] ?? m} ${y}`
}

function currentPeriod(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function MonthPicker({ value, onChange, maxPeriod = currentPeriod() }: MonthPickerProps) {
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(() => Number(value.split('-')[0]))
  const anchorRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState({ top: 0, left: 0 })

  const [selectedYear, selectedMonth] = value.split('-').map(Number)
  const [maxYear, maxMonth] = maxPeriod.split('-').map(Number)

  useEffect(() => {
    if (!open) return
    setViewYear(Number(value.split('-')[0]))
    const rect = anchorRef.current?.getBoundingClientRect()
    if (rect) setCoords({ top: rect.bottom + window.scrollY + 6, left: rect.left + window.scrollX })
  }, [open, value])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) return
      setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function pickMonth(monthIdx: number) {
    onChange(`${viewYear}-${String(monthIdx + 1).padStart(2, '0')}`)
    setOpen(false)
  }

  const viewExceedsMax = viewYear > maxYear
  const viewBelowMin = false

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className="input w-full flex items-center justify-between gap-2 text-left"
      >
        <span className="text-navy font-medium">{formatLabel(value)}</span>
        <Calendar className="w-4 h-4 text-navy/40 shrink-0" />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'absolute', top: coords.top, left: coords.left }}
          className="z-[70] w-64 bg-white rounded-xl border border-border shadow-card-lg p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setViewYear(y => y - 1)}
              disabled={viewBelowMin}
              className="p-1.5 rounded-lg text-navy/50 hover:text-navy hover:bg-navy/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-navy tabular-nums">{viewYear}</span>
            <button
              type="button"
              onClick={() => setViewYear(y => y + 1)}
              disabled={viewExceedsMax}
              className="p-1.5 rounded-lg text-navy/50 hover:text-navy hover:bg-navy/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_LABELS.map((label, idx) => {
              const disabled = viewYear === maxYear && idx + 1 > maxMonth
              const isSelected = viewYear === selectedYear && idx + 1 === selectedMonth
              return (
                <button
                  key={label}
                  type="button"
                  disabled={disabled}
                  onClick={() => pickMonth(idx)}
                  className={`px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-navy text-white'
                      : disabled
                        ? 'text-navy/25 cursor-not-allowed'
                        : 'text-navy/70 hover:bg-navy/5 hover:text-navy'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
