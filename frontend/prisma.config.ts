// Prisma 7 configuration file
// datasource.url is used by prisma migrate CLI only.
// Runtime adapter is configured in lib/db.ts via PrismaPg + pg Pool.

import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL,
  },
})
