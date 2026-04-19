import { createHmac } from 'crypto'

const TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Signs a source ID into a time-limited HMAC token for email approve/dismiss links.
 * Token encodes: sourceId + expiry timestamp + HMAC signature.
 */
export function signApprovalToken(sourceId: string, secret: string): string {
  const expires = Date.now() + TTL_MS
  const payload = `${sourceId}:${expires}`
  const sig = createHmac('sha256', secret).update(payload).digest('hex')
  return Buffer.from(`${payload}:${sig}`).toString('base64url')
}

/**
 * Verifies a token from an email approval link.
 * Returns false if the token is invalid, tampered with, or expired.
 */
export function verifyApprovalToken(
  token: string,
  sourceId: string,
  secret: string
): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString()
    const parts = decoded.split(':')
    // format: sourceId:expires:sig — sourceId may contain colons if it's a CUID (it won't, but be safe)
    const sig = parts[parts.length - 1]
    const expires = parts[parts.length - 2]
    const id = parts.slice(0, parts.length - 2).join(':')

    if (id !== sourceId) return false
    if (Date.now() > Number(expires)) return false

    const payload = `${id}:${expires}`
    const expected = createHmac('sha256', secret).update(payload).digest('hex')
    return sig === expected
  } catch {
    return false
  }
}
