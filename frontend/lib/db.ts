// Prisma client singleton for Next.js (Prisma 7 / adapter-based)
//
// Prisma 7 requires a database adapter instead of a connection URL in the schema.
// We use @prisma/adapter-pg with the `pg` Pool for PostgreSQL.
//
// The singleton pattern prevents connection exhaustion during Next.js hot-reloads
// in development. This file must ONLY be imported in server-side code
// (API routes, server components). Never import it from a 'use client' file.

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
