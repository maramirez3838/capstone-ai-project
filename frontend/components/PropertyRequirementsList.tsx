import type { PropertyRequirement } from '@/types/market'
import StatusBadge from '@/components/StatusBadge'

interface Props {
  requirements: PropertyRequirement[]
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
      className={className ?? 'h-3 w-3'}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  )
}

// Renders the property-level requirements returned by GET /api/property/requirements.
// Visual layout mirrors RuleCard so the property and market views feel consistent,
// but uses StatusBadge with `level` (not `status`) — these are property-scoped
// requirements, not market-wide STR legality.
export default function PropertyRequirementsList({ requirements }: Props) {
  if (requirements.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white px-5 py-6 text-sm text-gray-500">
        No additional property-level requirements were identified beyond the
        market-wide rules. Always verify with the source documents.
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 overflow-hidden">
      {requirements.map((req) => (
        <article
          key={req.ruleKey}
          className="bg-white px-5 py-4"
          aria-label={`${req.label} requirement`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400">
                {req.label}
              </p>
              <p className="mt-1 text-sm text-gray-900 font-medium">{req.value}</p>
            </div>
            <StatusBadge level={req.requirementLevel} size="sm" />
          </div>

          {req.details && (
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">{req.details}</p>
          )}

          {req.codeRef && (
            <div className="mt-3">
              {req.codeUrl ? (
                <a
                  href={req.codeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-accent-500 hover:text-accent-700 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded"
                >
                  <ExternalLinkIcon />
                  {req.codeRef}
                  <span className="sr-only">(opens in new tab)</span>
                </a>
              ) : (
                <span className="text-xs text-gray-400 font-mono">{req.codeRef}</span>
              )}
            </div>
          )}
        </article>
      ))}
    </div>
  )
}
