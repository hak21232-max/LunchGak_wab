import { buildBlogSearchQuery } from './quizSearch'
import type { RecommendRequest } from './types'

const MAX_START = 300
const PAGE_SIZE = 100
const MAX_SNIPPETS = 6
const SNIPPET_DESC_LEN = 160

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

const KNOWN_MENU_TERMS = [
  '김치찌개',
  '된장찌개',
  '부대찌개',
  '순두부찌개',
  '제육볶음',
  '닭볶음탕',
  '감자탕',
  '떡볶이',
  '라볶이',
  '마라탕',
  '마라샹궈',
  '짬뽕',
  '짜장면',
  '우육면',
  '돈까스',
  '로스카츠',
  '우동',
  '라멘',
  '칼국수',
  '냉면',
  '국밥',
  '설렁탕',
  '곰탕',
  '갈비탕',
  '추어탕',
  '삼겹살',
  '갈비',
  '불고기',
  '비빔밥',
  '초밥',
  '회덮밥',
  '파스타',
  '스테이크',
  '쭈꾸미볶음',
  '낙지볶음',
  '오삼불고기',
  '순대국',
  '곱창',
  '족발',
  '보쌈',
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
  positiveRatio: number
  topKeywords: string[]
  /** 블로그 title·description에서 추출한 메뉴·음식명 */
  menuMentions: string[]
  /** Gemini 판단용 후기 발췌 (최근 N건) */
  blogSnippets: string[]
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
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractMenuMentions(text: string, menuHits: Map<string, number>): void {
  const normalized = stripHtml(text)

  for (const term of KNOWN_MENU_TERMS) {
    if (normalized.includes(term)) {
      menuHits.set(term, (menuHits.get(term) ?? 0) + 1)
    }
  }

  const suffixRe =
    /([가-힣]{2,10}(?:찌개|국밥|국|탕|전골|볶음|구이|덮밥|면|우동|라멘|돈까스|떡볶이|김밥|파스타|냉면|칼국수|짬뽕|짜장|마라))/g
  let match: RegExpExecArray | null
  while ((match = suffixRe.exec(normalized)) !== null) {
    const term = match[1]
    if (term.length >= 2) {
      menuHits.set(term, (menuHits.get(term) ?? 0) + 1)
    }
  }
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

/** 최근 1년 블로그: 건수·평판·메뉴 추출·후기 발췌 */
export async function getBlogStats(
  query: string,
  clientId: string,
  clientSecret: string,
): Promise<BlogStats> {
  const cutoff = getOneYearAgoPostdate()
  const seenLinks = new Set<string>()
  const keywordHits = new Map<string, number>()
  const menuHits = new Map<string, number>()
  const blogSnippets: string[] = []
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
      const title = stripHtml(item.title ?? '')
      const desc = stripHtml(item.description ?? '')
      const text = `${title} ${desc}`

      extractMenuMentions(text, menuHits)

      if (blogSnippets.length < MAX_SNIPPETS && (title || desc)) {
        const excerpt = desc.slice(0, SNIPPET_DESC_LEN)
        blogSnippets.push(`- 「${title}」 ${excerpt}${desc.length > SNIPPET_DESC_LEN ? '…' : ''}`)
      }

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

  const menuMentions = [...menuHits.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([menu]) => menu)

  return {
    mentionCount,
    positiveCount,
    negativeCount,
    positiveRatio,
    topKeywords,
    menuMentions,
    blogSnippets,
  }
}

export interface BlogEnrichment {
  blogStats: Map<string, BlogStats>
}

export async function enrichWithBlogData<T extends { place_name: string }>(
  places: T[],
  clientId: string,
  clientSecret: string,
  req?: RecommendRequest,
): Promise<BlogEnrichment> {
  const blogStats = new Map<string, BlogStats>()

  await Promise.all(
    places.map(async (place) => {
      const query = req ? buildBlogSearchQuery(place.place_name, req) : place.place_name
      const stats = await getBlogStats(query, clientId, clientSecret)
      blogStats.set(place.place_name, stats)
    }),
  )

  return { blogStats }
}

export function computeReputationScore(stats: BlogStats, walkMin: number, isExemplary: boolean): number {
  const ratioScore = stats.positiveRatio * 60
  const volumeScore = Math.min(Math.log10(stats.mentionCount + 1) * 15, 25)
  const negativePenalty =
    stats.negativeCount >= 3 && stats.positiveRatio < 0.4 ? 35 : stats.negativeCount * 4
  const hypePenalty = stats.mentionCount >= 50 && stats.positiveRatio < 0.45 ? 25 : 0
  const distancePenalty = walkMin * 2
  const exemplaryBonus = isExemplary ? 20 : 0

  return ratioScore + volumeScore - negativePenalty - hypePenalty - distancePenalty + exemplaryBonus
}

export function formatBlogMenuBlock(stats: BlogStats): string {
  const menus =
    stats.menuMentions.length > 0
      ? stats.menuMentions.join(', ')
      : '(블로그에서 확인된 메뉴 없음 — 후기 발췌 참고)'

  const snippets =
    stats.blogSnippets.length > 0
      ? stats.blogSnippets.join('\n     ')
      : '(최근 블로그 후기 없음)'

  return `블로그 언급 메뉴: ${menus}\n   블로그 후기 발췌:\n     ${snippets}`
}
