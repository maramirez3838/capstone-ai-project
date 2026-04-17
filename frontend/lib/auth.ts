'use client'

// Real auth state backed by NextAuth v5 (Auth.js).
// Keeps the same useAuth() interface so watchlist/page.tsx and Nav
// don't need to change.

import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react'

export function useAuth() {
  const { data: session, status } = useSession()

  // 'loading' means the session check is in flight — treat as not yet mounted
  // to prevent SSR hydration mismatches (same pattern as the localStorage mock).
  const mounted = status !== 'loading'
  const isSignedIn = status === 'authenticated'
  const email = session?.user?.email ?? null

  function signIn(emailInput: string) {
    // Sends the magic link via Resend. The page switches to "check your email"
    // state after this call — the user completes auth by clicking the link.
    nextAuthSignIn('resend', { email: emailInput })
  }

  function signOut() {
    nextAuthSignOut({ callbackUrl: '/' })
  }

  return { isSignedIn, email, signIn, signOut, mounted }
}
