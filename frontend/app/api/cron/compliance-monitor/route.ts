import { NextResponse } from 'next/server'
import { runComplianceMonitor } from '@/lib/compliance-monitor'

// Vercel cron calls this every Monday at 9am UTC (see vercel.json).
// Protected by CRON_SECRET — unauthenticated requests are rejected.
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await runComplianceMonitor()
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[cron/compliance-monitor] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
