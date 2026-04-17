// Custom NextAuth v5 adapter using raw SQL queries.
//
// WHY: @auth/prisma-adapter v2.x calls prisma.verificationToken.create() etc.
// via Prisma model accessors. When PrismaClient is initialized with a driver
// adapter (@prisma/adapter-pg, Prisma 7), those model properties are undefined.
// Raw query methods ($queryRaw / $executeRaw) remain fully functional.
//
// This adapter is a drop-in replacement for PrismaAdapter(db) and implements
// all methods required for the Resend email (magic-link) + database session flow.

import type {
  Adapter,
  AdapterUser,
  AdapterAccount,
  AdapterSession,
  VerificationToken,
} from 'next-auth/adapters'
import { db } from '@/lib/db'

// ---------------------------------------------------------------------------
// Raw row types (shapes returned from $queryRaw)
// ---------------------------------------------------------------------------

type RawUser = {
  id: string
  email: string
  emailVerified: Date | null
  name: string | null
  image: string | null
}

type RawSession = {
  id: string
  sessionToken: string
  userId: string
  expires: Date
}

type RawToken = {
  identifier: string
  token: string
  expires: Date
}

type RawAccount = {
  id: string
  userId: string
  type: string
  provider: string
  providerAccountId: string
  refresh_token: string | null
  access_token: string | null
  expires_at: number | null
  token_type: string | null
  scope: string | null
  id_token: string | null
  session_state: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Generate a unique ID. crypto.randomUUID() is available in Node 18+ without
// imports. Auth.js treats IDs as opaque strings so UUID format is fine.
const newId = (): string => crypto.randomUUID()

const toUser = (row: RawUser): AdapterUser => ({
  id: row.id,
  email: row.email,
  emailVerified: row.emailVerified,
  name: row.name,
  image: row.image,
})

// ---------------------------------------------------------------------------
// Adapter factory
// ---------------------------------------------------------------------------

export function PrismaRawAdapter(_prisma: typeof db): Adapter {
  return {
    // -------------------------------------------------------------------------
    // User methods
    // -------------------------------------------------------------------------

    async createUser(user) {
      const id = newId()
      const rows = await db.$queryRaw<RawUser[]>`
        INSERT INTO "User" (id, email, "emailVerified", name, image, "createdAt", "updatedAt")
        VALUES (${id}, ${user.email}, ${user.emailVerified ?? null},
                ${user.name ?? null}, ${user.image ?? null}, NOW(), NOW())
        RETURNING id, email, "emailVerified", name, image
      `
      return toUser(rows[0])
    },

    async getUser(id) {
      const rows = await db.$queryRaw<RawUser[]>`
        SELECT id, email, "emailVerified", name, image
        FROM "User"
        WHERE id = ${id}
        LIMIT 1
      `
      return rows[0] ? toUser(rows[0]) : null
    },

    async getUserByEmail(email) {
      const rows = await db.$queryRaw<RawUser[]>`
        SELECT id, email, "emailVerified", name, image
        FROM "User"
        WHERE email = ${email}
        LIMIT 1
      `
      return rows[0] ? toUser(rows[0]) : null
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const rows = await db.$queryRaw<RawUser[]>`
        SELECT u.id, u.email, u."emailVerified", u.name, u.image
        FROM "User" u
        INNER JOIN "Account" a ON a."userId" = u.id
        WHERE a.provider = ${provider}
          AND a."providerAccountId" = ${providerAccountId}
        LIMIT 1
      `
      return rows[0] ? toUser(rows[0]) : null
    },

    async updateUser(user) {
      // Auth.js only ever calls this to stamp emailVerified. COALESCE keeps
      // existing values for fields that aren't provided.
      const rows = await db.$queryRaw<RawUser[]>`
        UPDATE "User"
        SET
          email           = COALESCE(${user.email ?? null}, email),
          "emailVerified" = COALESCE(${user.emailVerified ?? null}, "emailVerified"),
          name            = COALESCE(${user.name ?? null}, name),
          image           = COALESCE(${user.image ?? null}, image),
          "updatedAt"     = NOW()
        WHERE id = ${user.id}
        RETURNING id, email, "emailVerified", name, image
      `
      return toUser(rows[0])
    },

    // -------------------------------------------------------------------------
    // Account methods
    // -------------------------------------------------------------------------

    async linkAccount(account) {
      const id = newId()
      // expires_at is Int? (Unix epoch seconds) — not a Date
      await db.$executeRaw`
        INSERT INTO "Account" (
          id, "userId", type, provider, "providerAccountId",
          refresh_token, access_token, expires_at,
          token_type, scope, id_token, session_state
        )
        VALUES (
          ${id}, ${account.userId}, ${account.type},
          ${account.provider}, ${account.providerAccountId},
          ${account.refresh_token ?? null}, ${account.access_token ?? null},
          ${account.expires_at ?? null},
          ${account.token_type ?? null}, ${account.scope ?? null},
          ${account.id_token ?? null}, ${account.session_state ?? null}
        )
        ON CONFLICT (provider, "providerAccountId") DO NOTHING
      `
      return account as AdapterAccount
    },

    async getAccount(providerAccountId, provider) {
      const rows = await db.$queryRaw<RawAccount[]>`
        SELECT id, "userId", type, provider, "providerAccountId",
               refresh_token, access_token, expires_at,
               token_type, scope, id_token, session_state
        FROM "Account"
        WHERE "providerAccountId" = ${providerAccountId}
          AND provider = ${provider}
        LIMIT 1
      `
      return (rows[0] as AdapterAccount) ?? null
    },

    // -------------------------------------------------------------------------
    // Session methods
    // -------------------------------------------------------------------------

    async createSession(session) {
      const id = newId()
      const rows = await db.$queryRaw<RawSession[]>`
        INSERT INTO "Session" (id, "sessionToken", "userId", expires)
        VALUES (${id}, ${session.sessionToken}, ${session.userId}, ${session.expires})
        RETURNING id, "sessionToken", "userId", expires
      `
      const r = rows[0]
      return { sessionToken: r.sessionToken, userId: r.userId, expires: r.expires }
    },

    async getSessionAndUser(sessionToken) {
      const rows = await db.$queryRaw<
        Array<{
          sId: string
          sessionToken: string
          userId: string
          expires: Date
          uId: string
          email: string
          emailVerified: Date | null
          name: string | null
          image: string | null
        }>
      >`
        SELECT
          s.id            AS "sId",
          s."sessionToken",
          s."userId",
          s.expires,
          u.id            AS "uId",
          u.email,
          u."emailVerified",
          u.name,
          u.image
        FROM "Session" s
        INNER JOIN "User" u ON u.id = s."userId"
        WHERE s."sessionToken" = ${sessionToken}
        LIMIT 1
      `
      if (!rows[0]) return null
      const r = rows[0]
      return {
        session: { sessionToken: r.sessionToken, userId: r.userId, expires: r.expires },
        user: { id: r.uId, email: r.email, emailVerified: r.emailVerified, name: r.name, image: r.image },
      }
    },

    async updateSession(session) {
      const rows = await db.$queryRaw<RawSession[]>`
        UPDATE "Session"
        SET expires = COALESCE(${session.expires ?? null}, expires)
        WHERE "sessionToken" = ${session.sessionToken}
        RETURNING "sessionToken", "userId", expires
      `
      if (!rows[0]) return null
      const r = rows[0]
      return { sessionToken: r.sessionToken, userId: r.userId, expires: r.expires }
    },

    async deleteSession(sessionToken) {
      await db.$executeRaw`
        DELETE FROM "Session" WHERE "sessionToken" = ${sessionToken}
      `
    },

    // -------------------------------------------------------------------------
    // Verification token methods (magic-link core)
    // -------------------------------------------------------------------------

    async createVerificationToken(token) {
      const rows = await db.$queryRaw<RawToken[]>`
        INSERT INTO "VerificationToken" (identifier, token, expires)
        VALUES (${token.identifier}, ${token.token}, ${token.expires})
        RETURNING identifier, token, expires
      `
      const r = rows[0]
      return { identifier: r.identifier, token: r.token, expires: r.expires }
    },

    async useVerificationToken({ identifier, token }) {
      // Atomically delete and return the token in one round-trip.
      // Returns null if the token doesn't exist (expired, already used, wrong link).
      const rows = await db.$queryRaw<RawToken[]>`
        WITH deleted AS (
          DELETE FROM "VerificationToken"
          WHERE identifier = ${identifier} AND token = ${token}
          RETURNING identifier, token, expires
        )
        SELECT identifier, token, expires FROM deleted
      `
      if (!rows[0]) return null
      const r = rows[0]
      return { identifier: r.identifier, token: r.token, expires: r.expires }
    },
  }
}
