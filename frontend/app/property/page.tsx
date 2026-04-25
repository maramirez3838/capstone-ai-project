// Server entry — Suspense-wraps PropertyContent which uses useSearchParams.
// The /property route requires the address to already be cached in the Property
// table (i.e. /api/search must have resolved it first); the API enforces this.

import { Suspense } from 'react'
import PropertyContent from './PropertyContent'

export const metadata = {
  title: 'Property compliance — STR Comply',
}

export default function PropertyPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-6 py-10" aria-hidden="true" />}>
      <PropertyContent />
    </Suspense>
  )
}
