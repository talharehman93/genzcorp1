import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-100 shadow-sm',
        className
      )}
    >
      {children}
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string
  change?: string
  changePositive?: boolean
  icon: React.ReactNode
}

export function MetricCard({ title, value, change, changePositive, icon }: MetricCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{title}</p>
        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-semibold text-slate-900 tracking-tight">{value}</p>
      {change && (
        <p
          className={cn(
            'text-xs mt-1 font-medium',
            changePositive ? 'text-emerald-600' : 'text-red-500'
          )}
        >
          {changePositive ? '↑' : '↓'} {change}
        </p>
      )}
    </Card>
  )
}
