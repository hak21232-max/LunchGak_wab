import { formatMoods, formatSituations, hasSituation } from './quizAnswers'
import type { EnrichedCandidate, RecommendRequest } from './types'

const MOOD_PHRASES: Record<string, string> = {
  스트레스: '스트레스 풀기엔 든든한',
  피곤: '피곤할 때 든든하게 채울',
  기분좋음: '기분 좋을 때 가볍게 즐길',
  평범: '평범한 점심에 무난한',
  몸안좋음: '몸 상태 안 좋을 때 부담 없는',
}

/** 카카오 category_name에서 실제 취급 메뉴 추출 */
export function extractSpecialties(categoryName: string): string[] {
  const found = new Set<string>()
  const text = categoryName.replace(/\s/g, '')

  const rules: Array<[RegExp, string]> = [
    [/돈까스|돈카츠|카츠(?!u)/, '돈까스'],
    [/우동/, '우동'],
    [/라멘|라면(?!면)/, '라멘'],
    [/초밥|스시|회/, '초밥·회'],
    [/국밥|곰탕|설렁탕|갈비탕/, '국밥·탕'],
    [/국수|칼국수|냉면/, '국수·면'],
    [/삼겹|고기|갈비|구이|숯불|연탄|족발|보쌈/, '고기·구이'],
    [/찌개|전골|탕(?!후)/, '찌개·전골'],
    [/분식|떡볶|김밥/, '분식'],
    [/짬뽕|짜장|중식/, '중식면'],
    [/파스타|스테이크|양식/, '양식'],
    [/치킨|피자|햄버거/, '패스트푸드'],
    [/카페|커피|브런치/, '카페·브런치'],
  ]

  for (const [pattern, label] of rules) {
    if (pattern.test(text)) found.add(label)
  }

  // "돈까스,우동" 같이 쉼표 구분 세부 카테고리 파싱
  const parts = categoryName.split('>').map((p) => p.trim())
  for (const part of parts) {
    for (const token of part.split(/[,·/]/)) {
      const t = token.trim()
      if (/돈까스|카츠/.test(t)) found.add('돈까스')
      if (/우동/.test(t)) found.add('우동')
      if (/라멘|라면/.test(t)) found.add('라멘')
      if (/초밥|회/.test(t)) found.add('초밥·회')
      if (/국밥/.test(t)) found.add('국밥·탕')
      if (/칼국수|냉면/.test(t)) found.add('국수·면')
    }
  }

  return [...found]
}

function primaryCuisine(categoryName: string): string {
  if (/한식/.test(categoryName)) return '한식'
  if (/일식/.test(categoryName)) return '일식'
  if (/중식/.test(categoryName)) return '중식'
  if (/양식/.test(categoryName)) return '양식'
  if (/분식/.test(categoryName)) return '분식'
  return '음식'
}

/** 카테고리에 실제 있는 메뉴만 반환 (없는 메뉴 추측 금지) */
export function inferMenuHint(req: RecommendRequest, candidate: EnrichedCandidate): string {
  const specialties = extractSpecialties(candidate.category_name)
  const pref = req.food.find((f) => !f.includes('자유')) ?? req.food[0] ?? ''

  if (specialties.length > 0) {
    return menuHintFromSpecialties(specialties, pref)
  }

  // 세부 카테고리 없을 때만 cuisine 수준 (보수적)
  const cuisine = primaryCuisine(candidate.category_name)
  return menuHintFromCuisine(cuisine, pref, candidate.category_name)
}

function menuHintFromSpecialties(specialties: string[], pref: string): string {
  const has = (key: string) => specialties.some((s) => s.includes(key) || key.includes(s.split('·')[0]))

  if (pref.includes('매운')) {
    if (has('돈까스') && has('우동')) return '바삭한 돈까스·따끈한 우동'
    if (has('돈까스')) return '바삭한 돈까스'
    if (has('우동')) return '따끈한 우동'
    if (has('라멘')) return '매운 라멘'
    if (has('국밥')) return '얼큰한 국밥·찌개'
    if (has('찌개')) return '얼큰한 찌개·전골'
    if (has('분식')) return '매운 떡볶이·라볶이'
    if (has('중식')) return '마라탕·짬뽕'
    if (has('고기')) return '매콤한 고기·양념 구이'
    return specialties.join('·')
  }

  if (pref.includes('국물')) {
    if (has('우동')) return '따끈한 우동'
    if (has('라멘')) return '국물 라멘'
    if (has('국밥')) return '국밥·탕'
    if (has('찌개')) return '찌개·전골'
    if (has('중식')) return '짬뽕·우육면'
    if (has('국수')) return '칼국수·국수'
    return specialties.join('·')
  }

  if (pref.includes('가벼')) {
    if (has('초밥')) return '초밥·회'
    if (has('우동')) return '담백한 우동'
    if (has('돈까스')) return '로스카츠·정식'
    return specialties.join('·')
  }

  if (pref.includes('고기')) {
    if (has('고기')) return '구이·삼겹·갈비'
    if (has('돈까스')) return '돈까스·정육'
    return specialties.join('·')
  }

  if (pref.includes('면')) {
    if (has('우동')) return '우동'
    if (has('라멘')) return '라멘'
    if (has('국수')) return '칼국수·냉면'
    if (has('중식')) return '짜장·짬뽕'
    return specialties.join('·')
  }

  if (pref.includes('밥')) {
    if (has('고기')) return '제육덮밥·볶음밥'
    return '덮밥·비빔밥·백반'
  }

  return specialties.join('·')
}

