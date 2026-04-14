// Server component — queries the DB for supported markets, then passes them
// to UnsupportedContent (client component) as props.
// This pattern is needed because UnsupportedContent uses useSearchParams(),
// which requires a client component, but data fetching should be server-side.

import { Suspense } from 'react'
import { db } from '@/lib/db'
import UnsupportedContent from './UnsupportedContent'

export default async function UnsupportedPage() {
  const markets = await db.market.findMany({
    where: { supportStatus: 'supported' },
    select: { slug: true, name: true, countyName: true, strStatus: true },
    orderBy: { name: 'asc' },
  })

  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-6 py-16" />}>
      <UnsupportedContent markets={markets} />
    </Suspense>
  )
}
