'use client'

import { useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useSession } from 'next-auth/react'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo') ?? '/'
  const { status } = useSession()

  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  // Already signed in — redirect immediately
  if (status === 'authenticated') {
    router.replace(returnTo)
    return null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()

    if (!trimmed || !trimmed.includes('@')) {
      setError('Enter a valid email address.')
      return
    }

    setError('')
    setSubmitted(true)

    // Trigger Resend to send the magic link. Auth completes when the user
    // clicks the link in their email — no redirect happens here.
    await signIn('resend', { email: trimmed, callbackUrl: returnTo, redirect: false })
  }

  if (submitted) {
    return (
      <div className="text-center py-4 space-y-3">
        <div className="text-3xl">✉</div>
        <p className="text-gray-100 font-medium">Check your email</p>
        <p className="text-sm text-gray-400">
          We sent a sign-in link to <span className="text-gray-200">{email}</span>.
          Click it to continue.
        </p>
        <p className="text-xs text-gray-600 pt-2">
          Didn&apos;t get it? Check your spam folder or{' '}
          <button
            onClick={() => { setSubmitted(false); setEmail('') }}
            className="text-accent-500 hover:text-accent-700 underline"
          >
            try again
          </button>
          .
        </p>
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
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-accent-500 focus:ring-2 focus:ring-accent-50 outline-none transition-all"
          autoFocus
        />
        {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-accent-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-700 transition-colors"
      >
        Send sign-in link
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="max-w-sm mx-auto px-6 py-20">
      <div className="mb-8 text-center">
        <Link
          href="/"
          className="text-base font-medium text-gray-100 hover:text-accent-500 transition-colors"
        >
          STR Comply
        </Link>
        <h1 className="mt-4 text-xl font-medium text-gray-100">Sign in</h1>
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
