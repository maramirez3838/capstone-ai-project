/**
 * Tests for DELETE /api/watchlist/property/:propertyId
 *
 * Mirror of the market DELETE coverage but for the property branch.
 * Idempotent — returns 204 even when no row exists.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  db: {
    watchlistItem: { deleteMany: vi.fn() },
  },
}))

vi.mock('@/lib/session', () => ({
  requireSession: vi.fn(),
}))

import { DELETE } from '@/app/api/watchlist/property/[propertyId]/route'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/session'

const mockDb = db as unknown as {
  watchlistItem: { deleteMany: ReturnType<typeof vi.fn> }
}
const mockRequireSession = requireSession as ReturnType<typeof vi.fn>

const stubUser = { id: 'user-1', email: 'test@example.com', name: null }
const validCuid = 'cabcdefghij1234567890klmn'

function makeRequest(propertyId: string) {
  const req = new NextRequest(`http://localhost:3000/api/watchlist/property/${propertyId}`, {
    method: 'DELETE',
  })
  return DELETE(req, { params: Promise.resolve({ propertyId }) })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DELETE /api/watchlist/property/:propertyId', () => {
  it('returns 401 when not authenticated', async () => {
    mockRequireSession.mockResolvedValueOnce(null)
    const res = await makeRequest(validCuid)
    expect(res.status).toBe(401)
  })

  it('returns 400 when propertyId is not a valid cuid', async () => {
    mockRequireSession.mockResolvedValueOnce(stubUser)
    const res = await makeRequest('not-a-cuid')
    expect(res.status).toBe(400)
  })

  it('returns 204 on successful delete', async () => {
    mockRequireSession.mockResolvedValueOnce(stubUser)
    mockDb.watchlistItem.deleteMany.mockResolvedValueOnce({ count: 1 })

    const res = await makeRequest(validCuid)
    expect(res.status).toBe(204)
    expect(mockDb.watchlistItem.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', propertyId: validCuid },
    })
  })

  it('returns 204 idempotently when row does not exist', async () => {
    mockRequireSession.mockResolvedValueOnce(stubUser)
    mockDb.watchlistItem.deleteMany.mockResolvedValueOnce({ count: 0 })

    const res = await makeRequest(validCuid)
    expect(res.status).toBe(204)
  })

  it('returns 500 on unexpected database error', async () => {
    mockRequireSession.mockResolvedValueOnce(stubUser)
    mockDb.watchlistItem.deleteMany.mockRejectedValueOnce(new Error('boom'))
    // Silence the expected console.error for this case.
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await makeRequest(validCuid)
    expect(res.status).toBe(500)

    errSpy.mockRestore()
  })
})
