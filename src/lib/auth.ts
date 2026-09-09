/**
 * Request-scoped auth helpers — server only.
 */
import { cache } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

/**
 * The signed-in user, or null.
 *
 * `supabase.auth.getUser()` validates the JWT against the Supabase Auth server,
 * so it is a network round-trip, not a cookie read. Every page used to make that
 * call itself *and* inherit a second one from the Navbar in the root layout —
 * two round-trips on the critical path of every render. `cache()` memoises per
 * request, so they collapse into one.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data) {
      return null
    }
    return data.user ?? null
  } catch (err: any) {
    if (err && typeof err === 'object' && 'digest' in err && err.digest === 'DYNAMIC_SERVER_USAGE') {
      throw err
    }
    console.warn('getCurrentUser caught error, returning null:', err)
    return null
  }
})

export const ADMIN_EMAILS = [
  '202380256@psu.palawan.edu.ph',
  'lawsmagnet6@gmail.com',
]

export function isAdminUser(user: User | null): boolean {
  if (!user) return false
  if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) return true
  if (user.app_metadata?.role === 'admin') return true
  if (user.user_metadata?.role === 'admin') return true
  return false
}
