import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '../../lib/utils'

interface StarRatingProps {
  /** Rating on a 1–5 scale (the current selection when interactive). */
  value: number
  /** Optional review count, rendered as “(142)”. */
  count?: number
  /** Star size in pixels. */
  size?: number
  /** Render the numeric value next to the stars. */
  showValue?: boolean
  className?: string
  /** Render selectable star buttons and report changes via `onChange`. */
  interactive?: boolean
  onChange?: (value: number) => void
}

/**
 * 1–5 star rating in the Manava brand palette (amber fill on a light-gray
 * track). Read-only by default (roster, submitted reviews); pass `interactive`
 * to capture a rating. Star markup lives here so it's shared in one place.
 */
export function StarRating({
  value,
  count,
  size = 14,
  showValue = true,
  className,
  interactive = false,
  onChange,
}: StarRatingProps) {
  const [hover, setHover] = useState(0)
  const shown = interactive && hover > 0 ? hover : value
  const filled = Math.round(shown)

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className="inline-flex items-center gap-0.5"
        role={interactive ? 'group' : 'img'}
        aria-label={interactive ? 'Pilih rating 1 sampai 5 bintang' : `${value.toFixed(1)} dari 5 bintang`}
      >
        {[1, 2, 3, 4, 5].map(i => {
          const star = (
            <Star
              style={{ width: size, height: size }}
              strokeWidth={1.75}
              className={i <= filled ? 'text-amber-500 fill-amber-500' : 'text-[#dcdcdc]'}
            />
          )
          if (!interactive) return <span key={i}>{star}</span>
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange?.(i)}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(0)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(0)}
              className="p-0.5 -m-0.5 rounded transition-transform hover:scale-110"
              aria-label={`Beri ${i} bintang`}
              aria-pressed={value === i}
            >
              {star}
            </button>
          )
        })}
      </span>
      {showValue && (
        <span className="text-[13px] font-bold text-[#1b1b1b] tabular-nums">{value.toFixed(1)}</span>
      )}
      {count !== undefined && <span className="text-[12px] text-[#bbb]">({count})</span>}
    </div>
  )
}
