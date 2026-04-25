interface Props {
  note: string
  reviewFlags: string[]
}

// Renders the property requirements agent's confidence note plus the list of
// items it flagged for human verification. Uses neutral styling — status colors
// are reserved for STR legality so confidence callouts must not look like alerts.
export default function ConfidenceCallout({ note, reviewFlags }: Props) {
  return (
    <aside
      role="note"
      aria-label="Confidence and verification"
      className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3"
    >
      <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
        Confidence and verification
      </p>
      <p className="mt-2 text-sm text-neutral-700 leading-relaxed">{note}</p>

      {reviewFlags.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-neutral-700">Verify these items:</p>
          <ul className="mt-1.5 space-y-1 text-sm text-neutral-700 list-disc list-inside marker:text-neutral-400">
            {reviewFlags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  )
}
