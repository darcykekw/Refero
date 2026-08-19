'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { forgotPassword } from '@/app/actions/auth'

const initialState = { error: undefined, message: undefined }

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(forgotPassword, initialState)

  return (
    <div className="card p-8 shadow-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Reset your password</h1>
        <p className="text-sm text-slate-500 mt-1">
          Enter your email and we&apos;ll send you a secure reset link.
        </p>
      </div>

      {state.message ? (
        <div className="alert alert-success" role="status">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="font-semibold">Check your email</p>
              <p className="mt-0.5 text-sm">{state.message}</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {state.error && (
            <div className="alert alert-error mb-5" role="alert">
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div>
              <label htmlFor="forgot-email" className="label">Email address</label>
              <input
                id="forgot-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input"
                placeholder="you@university.edu"
              />
            </div>

            <button
              id="forgot-submit-btn"
              type="submit"
              disabled={pending}
              className="btn btn-primary btn-full btn-lg"
            >
              {pending ? <><span className="spinner" /> Sending…</> : 'Send Reset Link'}
            </button>
          </form>
        </>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        Remember your password?{' '}
        <Link href="/login" className="text-sky-600 hover:text-sky-700 font-semibold">
          Back to Sign In
        </Link>
      </p>
    </div>
  )
}
