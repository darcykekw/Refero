'use client'

import { useActionState, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
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
  const [showPassword, setShowPassword] = useState(false)

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
    <div className="w-full max-w-4xl bg-white rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(17,33,23,0.18),0_10px_25px_-5px_rgba(17,33,23,0.08)] border border-[rgba(143,168,133,0.3)] overflow-hidden grid grid-cols-1 md:grid-cols-12 relative animate-scale-in">
      
      {/* ── Left Column: Clean Form ────────────────────────────────────────── */}
      <div className="md:col-span-7 p-8 sm:p-12 lg:p-14 flex flex-col justify-center relative z-10 bg-white">
        
        {/* Brand / Title */}
        <div className="mb-7">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(143,168,133,0.15)] border border-[rgba(143,168,133,0.3)] mb-3">
            <span className="w-2 h-2 rounded-full bg-[#29593D]" />
            <span className="text-[11px] font-bold tracking-wider text-[#29593D] uppercase">
              Refero · College of Sciences
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Log in
          </h1>
        </div>

        {/* Notices */}
        {resetSuccess && (
          <div className="alert alert-success mb-5 text-sm" role="status">
            ✓ Password updated successfully. Sign in with your new password.
          </div>
        )}

        {banner && (
          <div className="alert alert-error mb-5 text-sm" role="alert">
            {banner}
          </div>
        )}

        {/* Credentials Form */}
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="redirectTo" value={redirectTo} />

          {/* Email input */}
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-semibold text-slate-600 mb-1.5 ml-1"
            >
              Email address
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@university.edu"
              className="w-full px-5 py-3.5 rounded-2xl bg-slate-50/70 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#29593D] focus:bg-white transition-all text-sm shadow-sm"
            />
          </div>

          {/* Password input with show/hide toggle */}
          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold text-slate-600 mb-1.5 ml-1"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full px-5 py-3.5 pr-12 rounded-2xl bg-slate-50/70 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#29593D] focus:bg-white transition-all text-sm shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1 focus:outline-none"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            id="login-submit-btn"
            type="submit"
            disabled={pending}
            className="w-full py-3.5 px-6 rounded-2xl bg-[#234934] hover:bg-[#1A3827] active:scale-[0.99] text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-3 cursor-pointer disabled:opacity-50"
          >
            {pending ? (
              <>
                <span className="spinner" /> Signing in…
              </>
            ) : (
              'Log in'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 h-[1px] bg-slate-200" />
          <span className="px-4 text-xs font-medium text-slate-400">
            or log in with
          </span>
          <div className="flex-1 h-[1px] bg-slate-200" />
        </div>

        {/* Social logins */}
        <div className="flex justify-center items-center gap-3">
          <button
            id="google-signin-btn"
            type="button"
            onClick={handleGoogleSignIn}
            className="p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
            title="Sign in with Google"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          </button>
        </div>

        {/* Links */}
        <div className="mt-7 pt-4 text-center space-y-2">
          <div>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-[#29593D] hover:text-[#173B28] hover:underline transition-colors"
            >
              Forgot login or password?
            </Link>
          </div>
          <p className="text-xs text-slate-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold text-[#29593D] hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>

      {/* ── Right Column: Papercut Waves + Alche Graphic ──────────────────── */}
      <div className="hidden md:flex md:col-span-5 relative overflow-hidden bg-gradient-to-br from-[#091D13] via-[#143A25] to-[#1E4D32] items-center justify-center p-8">
        
        {/* Ambient radial glow behind the statue */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 60% 50%, rgba(143,168,133,0.3) 0%, rgba(9,29,19,0.85) 75%)',
          }}
        />

        {/* Multi-layer Organic Papercut Wave Divider */}
        <svg
          className="absolute inset-y-0 left-0 h-full w-28 -ml-[1px] pointer-events-none z-20"
          viewBox="0 0 100 800"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden="true"
        >
          {/* Layer 1: Deep shadow behind the papercut */}
          <path
            d="M 0,0 L 45,0 C 75,130 15,240 22,370 C 30,500 80,610 32,710 C 18,745 22,780 32,800 L 0,800 Z"
            fill="rgba(0,0,0,0.25)"
            filter="drop-shadow(6px 0 12px rgba(0,0,0,0.5))"
          />
          {/* Layer 2: Sage transition wave */}
          <path
            d="M 0,0 L 40,0 C 68,130 12,240 18,370 C 25,500 72,610 28,710 C 14,745 18,780 28,800 L 0,800 Z"
            fill="#598567"
            opacity="0.45"
          />
          {/* Layer 3: Dark forest transition wave */}
          <path
            d="M 0,0 L 32,0 C 58,130 8,240 14,370 C 20,500 62,610 22,710 C 10,745 14,780 22,800 L 0,800 Z"
            fill="#1E4D32"
            opacity="0.75"
          />
          {/* Layer 4: Front white card wave */}
          <path
            d="M 0,0 L 25,0 C 48,130 3,240 8,370 C 14,500 52,610 16,710 C 6,745 8,780 16,800 L 0,800 Z"
            fill="#ffffff"
          />
        </svg>

        {/* The Classical Alchemist Graphic (alche.png) */}
        <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="relative w-64 h-64 lg:w-72 lg:h-72 transition-transform duration-700 hover:scale-105">
            <Image
              src="/alche.png"
              alt="Refero Alchemist"
              fill
              className="object-contain filter drop-shadow-[0_25px_40px_rgba(0,0,0,0.8)] contrast-110 brightness-105"
              priority
            />
          </div>

          <div className="mt-4 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8FA885]">
              Alchemist Sanctuary
            </p>
            <p className="text-xs text-white/60 mt-1 font-light tracking-wide max-w-[220px]">
              Knowledge through exploration and scientific inquiry.
            </p>
          </div>
        </div>

        {/* Subtle bottom vignette */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#091D13] to-transparent pointer-events-none" />
      </div>

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
