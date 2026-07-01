import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null
  // Portal to <body> so the fixed overlay is measured against the viewport, not
  // a transformed ancestor (e.g. `.card:hover { transform }`) which would create
  // a containing block and clip the modal inside the panel it was opened from.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative bg-white rounded-2xl shadow-card-lg w-full', sizes[size])}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-navy">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-navy-50 text-navy/50 hover:text-navy transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
