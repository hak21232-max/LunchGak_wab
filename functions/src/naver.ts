const MAX_START = 1000
const PAGE_SIZE = 100

const POSITIVE_KEYWORDS = [
  '맛있',
  '최고',
  '강추',
  '재방문',
  '만족',
  '훌륭',
  '좋았',
  '추천',
  '친절',
  '깔끔',
  '가성비',
  '든든',
  '혼밥',
  '분위기',
  '양 많',
  '양많',
  '맛집',
  '성공',
  '훌륭',
  '최애',
]

const NEGATIVE_KEYWORDS = [
  '실망',
  '별로',
  '아쉽',
  '불친절',
  '비싸',
  '양 적',
  '양적',
  '맛없',
  '맛 없',
  '최악',
  '다신',
  '후회',
  '불만',
  '짜다',
  '기대 이하',
  '환불',
]

interface NaverBlogItem {
  title?: string
  link?: string
  description?: string
  postdate?: string
}

interface NaverBlogResponse {
  items?: NaverBlogItem[]
}

export interface BlogStats {
  mentionCount: number
  positiveCount: number
  negativeCount: number
  /** 0~1, 데이터 없으면 0.5 */
  positiveRatio: number
  topKeywords: string[]
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

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function analyzePostText(text: string): { positive: boolean; negative: boolean; keywords: string[] } {
  const normalized = stripHtml(text)
  const keywords: string[] = []

  for (const kw of POSITIVE_KEYWORDS) {
    if (normalized.includes(kw)) keywords.push(kw)
  }

  const positive = keywords.length > 0
  const negative = NEGATIVE_KEYWORDS.some((kw) => normalized.includes(kw))

  return { positive, negative, keywords }
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

/** 최근 1년 블로그: 건수 + 긍정/부정 + 상위 키워드 */
export async function getBlogStats(
  query: string,
  clientId: string,
  clientSecret: string,
): Promise<BlogStats> {
  const cutoff = getOneYearAgoPostdate()
  const seenLinks = new Set<string>()
  const keywordHits = new Map<string, number>()
  let mentionCount = 0
  let positiveCount = 0
  let negativeCount = 0

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

      mentionCount += 1
      const text = `${item.title ?? ''} ${item.description ?? ''}`
      const { positive, negative, keywords } = analyzePostText(text)

      if (positive) positiveCount += 1
      if (negative) negativeCount += 1

      for (const kw of keywords) {
        keywordHits.set(kw, (keywordHits.get(kw) ?? 0) + 1)
      }
    }

    if (reachedOlderPosts || items.length < PAGE_SIZE) break
  }

  const judged = positiveCount + negativeCount
  const positiveRatio =
    judged > 0 ? positiveCount / judged : mentionCount > 0 ? 0.5 : 0.5

  const topKeywords = [...keywordHits.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([kw]) => kw)

  return {
    mentionCount,
    positiveCount,
    negativeCount,
    positiveRatio,
    topKeywords,
  }
}

export interface BlogEnrichment {
  blogStats: Map<string, BlogStats>
}

export async function enrichWithBlogData<T extends { place_name: string }>(
  places: T[],
  clientId: string,
  clientSecret: string,
): Promise<BlogEnrichment> {
  const blogStats = new Map<string, BlogStats>()

  await Promise.all(
    places.map(async (place) => {
      const stats = await getBlogStats(place.place_name, clientId, clientSecret)
      blogStats.set(place.place_name, stats)
    }),
  )

  return { blogStats }
}

/** 평판·인기도·거리·모범음식점 종합 점수 */
export function computeReputationScore(stats: BlogStats, walkMin: number, isExemplary: boolean): number {
  const ratioScore = stats.positiveRatio * 60
  const volumeScore = Math.min(Math.log10(stats.mentionCount + 1) * 15, 25)
  const negativePenalty = stats.negativeCount >= 3 && stats.positiveRatio < 0.4 ? 35 : stats.negativeCount * 4
  const hypePenalty =
    stats.mentionCount >= 50 && stats.positiveRatio < 0.45 ? 25 : 0
  const distancePenalty = walkMin * 2
  const exemplaryBonus = isExemplary ? 20 : 0

  return ratioScore + volumeScore - negativePenalty - hypePenalty - distancePenalty + exemplaryBonus
}
