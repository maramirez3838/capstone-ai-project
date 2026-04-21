import Link from 'next/link'

// Auth.js redirects here when a magic link fails or expires.
// The ?error= query param tells us what went wrong.
// Most users will land here via an expired link — that's the "Verification" case.

const MESSAGES: Record<string, { heading: string; body: string }> = {
  Verification: {
    heading: 'This sign-in link has expired',
    body: 'Magic links are single-use and expire after 24 hours. Request a new one below.',
  },
  Configuration: {
    heading: 'Sign-in is unavailable',
    body: 'There is a configuration problem on our end. Please try again later.',
  },
  AccessDenied: {
    heading: 'Access denied',
    body: 'Your account is not authorized to access STR Comply.',
  },
}

const DEFAULT_MESSAGE = {
  heading: 'Something went wrong',
  body: 'We couldn\'t complete the sign-in. Please try again.',
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const { heading, body } = (error ? MESSAGES[error] : undefined) ?? DEFAULT_MESSAGE

  return (
    <div className="max-w-sm mx-auto px-6 py-20">
      <div className="mb-8 text-center">
        <Link
          href="/"
          className="text-base font-medium text-gray-100 hover:text-accent-500 transition-colors"
        >
          STR Comply
        </Link>
        <div className="mt-6 text-3xl">⚠</div>
        <h1 className="mt-3 text-xl font-medium text-gray-100">{heading}</h1>
        <p className="mt-2 text-sm text-gray-500">{body}</p>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/login"
          className="w-full text-center rounded-lg bg-accent-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-700 transition-colors"
        >
          Request a new sign-in link
        </Link>
        <Link
          href="/"
          className="w-full text-center rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
