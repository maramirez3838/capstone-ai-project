// Auth session helper — placeholder until NextAuth is wired in
//
// WHY THIS FILE EXISTS:
// All watchlist API routes require an authenticated user. Auth (NextAuth magic
// link) is deferred to a future session. Rather than leave the routes unguarded
// or skip building them, we use this single placeholder.
//
// HOW TO USE:
// Every protected route calls requireSession(request) at the top.
// If it returns null, the route returns a 401. When NextAuth is added,
// only this file changes — the route handlers don't need to be touched.
//
// WHAT TO DO WHEN ADDING AUTH:
// 1. Install next-auth: `npm install next-auth`
// 2. Replace the body of requireSession() with real session validation:
//    import { getServerSession } from 'next-auth'
//    import { authOptions } from '@/lib/auth-options'
//    const session = await getServerSession(authOptions)
//    if (!session?.user?.email) return null
//    const user = await db.user.findUnique({ where: { email: session.user.email } })
//    return user
// 3. Delete this comment block.

import type { NextRequest } from 'next/server'

export interface SessionUser {
  id: string
  email: string
  name: string | null
}

/**
 * Returns the authenticated user for the current request.
 * Returns null if the user is not authenticated.
 *
 * When NextAuth is wired in, this function becomes the real session check.
 * Until then, it always returns null — all protected routes respond 401.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function requireSession(_request: NextRequest): Promise<SessionUser | null> {
  // TODO(auth): replace with NextAuth session validation
  return null
}
