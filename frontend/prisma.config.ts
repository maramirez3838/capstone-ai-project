// Prisma 7 configuration file
// Replaces the datasource `url` field that was removed in Prisma 7.
// - `datasource.url` is used by prisma migrate
// - `migrate.adapter` is used at runtime for queries

import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  earlyAccess: true,
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrate: {
    async adapter() {
      const { Pool } = await import('pg')
      const { PrismaPg } = await import('@prisma/adapter-pg')
      const pool = new Pool({ connectionString: process.env.DATABASE_URL })
      return new PrismaPg(pool)
    },
  },
})
