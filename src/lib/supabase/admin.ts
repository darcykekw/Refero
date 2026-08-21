/**
 * Service-role Supabase client — bypasses RLS.
 * Use ONLY on the server for operations that require elevated access,
 * e.g. creating tags on behalf of an uploader or writing to Storage.
 * NEVER import this in client components or expose to the browser.
 *
 * Note: bumping view counts no longer belongs here. It goes through the
 * `increment_thesis_views` SQL function, which grants exactly that one
 * capability to any signed-in reader — see src/lib/data.ts.
 */
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
