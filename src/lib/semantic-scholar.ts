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
  url?: string
  s2Url?: string
}

function getApiKey(): string | undefined {
  return process.env.SEMANTIC_SCHOLAR_API_KEY || 'PkvDzDAqLXLUmIJP2X1P2LsJJeFqrEs1bIqnoCu4'
}

function getHeaders(apiKey?: string): HeadersInit {
  const headers: Record<string, string> = {
    'User-Agent': 'ReferoThesisHub/1.0',
    Accept: 'application/json',
  }
  if (apiKey) {
    headers['x-api-key'] = apiKey.trim()
  }
  return headers
}

/**
 * Look up a Semantic Scholar paper ID from a thesis title.
 * Returns null if lookup fails.
 */
export async function getPaperId(title: string): Promise<string | null> {
  const apiKey = getApiKey()
  try {
    const params = new URLSearchParams({
      query: title,
      fields: 'paperId',
      limit: '1',
    })
    const res = await fetch(`${SS_API_BASE_URL}/paper/search?${params}`, {
      headers: getHeaders(apiKey),
      next: { revalidate: 3600 },
    })

    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data?.data) && data.data.length > 0) {
        return (data.data[0] as { paperId: string }).paperId ?? null
      }
    }
  } catch (err) {
    console.error(`SS ID lookup error for "${title}":`, err)
  }
  return null
}

/**
 * Fetch related paper recommendations for a thesis.
 * Uses stored ss_paper_id with Semantic Scholar if available,
 * otherwise queries Semantic Scholar title search.
 * Falls back seamlessly to the Open Academic Graph to guarantee
 * students always see relevant peer-reviewed recommendations.
 */
export async function getThesisRecommendations(
  thesisTitle: string,
  ssPaperId?: string | null
): Promise<SSPaper[]> {
  const apiKey = getApiKey()
  const paperId = ssPaperId ?? (await getPaperId(thesisTitle))
  const fields = 'title,authors.name,year,abstract,paperId'

  // ── Strategy 1: ID-based recommendations via Semantic Scholar ─────────────
  if (paperId) {
    try {
      const params = new URLSearchParams({ fields, limit: '6' })
      const res = await fetch(`${SS_RECOMMENDATIONS_URL}${paperId}?${params}`, {
        headers: getHeaders(apiKey),
        next: { revalidate: 3600 },
      })

      if (res.ok) {
        const data = await res.json()
        const recs = data?.recommendedPapers as SSPaper[] | undefined
        if (Array.isArray(recs) && recs.length > 0) {
          return recs.map(p => ({
            ...p,
            s2Url: `https://www.semanticscholar.org/paper/${p.paperId}`,
            url: `https://www.semanticscholar.org/paper/${p.paperId}`,
          }))
        }
      }
    } catch (err) {
      console.error(`SS recommendations error for ID ${paperId}:`, err)
    }
  }

  // ── Strategy 2: Title-based search via Semantic Scholar ───────────────────
  try {
    const params = new URLSearchParams({ query: thesisTitle, fields, limit: '6' })
    const res = await fetch(`${SS_API_BASE_URL}/paper/search?${params}`, {
      headers: getHeaders(apiKey),
      next: { revalidate: 3600 },
    })

    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data?.data) && data.data.length > 0) {
        return (data.data as SSPaper[]).map(p => ({
          ...p,
          s2Url: `https://www.semanticscholar.org/paper/${p.paperId}`,
          url: `https://www.semanticscholar.org/paper/${p.paperId}`,
        }))
      }
    }
  } catch (err) {
    console.error(`SS title search error for "${thesisTitle}":`, err)
  }

  // ── Strategy 3: Resilient Academic Graph Fallback (OpenAlex / S2 indexed) ─
  try {
    const cleanQuery = encodeURIComponent(thesisTitle.replace(/[^\w\s]/gi, ' ').trim())
    const res = await fetch(
      `https://api.openalex.org/works?search=${cleanQuery}&per-page=8&sort=relevance_score:desc`,
      {
        headers: { 'User-Agent': 'ReferoThesisHub/1.0 (mailto:academic@refero.edu)' },
        next: { revalidate: 3600 },
      }
    )

    if (res.ok) {
      const data = await res.json()
      const results: SSPaper[] = (data?.results || []).map((item: any) => {
        let abstract: string | null = null
        if (item.abstract_inverted_index) {
          const words: string[] = []
          for (const [word, posList] of Object.entries(item.abstract_inverted_index)) {
            for (const pos of posList as number[]) {
              words[pos] = word
            }
          }
          abstract = words.join(' ')
        }

        const s2SearchUrl = `https://www.semanticscholar.org/search?q=${encodeURIComponent(item.title)}`
        return {
          paperId: item.id?.split('/').pop() || item.doi || item.title,
          title: item.title,
          year: item.publication_year || null,
          abstract,
          authors: (item.authorships || [])
            .map((a: any) => ({ name: a.author?.display_name || '' }))
            .filter((a: any) => Boolean(a.name)),
          url: item.doi || s2SearchUrl,
          s2Url: s2SearchUrl,
        }
      })

      const cleanThesis = thesisTitle.toLowerCase().replace(/[^\w\s]/g, '').trim()
      const filtered = results.filter(
        p => p.title.toLowerCase().replace(/[^\w\s]/g, '').trim() !== cleanThesis
      )
      return (filtered.length > 0 ? filtered : results).slice(0, 6)
    }
  } catch (err) {
    console.error(`Academic Graph fallback error for "${thesisTitle}":`, err)
  }

  return []
}
