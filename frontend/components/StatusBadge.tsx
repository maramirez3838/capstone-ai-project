import type { StrStatus } from '@/types/market'
import { formatStrStatus } from '@/lib/formatters'

interface Props {
  status: StrStatus
  size?: 'sm' | 'md' | 'lg'
}

const styles: Record<StrStatus, string> = {
  allowed: 'bg-green-950/60 text-green-400 border border-green-800',
  conditional: 'bg-amber-950/60 text-amber-400 border border-amber-800',
  not_allowed: 'bg-red-950/60 text-red-400 border border-red-800',
}

const dots: Record<StrStatus, string> = {
  allowed: 'bg-green-400',
  conditional: 'bg-amber-400',
  not_allowed: 'bg-red-400',
}

const sizes = {
  sm: 'px-2.5 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base font-semibold',
}

export default function StatusBadge({ status, size = 'md' }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${styles[status]} ${sizes[size]}`}
    >
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dots[status]}`} />
      {formatStrStatus(status)}
    </span>
  )
}
