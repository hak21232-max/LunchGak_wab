import type { EnrichedCandidate, RecommendRequest } from './types'

/** 음식 선호 + 카테고리 → 해당 식당에서 추정 가능한 메뉴/특징 */
const FOOD_MENU_BY_CATEGORY: Record<string, Record<string, string>> = {
  '얼큰하고 자극적인 음식': {
    한식: '김치찌개·제육볶음·순대국',
    중식: '마라탕·짬뽕·마파두부',
    분식: '떡볶이·라볶이',
    일식: '매운 라멘·나가사키 짬뽕',
    아시안: '쌀국수 맵게·똠얌꿍',
    default: '얼큰한 찌개·볶음류',
  },
  '따뜻하고 든든한 국물 음식': {
    한식: '국밥·설렁탕·갈비탕',
    중식: '우육면·짬뽕 국물',
    일식: '우동·라멘',
    default: '따끈한 국물 메뉴',
  },
  '가볍고 깔끔한 음식': {
    한식: '비빔밥·쌈밥·정식',
    일식: '초밥·회·우동',
    양식: '샐러드·수프',
    default: '담백한 한 끼',
  },
  '고기류(삼겹살·갈비·스테이크 등)': {
    한식: '삼겹살·갈비·불고기',
    양식: '스테이크·립',
    default: '고기 구이·정육',
  },
  '면 요리(라멘·칼국수·파스타 등)': {
    한식: '칼국수·냉면',
    중식: '짜장면·짬뽕',
    일식: '라멘·우동',
    양식: '파스타',
    default: '면 요리',
  },
}

const MOOD_PHRASES: Record<string, string> = {
  스트레스: '스트레스 풀기엔 속 시원한',
  피곤: '피곤할 때 든든하게 채울',
  기분좋음: '기분 좋을 때 가볍게 즐길',
  평범: '평범한 점심에 무난한',
  몸안좋음: '몸 상태 안 좋을 때 부담 없는',
}

function detectCategoryKey(categoryName: string): string {
  const keys = ['한식', '중식', '일식', '양식', '분식', '아시안', '고기', '국밥', '면']
  for (const key of keys) {
    if (categoryName.includes(key)) return key
  }
  return 'default'
}

function shortMood(mood: string): string {
  for (const [key, phrase] of Object.entries(MOOD_PHRASES)) {
    if ( mood.includes(key)) return phrase
  }
  return '오늘 컨디션에 맞는'
}

function shortBudget(budget: string): string {
  if (budget.includes('1만원 이하') || budget.includes('1만')) return '1만원대로'
  if (budget.includes('1~2만')) return '1~2만원대로'
  if (budget.includes('법인') || budget.includes('제한 없음')) return '법카로 넉넉히'
  return ''
}

function shortTime(time: string): string {
  if (time.includes('30분') || time.includes('400m')) return '점심 30분 안에'
  if (time.includes('1시간') || time.includes('700m')) return '1시간 여유로'
  if (time.includes('저녁') || time.includes('회식')) return '저녁 회식으로'
  return ''
}

/** 식당 카테고리 + 사용자 음식 선호 → 추정 메뉴 문구 */
export function inferMenuHint(req: RecommendRequest, candidate: EnrichedCandidate): string {
  const catKey = detectCategoryKey(candidate.category_name)

  for (const pref of req.food) {
    if (pref.includes('자유')) {
      const cat = candidate.category_name.split('>').pop()?.trim() ?? '메뉴'
      return `${cat} 대표 메뉴`
    }

    const menuMap = FOOD_MENU_BY_CATEGORY[pref]
    if (menuMap) {
      return menuMap[catKey] ?? menuMap.default ?? pref.replace(/\(.*\)/, '').trim()
    }
  }

  return req.food[0]?.replace(/\(.*\)/, '').trim() ?? '한 끼'
}

export function buildQuizSummary(req: RecommendRequest): string {
  return [
    `자리=${req.situation}`,
    `기분=${req.mood}`,
    `음식=${req.food.join('+')}`,
    `시간=${req.time}`,
    `예산=${req.budget}`,
  ].join(' | ')
}

