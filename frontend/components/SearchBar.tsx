'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { resolveSearch } from '@/lib/search'
import { logEvent } from '@/lib/telemetry'

export default function SearchBar() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()

    if (!trimmed) {
      setError('Enter a market name to search.')
      return
    }

    setError('')
    logEvent('search_performed', { queryText: trimmed })

    const result = resolveSearch(trimmed)

    if (result) {
      router.push(`/market/${result.slug}`)
    } else {
      router.push(`/unsupported?q=${encodeURIComponent(trimmed)}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-0 rounded-xl overflow-hidden border border-gray-700 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-900/50 transition-all">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (error) setError('')
          }}
          placeholder="Search a market — try Santa Monica or West Hollywood"
          className="flex-1 px-5 py-3.5 text-base text-gray-100 placeholder-gray-500 bg-gray-900 outline-none"
          autoFocus
        />
        <button
          type="submit"
          className="px-6 py-3.5 bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 active:bg-indigo-700 transition-colors whitespace-nowrap"
        >
          Search
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </form>
  )
}
