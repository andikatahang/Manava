import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 bg-navy-50 rounded-2xl flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-navy/40" />
      </div>
      <h3 className="text-base font-semibold text-navy mb-1">{title}</h3>
      {description && <p className="text-sm text-navy/50 max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  )
}
