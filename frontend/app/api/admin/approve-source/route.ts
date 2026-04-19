// GET /api/admin/approve-source?id=<sourceId>&action=approve|dismiss&token=<HMAC>
//
// Called from signed links embedded in the weekly compliance email report.
// Approving activates the replacement source and queues the market for re-check.
// Dismissing discards the candidate without activating it.
//
// Tokens are HMAC-SHA256 signed with AUTH_SECRET and expire after 24 hours.

import { NextRequest, NextResponse } from 'next/server'
import { verifyApprovalToken } from '@/lib/approval-token'
import { db } from '@/lib/db'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl
  const id = searchParams.get('id')
  const action = searchParams.get('action')
  const token = searchParams.get('token')

  if (!id || !action || !token) {
    return html('Missing parameters.', 400)
  }

  if (action !== 'approve' && action !== 'dismiss') {
    return html('Invalid action.', 400)
  }

  const secret = process.env.AUTH_SECRET
  if (!secret) {
    console.error('[approve-source] AUTH_SECRET not set')
    return html('Server misconfiguration.', 500)
  }

  if (!verifyApprovalToken(token, id, secret)) {
    return html('This link is invalid or has expired (links expire after 24 hours).', 401)
  }

  // Fetch the pending source to confirm it exists and get its replacesId
  const rows = await db.$queryRaw<
    Array<{ id: string; marketId: string; replacesId: string | null; sourceStatus: string }>
  >`
    SELECT id, "marketId", "replacesId", "sourceStatus"
    FROM "MarketSource"
    WHERE id = ${id}
  `

  const source = rows[0]

  if (!source) {
    return html('Source not found.', 404)
  }

  if (source.sourceStatus !== 'pending_review') {
    return html(
      `This source has already been ${source.sourceStatus === 'active' ? 'approved' : 'dismissed'}.`,
      200
    )
  }

  if (action === 'approve') {
    // Activate the replacement
    await db.$executeRaw`
      UPDATE "MarketSource" SET "sourceStatus" = 'active' WHERE id = ${id}
    `

    // Mark the broken source as replaced
    if (source.replacesId) {
      await db.$executeRaw`
        UPDATE "MarketSource" SET "sourceStatus" = 'replaced' WHERE id = ${source.replacesId}
      `
    }

    // Set market to review_due so the monitor re-checks on its next run
    await db.$executeRaw`
      UPDATE "Market"
      SET "freshnessStatus" = 'review_due', "updatedAt" = NOW()
      WHERE id = ${source.marketId}
    `

    console.log(`[approve-source] Approved source ${id}, replaced ${source.replacesId ?? 'none'}`)
    return html('Replacement approved. The market has been queued for re-check on the next monitor run.', 200)
  }

  // dismiss: discard the candidate, leave broken source as-is
  await db.$executeRaw`
    UPDATE "MarketSource" SET "sourceStatus" = 'replaced' WHERE id = ${id}
  `

  console.log(`[approve-source] Dismissed candidate ${id}`)
  return html('Candidate dismissed. The broken source remains flagged for the next discovery attempt.', 200)
}

function html(message: string, status: number): NextResponse {
  return new NextResponse(
    `<!doctype html><html><body style="font-family:sans-serif;padding:2rem;max-width:480px">
      <h2>STR Comply</h2><p>${message}</p>
    </body></html>`,
    { status, headers: { 'Content-Type': 'text/html' } }
  )
}
