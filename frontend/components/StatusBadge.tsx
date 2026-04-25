import type { StrStatus, RequirementLevel } from '@/types/market'
import { formatStrStatus, strStatusTooltip } from '@/lib/formatters'

// Two call shapes: market-level STR status (status) or property-level requirement
// strength (level). Exactly one must be provided. Existing call sites pass `status`;
// the property requirements list passes `level`.
type Props =
  | { status: StrStatus; level?: never; size?: 'sm' | 'md' | 'lg' }
  | { level: RequirementLevel; status?: never; size?: 'sm' | 'md' | 'lg' }

const strStatusStyles: Record<StrStatus, string> = {
  allowed:     'bg-status-allowed-bg text-status-allowed-text border border-status-allowed-border',
  conditional: 'bg-status-conditional-bg text-status-conditional-text border border-status-conditional-border',
  not_allowed: 'bg-status-not-allowed-bg text-status-not-allowed-text border border-status-not-allowed-border',
}

// Requirement levels use neutral styling — status colors are reserved for STR legality.
// The shape icon (check / warning / info) carries the meaning.
const levelStyles: Record<RequirementLevel, string> = {
  required:      'bg-neutral-100 text-neutral-700 border border-neutral-200',
  conditional:   'bg-neutral-100 text-neutral-700 border border-neutral-200',
  informational: 'bg-neutral-100 text-neutral-600 border border-neutral-200',
}

const levelLabel: Record<RequirementLevel, string> = {
  required:      'Required',
  conditional:   'Conditional',
  informational: 'Informational',
}

const levelTooltip: Record<RequirementLevel, string> = {
  required:      'This requirement applies to your property and must be met.',
  conditional:   'This requirement applies depending on property characteristics — verify your case.',
  informational: 'Background context for this property; not a binding requirement.',
}

const sizes = {
  sm: 'px-2.5 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base font-medium',
}

// Shape icons — provide a non-color differentiator for color-blind users.
// aria-hidden because the text label carries the meaning.
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

function InfoIcon({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1"/>
      <path d="M6 5v3M6 3.5h.01" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  )
}

const iconSizeClass: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
  lg: 'w-3.5 h-3.5',
}

function StrStatusIcon({ status, size }: { status: StrStatus; size: 'sm' | 'md' | 'lg' }) {
  const cls = `flex-shrink-0 ${iconSizeClass[size]}`
  if (status === 'allowed') return <CheckIcon className={cls} />
  if (status === 'conditional') return <WarningIcon className={cls} />
  return <XIcon className={cls} />
}

function LevelIcon({ level, size }: { level: RequirementLevel; size: 'sm' | 'md' | 'lg' }) {
  const cls = `flex-shrink-0 ${iconSizeClass[size]}`
  if (level === 'required') return <WarningIcon className={cls} />
  if (level === 'conditional') return <CheckIcon className={cls} />
  return <InfoIcon className={cls} />
}

export default function StatusBadge(props: Props) {
  const size = props.size ?? 'md'

  if ('level' in props && props.level !== undefined) {
    const level = props.level
    return (
      <span className="relative group inline-flex">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-medium cursor-help ${levelStyles[level]} ${sizes[size]}`}
        >
          <LevelIcon level={level} size={size} />
          {levelLabel[level]}
        </span>
        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10 whitespace-normal text-center">
          {levelTooltip[level]}
        </span>
      </span>
    )
  }

  const status = props.status as StrStatus
  return (
    <span className="relative group inline-flex">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-medium cursor-help ${strStatusStyles[status]} ${sizes[size]}`}
      >
        <StrStatusIcon status={status} size={size} />
        {formatStrStatus(status)}
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10 whitespace-normal text-center">
        {strStatusTooltip[status]}
      </span>
    </span>
  )
}
