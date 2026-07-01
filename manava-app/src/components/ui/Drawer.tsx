import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  /** Optional action area rendered top-right next to close. */
  headerAction?: React.ReactNode
  /** Sticky footer (typically primary/secondary action buttons). */
  footer?: React.ReactNode
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizes: Record<NonNullable<DrawerProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
}

/**
 * Right-side slide-in panel for progressive disclosure.
 * Use when a row in a list needs detail without leaving the list context.
 */
export function Drawer({
  open, onClose, title, subtitle, headerAction, footer, children, size = 'md',
}: DrawerProps) {
  // Escape-to-close keeps keyboard parity with Modal.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 transition-opacity duration-200',
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
      )}
      aria-hidden={!open}
    >
      <div
        className="absolute inset-0 bg-navy/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'absolute inset-y-0 right-0 w-full bg-white shadow-card-lg flex flex-col',
          'transform transition-transform duration-200 will-change-transform',
          sizes[size],
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <header className="flex items-start justify-between gap-3 px-6 py-4 border-b border-border shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-navy truncate">{title}</h3>
            {subtitle && <p className="text-xs text-navy/50 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerAction}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-navy-50 text-navy/50 hover:text-navy transition-colors"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <footer className="px-6 py-4 border-t border-border bg-white shrink-0">
            {footer}
          </footer>
        )}
      </aside>
    </div>
  )
}
