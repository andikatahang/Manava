import { Check } from 'lucide-react'
import { cn } from '../../lib/utils'
import { STAGES, completedStages } from './lifecycle'
import type { ProjectStatus } from '../../types'

// Horizontal lifecycle stepper — the project's journey at a glance.
export function StageRail({ status }: { status: ProjectStatus }) {
  const done = completedStages(status)
  const isCompleted = status === 'completed'
  const isCancelled = status === 'cancelled'

  return (
    <ol className="flex items-start">
      {STAGES.map((label, i) => {
        const state: 'done' | 'active' | 'upcoming' =
          isCompleted || i < done ? 'done'
          : i === done && !isCancelled ? 'active'
          : 'upcoming'
        const isLast = i === STAGES.length - 1

        return (
          <li key={label} className="flex-1 flex flex-col items-center relative">
            {/* Connector to next node */}
            {!isLast && (
              <span
                className={cn(
                  'absolute top-3.5 left-1/2 w-full h-0.5 -z-0',
                  state === 'done' ? 'bg-navy' : 'bg-navy/10'
                )}
              />
            )}

            <span
              className={cn(
                'relative z-10 grid place-items-center w-7 h-7 rounded-full text-xs font-bold transition-colors',
                state === 'done' && 'bg-navy text-white',
                state === 'active' && 'bg-white text-navy ring-2 ring-navy',
                state === 'upcoming' && 'bg-navy/5 text-navy/40 ring-1 ring-navy/10'
              )}
            >
              {state === 'done' ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </span>

            <span
              className={cn(
                'mt-2 text-[11px] sm:text-xs font-medium text-center px-1',
                state === 'upcoming' ? 'text-navy/40' : 'text-navy'
              )}
            >
              {label}
            </span>
            {state === 'active' && (
              <span className="text-[10px] text-navy/45 mt-0.5">Tahap ini</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

export default StageRail
