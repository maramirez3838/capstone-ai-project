import NextAuth from 'next-auth'
import { PrismaRawAdapter } from '@/lib/auth-adapter'
import Resend from 'next-auth/providers/resend'
import { db } from '@/lib/db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaRawAdapter(db),
  providers: [
    Resend({
      apiKey: process.env.RESEND_KEY,
      // Use onboarding@resend.dev for MVP (no domain verification needed).
      // For production: replace with noreply@yourdomain.com after verifying
      // your domain in the Resend dashboard (DNS TXT + DKIM records).
      from: 'STR Comply <onboarding@resend.dev>',
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/auth-error',
  },
  callbacks: {
    // Expose the DB user id on the session so server-side guards can use it
    // without a second DB lookup. Requires the next-auth.d.ts augmentation.
    session({ session, user }) {
      session.user.id = user.id
      return session
    },
  },
})
