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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})