function menuHintFromCuisine(cuisine: string, pref: string, categoryName: string): string {
  const tail = categoryName.split('>').pop()?.trim() ?? cuisine
  if (pref.includes('자유')) return `${tail} 대표 메뉴`

  const conservative: Record<string, Record<string, string>> = {
    한식: {
      매운: '찌개·볶음·국밥',
      국물: '국밥·탕',
      밥: '덮밥·비빔밥',
      default: '한식 정식',
    },
    일식: {
      default: '일식 대표 메뉴',
    },
    중식: {
      매운: '짬뽕·마라',
      default: '중식',
    },
  }

  const map = conservative[cuisine] ?? { default: tail }
  if (pref.includes('매운')) return map.매운 ?? map.default
  if (pref.includes('국물')) return map.국물 ?? map.default
  if (pref.includes('밥')) return map.밥 ?? map.default
  return map.default
}

/** reason에 카테고리와 맞지 않는 메뉴가 언급됐는지 */
export function reasonMentionsInvalidMenu(reason: string, categoryName: string): boolean {
  const specialties = extractSpecialties(categoryName)
  const cat = categoryName.replace(/\s/g, '')

  const forbiddenIfMissing = [
    { terms: ['라멘', '라면'], need: /라멘|라면/ },
    { terms: ['짬뽕', '나가사키', '마라탕', '마라'], need: /짬뽕|마라|중식|분식/ },
    { terms: ['돈까스', '카츠', '로스카츠'], need: /돈까스|카츠/ },
    { terms: ['우동'], need: /우동/ },
    { terms: ['초밥', '스시', '회덮'], need: /초밥|스시|회/ },
    { terms: ['삼겹', '갈비', '스테이크'], need: /삼겹|고기|갈비|구이|양식|숯불/ },
    { terms: ['파스타'], need: /파스타|양식/ },
    { terms: ['떡볶'], need: /떡볶|분식/ },
    { terms: ['김치찌개', '제육', '순대'], need: /한식|찌개|국밥|분식/ },
  ]

  for (const { terms, need } of forbiddenIfMissing) {
    const mentioned = terms.some((t) => reason.includes(t))
    if (mentioned && !need.test(cat) && specialties.every((s) => !terms.some((t) => s.includes(t)))) {
      return true
    }
  }

  return false
}

export function formatAllowedMenus(categoryName: string): string {
  const specialties = extractSpecialties(categoryName)
  if (specialties.length > 0) return specialties.join('·')
  return shortCategoryLabel(categoryName)
}

function shortCategoryLabel(categoryName: string): string {
  const parts = categoryName.split('>').map((p) => p.trim()).filter(Boolean)
  return parts.slice(1).join(' > ') || parts[0] || '음식'
}

function shortMood(moods: string[]): string {
  for (const mood of moods) {
    for (const [key, phrase] of Object.entries(MOOD_PHRASES)) {
      if (mood.includes(key)) return phrase
    }
  }
  return '오늘 컨디션에 맞는'
}

function shortBudget(budget: string): string {
  if (budget.includes('1만원 이하') || budget.includes('1만')) return '1만원대로'
  if (budget.includes('1~2만')) return '1~2만원대로'
  if (budget.includes('법인') || budget.includes('제한 없음')) return '법카로 넉넉히'
  return ''
}

function shortDistance(distance: string): string {
  if (distance.includes('300') || distance.includes('30분') || distance.includes('400m')) return '점심 30분 안에'
  if (distance.includes('1000') || distance.includes('1km') || distance.includes('1시간 이상') || distance.includes('1시간이상')) return '시간 여유로'
  if (distance.includes('600') || distance.includes('700m') || distance.includes('1시간')) return '1시간 여유로'
  return ''
}

