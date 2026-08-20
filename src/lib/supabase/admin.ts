/**
 * Service-role Supabase client — bypasses RLS.
 * Use ONLY on the server for operations that require elevated access,
 * e.g. incrementing view counts or creating tags.
 * NEVER import this in client components or expose to the browser.
 */
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
