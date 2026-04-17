import type { DefaultSession } from 'next-auth'

// Augment the built-in Session type to include the DB user id.
// Without this, accessing session.user.id would cause a TypeScript error
// because Auth.js v5 doesn't include id on the default session user type.
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
    } & DefaultSession['user']
  }
}
