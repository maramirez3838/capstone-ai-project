import { createHmac, timingSafeEqual } from 'crypto'

// Mirrors lib/approval-token.ts but with a longer TTL (90 days) — email
// unsubscribe links land in archived emails and must work weeks later.
// Uses a separate secret (UNSUBSCRIBE_SECRET) so a leaked unsubscribe
// token cannot be repurposed to forge auth tokens.

const TTL_MS = 90 * 24 * 60 * 60 * 1000 // 90 days

/**
 * Signs a userId into a time-limited HMAC token for email unsubscribe links.
 * Token encodes: userId + expiry timestamp + HMAC signature.
 */
export function signUnsubscribeToken(userId: string, secret: string): string {
  const expires = Date.now() + TTL_MS
  const payload = `${userId}:${expires}`
  const sig = createHmac('sha256', secret).update(payload).digest('hex')
  return Buffer.from(`${payload}:${sig}`).toString('base64url')
}

/**
 * Verifies a token from an unsubscribe link. Returns the userId on success
 * or null on any failure (malformed, tampered, expired). Constant-time
 * signature comparison so token-shape errors don't leak timing.
 */
export function verifyUnsubscribeToken(token: string, secret: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString()
    const parts = decoded.split(':')
    if (parts.length < 3) return null

    const sig = parts[parts.length - 1]
    const expires = parts[parts.length - 2]
    const userId = parts.slice(0, parts.length - 2).join(':')

    if (Date.now() > Number(expires)) return null

    const payload = `${userId}:${expires}`
    const expected = createHmac('sha256', secret).update(payload).digest('hex')
    const expectedBuf = Buffer.from(expected, 'utf8')
    const sigBuf = Buffer.from(sig, 'utf8')
    if (expectedBuf.length !== sigBuf.length) return null
    if (!timingSafeEqual(expectedBuf, sigBuf)) return null

    return userId
  } catch {
    return null
  }
}