function foodKeywordsFromReq(req: RecommendRequest): string[] {
  return req.food.flatMap((f) => {
    if (f.includes('얼큰') || f.includes('자극')) {
      return ['매운', '얼큰', '자극', '찌개', '볶음', '마라', '짬뽕', '떡볶', '제육', '김치']
    }
    if (f.includes('국물')) return ['국물', '국밥', '탕', '찌개', '우동', '라멘', '곰탕', '설렁탕']
    if (f.includes('가벼')) return ['가볍', '담백', '비빔', '샐러드', '초밥', '회']
    if (f.includes('고기')) return ['고기', '삼겹', '갈비', '구이', '스테이크', '숯불', '연탄']
    if (f.includes('면')) return ['면', '라멘', '칼국수', '파스타', '짜장', '우동']
    if (f.includes('자유')) return ['메뉴', '한 끼']
    return [f.replace(/\(.*\)/, '').trim().slice(0, 4)]
  })
}

/** reason에 5문답 연결 여부 (음식·자리·기분 중 2개 이상) */
export function reasonLinksToQuiz(reason: string, req: RecommendRequest): boolean {
  let hits = 0

  if (req.situation && reason.includes(req.situation)) hits += 1
  if (req.situation === '혼밥' && /혼밥|혼자|1인/.test(reason)) hits += 1
  if (req.situation === '회식' && /회식|단체|술/.test(reason)) hits += 1
  if (req.situation === '팀점심' && /팀|동료|함께/.test(reason)) hits += 1

  for (const key of Object.keys(MOOD_PHRASES)) {
    if (req.mood.includes(key) && reason.includes(key)) {
      hits += 1
      break
    }
  }

  const foodKeywords = foodKeywordsFromReq(req)
  if (foodKeywords.some((kw) => kw.length >= 2 && reason.includes(kw))) hits += 1

  if (req.time.includes('30분') && /30분|점심|빠르|가까/.test(reason)) hits += 1
  if (req.budget.includes('1만') && /1만|가성비|저렴|부담/.test(reason)) hits += 1

  return hits >= 2
}

/** 5문답 + 식당 특징을 묶은 reason (fallback·보강용) */
export function buildQuizLinkedReason(
  req: RecommendRequest,
  candidate: EnrichedCandidate,
  rank: number,
): string {
  const menu = inferMenuHint(req, candidate)
  const mood = shortMood(req.mood)
  const time = shortTime(req.time)
  const budget = shortBudget(req.budget)
  const cat = candidate.category_name.split('>').pop()?.trim() ?? '음식'
  const kw = candidate.blogTopKeywords.slice(0, 2).join('·')

  const templates = [
    `${req.situation}에 ${menu} 땡길 때 — ${candidate.place_name} ${cat}집에서 ${mood} 한 끼로 딱이에요.${time ? ` ${time} 다녀오기 좋고` : ''}${budget ? ` ${budget} 가능해요.` : '.'}`,
    `${req.mood.includes('스트레스') ? '스트레스 받는 날' : '오늘'} ${req.food.join(', ')} 원하셨잖아요. ${candidate.place_name}은 ${menu} 쪽으로 후기 많은 ${cat}집이에요.${kw ? ` 블로그에 '${kw}' 언급도 있고요.` : ''}`,
    `${candidate.place_name} — ${req.situation}하기 좋은 ${cat}집인데, ${menu} 메뉴가 ${req.food[0]?.includes('얼큰') ? '얼큰한 편' : '문답 조건'}이랑 잘 맞아요. 도보 ${candidate.walkMin}분.${rank === 1 ? ' 1순위 pick!' : ''}`,
    `${menu} 찾으셨는데 ${candidate.place_name}이 ${cat}계에서 ${mood} 선택이에요. ${req.situation}${req.budget.includes('1만') ? ', 1만원대' : ''} 조건까지 챙겼어요.`,
  ]

  return templates[(rank - 1) % templates.length]
}
