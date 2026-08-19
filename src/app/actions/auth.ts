'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// ── Sign In ───────────────────────────────────────────────────────────────────

export interface AuthState {
  error?: string
  message?: string
}

export async function signIn(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = (formData.get('email') as string).trim()
  const password = formData.get('password') as string
  const redirectTo = (formData.get('redirectTo') as string) || '/'

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  redirect(redirectTo)
}

// ── Sign Up ───────────────────────────────────────────────────────────────────

export async function signUp(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = (formData.get('email') as string).trim()
  const password = formData.get('password') as string
  const fullName = (formData.get('full_name') as string).trim()

  if (!email || !password || !fullName) {
    return { error: 'All fields are required.' }
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  })

  if (error) {
    return { error: error.message }
  }

  return {
    message:
      'Account created! Check your email for a confirmation link before signing in.',
  }
}

// ── Forgot Password (send reset email) ────────────────────────────────────────

export async function forgotPassword(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = (formData.get('email') as string).trim()
  if (!email) return { error: 'Please enter your email address.' }

  const supabase = await createClient()

  // The reset link will redirect to /reset-password
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return {
    message:
      'Password reset link sent! Check your inbox (and spam folder) — the link expires in 1 hour.',
  }
}

// ── Reset Password (after email link → set new password) ──────────────────────

export async function resetPassword(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const password = formData.get('password') as string
  const confirm = formData.get('confirm_password') as string

  if (!password || password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }
  if (password !== confirm) {
    return { error: 'Passwords do not match.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: error.message }
  }

  redirect('/login?reset=success')
}
