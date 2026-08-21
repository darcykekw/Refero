'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ── Sign In ───────────────────────────────────────────────────────────────────

export interface AuthState {
  error?: string
  message?: string
}

/**
 * Reads a form field as a trimmed string.
 *
 * `formData.get()` returns `string | File | null`, so casting straight to
 * `string` and calling `.trim()` throws on a missing field instead of failing
 * validation. This returns '' for anything that is not text.
 */
function field(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

/** Same, but preserves whitespace — passwords are used exactly as typed. */
function rawField(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

/**
 * Restricts a post-login destination to a path on this site.
 *
 * `redirectTo` reaches the form from the query string, so without this check
 * `/login?redirectTo=https://example.com` would send the visitor off-site with
 * our own domain in the address bar at the moment they submit their password.
 * Protocol-relative `//host` is rejected too — the browser treats it as absolute.
 */
function safeRedirect(target: string): string {
  if (!target.startsWith('/') || target.startsWith('//')) return '/'
  return target
}

export async function signIn(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = field(formData, 'email')
  const password = rawField(formData, 'password')
  const redirectTo = safeRedirect(field(formData, 'redirectTo') || '/')

  if (!email || !password) {
    return { error: 'Please enter your email and password.' }
  }

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
  const email = field(formData, 'email')
  const password = rawField(formData, 'password')
  const fullName = field(formData, 'full_name')

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
  const email = field(formData, 'email')
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
  const password = rawField(formData, 'password')
  const confirm = rawField(formData, 'confirm_password')

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

  // Signing out ends the recovery session the email link opened, so the new
  // password is proven at least once. It also clears the cookie that made
  // /login bounce straight back to the home page, which is why nobody ever saw
  // the "password updated" notice.
  await supabase.auth.signOut()

  redirect('/login?reset=success')
}

// ── Update Display Name ────────────────────────────────────────────────────────

export async function updateDisplayName(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const fullName = field(formData, 'full_name')
  if (!fullName || fullName.length < 2) {
    return { error: 'Please enter a valid name (at least 2 characters).' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    data: { full_name: fullName },
  })

  if (error) return { error: error.message }

  revalidatePath('/profile')

  return { message: 'Display name updated.' }
}
