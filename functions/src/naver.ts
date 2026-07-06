const MAX_START = 1000
const PAGE_SIZE = 100

interface NaverBlogItem {
  link?: string
  postdate?: string
}

interface NaverBlogResponse {
  items?: NaverBlogItem[]
}

function getOneYearAgoPostdate(): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 1)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}${mm}${dd}`
}

function isWithinLastYear(postdate: string | undefined, cutoff: string): boolean {
  return Boolean(postdate && postdate.length === 8 && postdate >= cutoff)
}

async function fetchBlogPage(
  query: string,
  start: number,
  clientId: string,
  clientSecret: string,
): Promise<NaverBlogItem[]> {
  const url = new URL('https://openapi.naver.com/v1/search/blog.json')
  url.searchParams.set('query', `"${query}"`)
  url.searchParams.set('display', String(PAGE_SIZE))
  url.searchParams.set('start', String(start))
  url.searchParams.set('sort', 'date')

  const res = await fetch(url.toString(), {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  })

  if (!res.ok) return []

  const data = (await res.json()) as NaverBlogResponse
  return data.items ?? []
}

/** 최근 1년 블로그 포스트 수 (포스트 1개 = 1건) */
export async function getBlogMentionCount(
  query: string,
  clientId: string,
  clientSecret: string,
): Promise<number> {
  const cutoff = getOneYearAgoPostdate()
  const seenLinks = new Set<string>()
  let count = 0

  for (let start = 1; start <= MAX_START; start += PAGE_SIZE) {
    const items = await fetchBlogPage(query, start, clientId, clientSecret)
    if (items.length === 0) break

    let reachedOlderPosts = false

    for (const item of items) {
      if (!isWithinLastYear(item.postdate, cutoff)) {
        reachedOlderPosts = true
        break
      }

      const link = item.link?.trim()
      if (link) {
        if (seenLinks.has(link)) continue
        seenLinks.add(link)
      }

      count += 1
    }

    if (reachedOlderPosts || items.length < PAGE_SIZE) break
  }

  return count
}

export interface BlogEnrichment {
  blogScores: Map<string, number>
}

export async function enrichWithBlogData<T extends { place_name: string }>(
  places: T[],
  clientId: string,
  clientSecret: string,
): Promise<BlogEnrichment> {
  const blogScores = new Map<string, number>()

  await Promise.all(
    places.map(async (place) => {
      const mentions = await getBlogMentionCount(place.place_name, clientId, clientSecret)
      blogScores.set(place.place_name, mentions)
    }),
  )

  return { blogScores }
}
