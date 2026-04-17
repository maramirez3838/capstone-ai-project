// Local runner for the compliance monitor agent.
// Usage: npx tsx scripts/run-compliance-monitor.ts
//
// Loads .env.local automatically. Requires COMPLIANCE_MONITOR_ENABLED=true to run.

import { configDotenv } from 'dotenv'
import { resolve } from 'path'

// Must run before any other imports that touch process.env (db, anthropic, etc.)
configDotenv({ path: resolve(process.cwd(), '.env.local') })

// Dynamic import ensures lib/db.ts initializes AFTER env vars are loaded
const { runComplianceMonitor } = await import('../lib/compliance-monitor.js')

runComplianceMonitor()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error('[compliance-monitor] Fatal error:', err)
    process.exit(1)
  })
