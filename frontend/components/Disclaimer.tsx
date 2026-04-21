// Required on every market result view — do not remove or paraphrase.
function InfoIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4 flex-shrink-0 mt-0.5 text-accent-700"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

export default function Disclaimer() {
  return (
    <aside
      role="note"
      aria-label="Disclaimer"
      className="flex items-start gap-3 rounded-xl bg-accent-50 border border-accent-500 px-4 py-3"
    >
      <InfoIcon />
      <p className="text-xs text-accent-700 leading-relaxed">
        <span className="font-medium">Disclaimer: </span>
        This summary is for informational purposes only and is not legal advice.
        Always verify requirements using official municipal sources and consult a
        qualified attorney for high-stakes decisions.
      </p>
    </aside>
  )
}
