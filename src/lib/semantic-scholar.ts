/**
 * Semantic Scholar API helper
 *
 * Direct port of the legacy Django views.py functions:
 *   - get_paper_id()           → getPaperId()
 *   - get_thesis_recommendations() → getThesisRecommendations()
 */

const SS_API_BASE_URL = 'https://api.semanticscholar.org/graph/v1'
const SS_RECOMMENDATIONS_URL =
  'https://api.semanticscholar.org/recommendations/v1/papers/forpaper/'

export interface SSPaper {
  paperId: string
  title: string
  year: number | null
  abstract: string | null
  authors: { name: string }[]
}

function getApiKey(): string | undefined {
  return process.env.SEMANTIC_SCHOLAR_API_KEY
}

/**
 * Look up a Semantic Scholar paper ID from a thesis title.
 * Returns null if the API key is not configured or the lookup fails.
 */
export async function getPaperId(title: string): Promise<string | null> {
  const apiKey = getApiKey()
  if (!apiKey) {
    console.warn('SEMANTIC_SCHOLAR_API_KEY not set — skipping ID lookup.')
    return null
  }

  try {
    const params = new URLSearchParams({
      query: title,
      fields: 'paperId',
      limit: '1',
    })
    const res = await fetch(`${SS_API_BASE_URL}/paper/search?${params}`, {
      headers: { 'x-api-key': apiKey },
      next: { revalidate: 3600 }, // cache for 1 hour
    })

    if (!res.ok) return null
    const data = await res.json()

    if (Array.isArray(data?.data) && data.data.length > 0) {
      return (data.data[0] as { paperId: string }).paperId ?? null
    }
  } catch (err) {
    console.error(`SS ID lookup error for "${title}":`, err)
  }
  return null
}

/**
 * Fetch related paper recommendations for a thesis.
 * Uses stored ss_paper_id if available, otherwise performs a title lookup.
 * Falls back to a title-based search if the recommendations endpoint fails.
 */
export async function getThesisRecommendations(
  thesisTitle: string,
  ssPaperId?: string | null
): Promise<SSPaper[]> {
  const apiKey = getApiKey()
  if (!apiKey) {
    console.warn('SEMANTIC_SCHOLAR_API_KEY not set — skipping recommendations.')
    return []
  }

  const paperId = ssPaperId ?? (await getPaperId(thesisTitle))
  const fields = 'title,authors.name,year,abstract,paperId'

  // ── Strategy 1: ID-based recommendations ──────────────────────────────────
  if (paperId) {
    try {
      const params = new URLSearchParams({ fields, limit: '5' })
      const res = await fetch(
        `${SS_RECOMMENDATIONS_URL}${paperId}?${params}`,
        {
          headers: { 'x-api-key': apiKey },
          next: { revalidate: 3600 },
        }
      )

      if (res.ok) {
        const data = await res.json()
        const recs = data?.recommendedPapers as SSPaper[] | undefined
        if (recs && recs.length > 0) return recs
      }
    } catch (err) {
      console.error(`SS recommendations error for ID ${paperId}:`, err)
    }
  }

  // ── Strategy 2: Title-based search fallback ────────────────────────────────
  try {
    const params = new URLSearchParams({ query: thesisTitle, fields, limit: '5' })
    const res = await fetch(`${SS_API_BASE_URL}/paper/search?${params}`, {
      headers: { 'x-api-key': apiKey },
      next: { revalidate: 3600 },
    })

    if (res.ok) {
      const data = await res.json()
      return (data?.data as SSPaper[]) ?? []
    }
  } catch (err) {
    console.error(`SS fallback search error for "${thesisTitle}":`, err)
  }

  return []
}
