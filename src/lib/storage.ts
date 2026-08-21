/**
 * Supabase Storage helpers for thesis PDFs — server-only.
 *
 * Every reference to the bucket goes through THESIS_PDF_BUCKET so the name
 * lives in exactly one place. It previously appeared as a bare string in six
 * call sites, which is how the code and the migration drifted apart.
 */
import { createAdminClient } from '@/lib/supabase/admin'

/** The Storage bucket holding uploaded thesis PDFs. */
export const THESIS_PDF_BUCKET = 'thesis-pdfs'

/** How long a generated PDF link stays valid, in seconds. */
const SIGNED_URL_TTL_SECONDS = 60 * 60 // 1 hour

/**
 * Returns a time-limited URL for a stored thesis PDF, or null if there is no
 * file or the URL could not be signed.
 *
 * Signed URLs work for both public and private buckets. `getPublicUrl()` — used
 * here previously — does no I/O and always returns a well-formed string, so a
 * private bucket produced a URL that looked fine and 400'd when the browser
 * loaded it into the viewer.
 */
export async function getThesisPdfUrl(
  path: string | null | undefined
): Promise<string | null> {
  if (!path) return null

  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from(THESIS_PDF_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

  if (error || !data) {
    console.error(`createSignedUrl error for "${path}":`, error)
    return null
  }

  return data.signedUrl
}
