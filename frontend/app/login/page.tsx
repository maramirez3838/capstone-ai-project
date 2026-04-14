'use client'

import { useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo') ?? '/'
  const { signIn, isSignedIn, mounted } = useAuth()

  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  if (mounted && isSignedIn) {
    router.replace(returnTo)
    return null
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()

    if (!trimmed || !trimmed.includes('@')) {
      setError('Enter a valid email address.')
      return
    }

    setError('')
    signIn(trimmed)
    setSubmitted(true)

    setTimeout(() => {
      router.push(returnTo)
    }, 800)
  }

  if (submitted) {
    return (
      <div className="text-center py-4">
        <div className="text-3xl mb-3">✓</div>
        <p className="text-gray-300 font-medium">Signed in. Redirecting...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-300 mb-1.5"
        >
          Email address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (error) setError('')
          }}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-900/50 outline-none transition-all"
          autoFocus
        />
        {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
      >
        Continue
      </button>

      <p className="text-center text-xs text-gray-600">
        UI prototype — no real authentication. Any email will work.
      </p>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="max-w-sm mx-auto px-6 py-20">
      <div className="mb-8 text-center">
        <Link
          href="/"
          className="text-base font-bold text-gray-100 hover:text-indigo-400 transition-colors"
        >
          STR Comply
        </Link>
        <h1 className="mt-4 text-xl font-semibold text-gray-100">Sign in</h1>
        <p className="mt-1.5 text-sm text-gray-500">
          Sign in to track markets and manage your acquisition pipeline.
        </p>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 px-6 py-8">
        <Suspense fallback={<div className="h-32 animate-pulse bg-gray-800 rounded-lg" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
