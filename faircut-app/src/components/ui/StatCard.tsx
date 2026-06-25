import { cn } from '../../lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  change?: string
  changeType?: 'up' | 'down' | 'neutral'
  accent?: string
  className?: string
}

export function StatCard({ label, value, icon: Icon, change, changeType = 'neutral', accent = 'bg-navy-50', className }: StatCardProps) {
  return (
    <div className={cn('card flex items-start justify-between', className)}>
      <div className="flex flex-col gap-1">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        {change && (
          <p className={cn('text-xs font-medium mt-1', changeType === 'up' ? 'text-emerald-600' : changeType === 'down' ? 'text-red-600' : 'text-navy/50')}>
            {change}
          </p>
        )}
      </div>
      {Icon && (
        <div className={cn('p-3 rounded-xl', accent)}>
          <Icon className="w-5 h-5 text-navy" />
        </div>
      )}
    </div>
  )
}
