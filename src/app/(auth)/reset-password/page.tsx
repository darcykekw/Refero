'use client'

import { useActionState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { resetPassword } from '@/app/actions/auth'

const initialState = { error: undefined, message: undefined }

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [state, formAction, pending] = useActionState(resetPassword, initialState)

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) return

    async function exchangeCode() {
      const supabase = createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code!)
      if (error) {
        router.replace('/forgot-password?error=expired')
      }
    }
    exchangeCode()
  }, [searchParams, router])

  const noCode = !searchParams.get('code')

  return (
    <div className="card p-8 shadow-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Set new password</h1>
        <p className="text-sm text-slate-500 mt-1">Choose a strong password for your account.</p>
      </div>

      {noCode ? (
        <div className="alert alert-error">
          <p className="font-semibold">Invalid or expired link</p>
          <p className="mt-1 text-sm">Please request a new password reset link.</p>
          <Link href="/forgot-password" className="mt-2 inline-block text-red-700 underline font-medium text-sm">
            Request new link →
          </Link>
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
              <label htmlFor="new-password" className="label">New Password</label>
              <input
                id="new-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="input"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="label">Confirm Password</label>
              <input
                id="confirm-password"
                name="confirm_password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="input"
                placeholder="Repeat your new password"
              />
            </div>

            <button
              id="reset-password-submit-btn"
              type="submit"
              disabled={pending}
              className="btn btn-primary btn-full btn-lg"
            >
              {pending ? <><span className="spinner" /> Updating…</> : 'Update Password'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="card p-8 shadow-lg animate-pulse">
        <div className="h-8 bg-slate-100 rounded mb-4 w-56" />
        <div className="h-4 bg-slate-100 rounded mb-6 w-48" />
        <div className="h-12 bg-slate-100 rounded mb-4" />
        <div className="h-12 bg-slate-100 rounded" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