/** 문답 음식과 식당 메뉴가 직접 맞지 않을 때 솔직한 연결 문구 */
function foodConnectionPhrase(req: RecommendRequest, candidate: EnrichedCandidate): string {
  const menu = inferMenuHint(req, candidate)
  const pref = req.food[0] ?? ''
  const specialties = extractSpecialties(candidate.category_name)

  if (pref.includes('매운') && specialties.some((s) => s.includes('돈까스') || s.includes('우동'))) {
    return `매운 거보다 ${menu} 든든한 한 끼로`
  }
  if (pref.includes('매운') && !specialties.some((s) => /찌개|분식|중식|국밥/.test(s))) {
    return `${menu}로 속 든든하게`
  }
  return `${menu} 땡길 때`
}

export function buildQuizSummary(req: RecommendRequest): string {
  return [
    `식사=${req.meal}`,
    `자리=${formatSituations(req)}`,
    `기분=${formatMoods(req)}`,
    `음식=${req.food.join('+')}`,
    `거리=${req.distance}`,
    `예산=${req.budget}`,
  ].join(' | ')
}

function foodKeywordsFromReq(req: RecommendRequest, candidate?: EnrichedCandidate): string[] {
  const fromBlog = candidate?.blogMenuMentions ?? []
  const fromMenu = candidate ? inferMenuHint(req, candidate).split(/[··,·]/).map((s) => s.trim()) : []
  const fromPref = req.food.flatMap((f) => {
    if (f.includes('매운')) return ['매운', '얼큰', '자극', '든든']
    if (f.includes('국물')) return ['국물', '따끈', '우동']
    if (f.includes('가벼')) return ['가볍', '담백']
    if (f.includes('고기')) return ['고기', '구이', '돈까스']
    if (f.includes('면')) return ['면', '우동', '라멘']
    if (f.includes('밥')) return ['밥', '덮밥', '비빔밥']
    return []
  })
  return [...fromBlog, ...fromMenu, ...fromPref].filter((k) => k.length >= 2)
}

export function reasonLinksToQuiz(
  reason: string,
  req: RecommendRequest,
  candidate?: EnrichedCandidate,
): boolean {
  let hits = 0

  for (const situation of req.situation) {
    if (situation && reason.includes(situation)) hits += 1
    if (situation === '혼밥' && /혼밥|혼자|1인/.test(reason)) hits += 1
    if (situation === '함께' && /함께|단체|2인|3인|4인/.test(reason)) hits += 1
  }

  for (const mood of req.mood) {
    for (const key of Object.keys(MOOD_PHRASES)) {
      if (mood.includes(key) && reason.includes(key)) hits += 1
    }
  }

  const foodKeywords = foodKeywordsFromReq(req, candidate)
  if (foodKeywords.some((kw) => reason.includes(kw))) hits += 1

  if (req.distance.includes('300') && /30분|점심|빠르|가까/.test(reason)) hits += 1

  return hits >= 2
}

export function buildQuizLinkedReason(
  req: RecommendRequest,
  candidate: EnrichedCandidate,
  rank: number,
): string {
  const blogMenus = candidate.blogMenuMentions.slice(0, 3).join('·')
  const menu = blogMenus || inferMenuHint(req, candidate)
  const connection = foodConnectionPhrase(req, candidate)
  const mood = shortMood(req.mood)
  const time = shortDistance(req.distance)
  const budget = shortBudget(req.budget)
  const shopType = formatAllowedMenus(candidate.category_name)
  const kw = candidate.blogTopKeywords.slice(0, 2).join('·')

  const situations = formatSituations(req)
  const moodLabel = req.mood.some((m) => m.includes('스트레스')) ? '스트레스 받는 날' : '오늘'

  const templates = [
    blogMenus
      ? `${situations}에 ${req.food[0]?.includes('매운') ? '매운' : ''} ${blogMenus} — ${candidate.place_name}, 블로그 후기에서 확인된 메뉴예요.${time ? ` ${time} OK` : ''}`
      : `${situations}에 ${connection} — ${candidate.place_name}은 ${shopType}인데 ${mood} 한 끼로 괜찮아요.${time ? ` ${time} 다녀오기 좋고` : ''}${budget ? ` ${budget} 가능해요.` : '.'}`,
    `${moodLabel} ${menu}로 해결하기 좋은 ${candidate.place_name}.${blogMenus ? ` 블로그에 ${blogMenus} 언급 있어요.` : ''}${kw ? ` '${kw}' 후기도 있고요.` : ''}`,
    `${candidate.place_name} — ${hasSituation(req, '혼밥') ? '혼밥' : situations}하기 좋고, ${menu} 중심. 도보 ${candidate.walkMin}분.${rank === 1 ? ' 1순위!' : ''}`,
  ]

  return templates[(rank - 1) % templates.length]
}
