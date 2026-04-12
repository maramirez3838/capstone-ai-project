'use client'

// Mock auth state for UI phase — backed by localStorage.
// When BE joins, replace with NextAuth session hooks.

import { useState, useEffect } from 'react'

const AUTH_KEY = 'str_comply_auth'
const EMAIL_KEY = 'str_comply_email'

export function useAuth() {
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Read from localStorage after mount to avoid SSR hydration mismatch
  useEffect(() => {
    setMounted(true)
    setIsSignedIn(localStorage.getItem(AUTH_KEY) === 'true')
    setEmail(localStorage.getItem(EMAIL_KEY))
  }, [])

  function signIn(emailInput: string) {
    localStorage.setItem(AUTH_KEY, 'true')
    localStorage.setItem(EMAIL_KEY, emailInput)
    setIsSignedIn(true)
    setEmail(emailInput)
  }

  function signOut() {
    localStorage.removeItem(AUTH_KEY)
    localStorage.removeItem(EMAIL_KEY)
    setIsSignedIn(false)
    setEmail(null)
  }

  return { isSignedIn, email, signIn, signOut, mounted }
}
