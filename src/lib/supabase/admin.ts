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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined. ' +
      'In Vercel, go to Project Settings > Environment Variables and add SUPABASE_SERVICE_ROLE_KEY. ' +
      'You can find this key in your Supabase dashboard under Project Settings > API.'
    )
  }

  return createClient<Database>(
    url,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
