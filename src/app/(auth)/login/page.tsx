'use client'

import { useActionState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { signIn } from '@/app/actions/auth'
import AuthCardSkeleton from '@/components/AuthCardSkeleton'

const initialState = { error: undefined, message: undefined }

function errorBanner(code: string | null, serverError?: string): string | null {
  if (code === 'auth_callback_failed') return 'Google sign-in failed. Please try again.'
  if (code === 'access_denied')        return 'Access was denied. Please try again.'
  if (serverError)                     return serverError
  return null
}

function LoginForm() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/'
  const errorCode = searchParams.get('error')
  const resetSuccess = searchParams.get('reset') === 'success'

  const [state, formAction, pending] = useActionState(signIn, initialState)

  const banner = errorBanner(errorCode, state.error)

  async function handleGoogleSignIn() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
      },
    })
  }

  return (
    <div className="card p-8 shadow-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
        <p className="text-sm text-slate-500 mt-1">Sign in to your Refero account</p>
      </div>

      {resetSuccess && (
        <div className="alert alert-success mb-5" role="status">
          ✓ Password updated successfully. Sign in with your new password.
        </div>
      )}

      {banner && (
        <div className="alert alert-error mb-5" role="alert">
          {banner}
        </div>
      )}

      <button
        id="google-signin-btn"
        type="button"
        onClick={handleGoogleSignIn}
        className="btn btn-ghost btn-full btn-lg mb-4 gap-3"
      >
        <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Continue with Google
      </button>

      <div className="divider mb-4">or</div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="redirectTo" value={redirectTo} />

        <div>
          <label htmlFor="login-email" className="label">Email address</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="input"
            placeholder="you@university.edu"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="login-password" className="label !mb-0">Password</label>
            <Link
              href="/forgot-password"
              className="text-xs text-sky-600 hover:text-sky-700 font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="input"
            placeholder="••••••••"
          />
        </div>

        <button
          id="login-submit-btn"
          type="submit"
          disabled={pending}
          className="btn btn-primary btn-full btn-lg mt-2"
        >
          {pending ? <><span className="spinner" /> Signing in…</> : 'Sign In'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-sky-600 hover:text-sky-700 font-semibold">
          Create one
        </Link>
      </p>
    </div>
  )
}

// Suspense boundary required for useSearchParams() in static builds
export default function LoginPage() {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <LoginForm />
    </Suspense>
  )
}
