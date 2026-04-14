import type { StrStatus } from '@/types/market'
import { formatStrStatus, strStatusTooltip } from '@/lib/formatters'

interface Props {
  status: StrStatus
  size?: 'sm' | 'md' | 'lg'
}

const styles: Record<StrStatus, string> = {
  allowed: 'bg-green-50 text-green-700 border border-green-200',
  conditional: 'bg-amber-50 text-amber-700 border border-amber-200',
  not_allowed: 'bg-red-50 text-red-700 border border-red-200',
}

const sizes = {
  sm: 'px-2.5 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base font-semibold',
}

// Shape icons — provide a non-color differentiator for color-blind users.
// aria-hidden because the text label (Allowed / Conditional / Not Permitted) carries the meaning.
function CheckIcon({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1"/>
      <path d="M3.5 6l1.5 1.5 3.5-3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function WarningIcon({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 1.5L10.5 9.5H1.5L6 1.5z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
      <path d="M6 5v2M6 8.5h.01" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  )
}

function XIcon({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1"/>
      <path d="M4 4l4 4M8 4l-4 4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  )
}

const iconSizeClass: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
  lg: 'w-3.5 h-3.5',
}

function StatusIcon({ status, size }: { status: StrStatus; size: 'sm' | 'md' | 'lg' }) {
  const cls = `flex-shrink-0 ${iconSizeClass[size]}`
  if (status === 'allowed') return <CheckIcon className={cls} />
  if (status === 'conditional') return <WarningIcon className={cls} />
  return <XIcon className={cls} />
}

export default function StatusBadge({ status, size = 'md' }: Props) {
  return (
    <span className="relative group inline-flex">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-medium cursor-help ${styles[status]} ${sizes[size]}`}
      >
        {/* Shape icon differentiates status without relying on color alone */}
        <StatusIcon status={status} size={size} />
        {formatStrStatus(status)}
      </span>
      {/* Tooltip */}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10 whitespace-normal text-center">
        {strStatusTooltip[status]}
      </span>
    </span>
  )
}
