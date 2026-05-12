import { cn } from '@/lib/utils'

type Variant = 'success' | 'error' | 'warning' | 'pending' | 'default' | 'info'

const variants: Record<Variant, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  error: 'bg-red-50 text-red-700 border-red-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
  pending: 'bg-slate-100 text-slate-600 border-slate-200',
  info: 'bg-blue-50 text-blue-700 border-blue-100',
  default: 'bg-slate-100 text-slate-700 border-slate-200',
}

const statusVariantMap: Record<string, Variant> = {
  completed: 'success',
  failed: 'error',
  expired: 'error',
  processing: 'warning',
  pending: 'pending',
}

interface BadgeProps {
  children: React.ReactNode
  variant?: Variant
  status?: string
  className?: string
}

export function Badge({ children, variant, status, className }: BadgeProps) {
  const resolvedVariant = variant ?? (status ? statusVariantMap[status] ?? 'default' : 'default')
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variants[resolvedVariant],
        className
      )}
    >
      {children}
    </span>
  )
}
