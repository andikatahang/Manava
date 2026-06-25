import { getInitials } from '../../lib/utils'
import { cn } from '../../lib/utils'

interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base', xl: 'w-14 h-14 text-lg' }

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <div className={cn('rounded-full bg-navy text-white font-semibold flex items-center justify-center flex-shrink-0', sizes[size], className)}>
      {getInitials(name)}
    </div>
  )
}
