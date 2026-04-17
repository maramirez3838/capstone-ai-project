import type { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

export interface SessionUser {
  id: string
  email: string
  name: string | null
}

/**
 * Returns the authenticated user for the current request.
 * Returns null if the user is not authenticated.
 *
 * All protected routes (watchlist GET/POST/DELETE) call this at the top
 * and return 401 if it returns null.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function requireSession(_request: NextRequest): Promise<SessionUser | null> {
  const session = await auth()
  if (!session?.user?.email) return null

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  return user
}
