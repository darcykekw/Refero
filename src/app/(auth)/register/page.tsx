'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { signUp } from '@/app/actions/auth'

const initialState = { error: undefined, message: undefined }

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(signUp, initialState)

  async function handleGoogleSignIn() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="card p-8 shadow-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
        <p className="text-sm text-slate-500 mt-1">Join the Refero thesis community</p>
      </div>

      {/* Success state */}
      {state.message && (
        <div className="alert alert-success mb-5" role="status">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold">Almost there!</p>
              <p className="mt-0.5">{state.message}</p>
              <Link href="/login" className="mt-2 inline-block text-green-700 underline font-medium">
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Error banner */}
      {state.error && (
        <div className="alert alert-error mb-5" role="alert">
          {state.error}
        </div>
      )}

      {!state.message && (
        <>
          {/* Google OAuth */}
          <button
            id="google-register-btn"
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
            <div>
              <label htmlFor="register-name" className="label">Full Name</label>
              <input
                id="register-name"
                name="full_name"
                type="text"
                autoComplete="name"
                required
                className="input"
                placeholder="Juan dela Cruz"
              />
            </div>

            <div>
              <label htmlFor="register-email" className="label">Email address</label>
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input"
                placeholder="you@university.edu"
              />
            </div>

            <div>
              <label htmlFor="register-password" className="label">Password</label>
              <input
                id="register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="input"
                placeholder="At least 8 characters"
              />
              <p className="mt-1 text-xs text-slate-400">Minimum 8 characters</p>
            </div>

            <button
              id="register-submit-btn"
              type="submit"
              disabled={pending}
              className="btn btn-primary btn-full btn-lg mt-2"
            >
              {pending ? <><span className="spinner" /> Creating account…</> : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="text-sky-600 hover:text-sky-700 font-semibold">
              Sign in
            </Link>
          </p>
        </>
      )}
    </div>
  )
}
