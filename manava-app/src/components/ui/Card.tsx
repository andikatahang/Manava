import type { ReactNode } from 'react'

/**
 * Manava card — the project-wide surface standard.
 *
 * DNA (from the approved reference):
 *  - warm light-gray surface (or deep navy in dark sections), large 22px radius
 *  - barely-there border + soft, low shadow that lifts on hover
 *  - composition: a `media` zone breathes at the TOP, title + description
 *    are anchored at the BOTTOM (content sits on the floor of the card)
 *  - Inter Display title over muted sans body
 *
 * Use this for every card surface across the app. Reach for `tone="dark"`
 * on navy sections, `tone="light"` everywhere else.
 */
type CardTone = 'light' | 'dark'

interface CardProps {
  title: string
  desc?: string
  /** Visual that breathes at the top of the card: icon row, illustration, mini-diagram. */
  media?: ReactNode
  tone?: CardTone
  /** Extra classes on the card shell (e.g. spanning columns, min-height overrides). */
  className?: string
  /** Extra classes on the media zone. */
  mediaClassName?: string
}

const tones: Record<CardTone, { surface: string; title: string; desc: string }> = {
  light: {
    surface:
      'bg-[#fbfbfb] border border-black/[0.05] hover:border-black/[0.1] hover:shadow-[0_14px_44px_-16px_rgba(2,21,38,0.18)] hover:-translate-y-0.5 motion-reduce:hover:translate-y-0',
    title: 'text-[#021526]',
    desc: 'text-[#596074]',
  },
  dark: {
    surface:
      'bg-[#0c2438] border border-white/[0.08] hover:border-white/[0.16] hover:shadow-[0_14px_44px_-16px_rgba(0,0,0,0.55)] hover:-translate-y-0.5 motion-reduce:hover:translate-y-0',
    title: 'text-white',
    desc: 'text-[#9aa3bd]',
  },
}

export function Card({
  title,
  desc,
  media,
  tone = 'light',
  className = '',
  mediaClassName = '',
}: CardProps) {
  const t = tones[tone]
  return (
    <article
      className={`group flex flex-col min-h-[260px] rounded-[8px] p-7 shadow-[0_1px_2px_rgba(2,21,38,0.04)] transition-all duration-200 ${t.surface} ${className}`}
    >
      {media !== undefined && <div className={`mb-8 ${mediaClassName}`}>{media}</div>}
      <div className="mt-auto">
        <h3
          className={`mb-2 text-[17px] font-semibold leading-snug tracking-[-0.01em] ${t.title}`}
          style={{ fontFamily: "'Inter Display', 'Open Runde', sans-serif" }}
        >
          {title}
        </h3>
        {desc && <p className={`max-w-[46ch] text-[14px] leading-[1.6] ${t.desc}`}>{desc}</p>}
      </div>
    </article>
  )
}
