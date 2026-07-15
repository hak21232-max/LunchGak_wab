import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  buildQuizLinkedReason,
  buildQuizSummary,
  reasonLinksToQuiz,
} from './quizContext'
import { formatBlogMenuBlock } from './naver'
import { formatSituations } from './quizAnswers'
import { resolveFoodVibe } from './quizSearch'
import type {
  EnrichedCandidate,
  GeminiOutput,
  GeminiPickDraft,
  RecommendRequest,
  WeatherInfo,
} from './types'

const SYSTEM_PROMPT = `당신은 대한민국 직장인의 점심·회식 맛집을 추천하는 AI 어시스턴트 "각이"입니다.

[역할]
제공된 모든 정보(문답 결과, 날씨, 식당 목록, 블로그 평판, 모범음식점 여부)를
종합적으로 판단해서 최적의 식당 3곳을 직접 선정하고 순위를 매겨줘.

[음식 정확도 — Gemini 1차 판단]
사용자 음식 결: {foodVibe} (아래 검증 규칙 참고)

- "매운": 블로그에 "매운","얼큰","마라","청양" 또는 매운 메뉴 언급 필수. 한식이어도 매운 메뉴 없으면 제외
- "면류": 국수·라멘·우동·칼국수·냉면·파스타가 주메뉴. 삼겹살집 냉면 사리는 제외
- "고기": 삼겹·갈비·스테이크 등 고기 주력. 국밥 고기 토핑은 제외
- "국물": 찌개·탕·국밥·해장국 위주
- "밥류": 덮밥·비빔밥·볶음밥·백반 등 밥이 주메뉴
- "가벼운": 샐러드·죽·비빔밥·샌드위치 등. 기름진 메뉴 제외

조건 맞는 곳이 없으면 picks: [] 반환.

[순위 결정 기준 — 중요도 순]
1. 사용자 문답 — 특히 **땡기는 음식** (최우선)
   - 「블로그 언급 메뉴」+「블로그 후기 발췌」로 위 음식 결 충족 여부 판단
   - 카테고리만으로 추천하지 말 것

2. 날씨 — 중요
   - 비: 실내, 국물류 우선
   - 폭염(33도↑): 냉면, 실내 에어컨 우선
   - 추위(5도↓): 따뜻한 국물 우선

3. 블로그 평판(호감도) — 매우 중요
   - blogPositiveRatio(호감도 %)가 높은 곳 우선
   - 긍정 키워드(맛있, 재방문, 강추 등)가 많은 곳 우선
   - 언급 수만 많고 호감도 낮거나 부정 후기 많은 곳은 순위 낮춤
   - 카카오맵 별점이 낮을 가능성 있는 곳(부정 후기 다수)은 피할 것

4. 거리 — 중요
   - 30분 이내 선택 시 400m 이내 우선
   - 1시간 정도면 700m 이내
   - 1시간 이상이면 1km까지 허용

5. 모범음식점 인증 — 가점 요소

[reason 작성 규칙 — 필수]
- picks 3개의 reason은 절대 같은 문장·같은 패턴을 쓰지 말 것
- 각 reason은 반드시 사용자 5문답과 연결할 것:
  · 자리(혼밥/함께/회식) → 그에 맞는 식당 특징 언급
  · 기분(스트레스/피곤 등) → 왜 이 음식·분위기가 기분에 맞는지
  · 땡기는 음식 → **블로그에서 확인된 메뉴**만 reason에 언급 (「블로그 언급 메뉴」·「후기 발췌」 근거)
  · 블로그에 없는 메뉴는 추측·창작 금지 (돈까스집에 라멘 언급 X)
  · 문답 음식과 블로그 메뉴가 안 맞으면 그 식당은 애초에 picks에 넣지 말 것
  · 가용 시간 → 점심 30분·1시간 등 시간 제약과의 궁합
  · 예산 → 1만원대·법카 등 가격대 적합성 (해당 시)
- 예시: "혼밥에 매운 거 땡길 때 — 직화한상에서 제육·김치찌개 같은 얼큰 한식, 점심 30분 안에 해결 가능"
- 각 reason은 해당 식당만의 특징도 포함: 카테고리, 블로그 긍정 키워드, 호감도, 모범음식점
- "조건에 맞고 도보 N분" 같은 공통 문구만 반복 금지

[제약]
- 반드시 제공된 후보 목록 안에서만 선정
- picks[].reason: 블로그에서 확인한 메뉴 + 5문답 연결 (1~2문장). **블로그에 없는 메뉴명 사용 금지**
- picks[].tip: 방문 꿀팁 (없으면 null). reason과 다른 내용
- 직장인 언어로 짧고 명쾌하게
- 베이커리·디저트·카페는 한 끼 식사 후보에서 제외

[출력 — 반드시 JSON만]
{
  "greeting": "오늘 상황 공감 한 마디 (1문장, 이모지 1개)",
  "recommendation_reason": "선정 배경 요약 (2문장 이내)",
  "picks": [
    {
      "rank": 1,
      "place_id": "카카오 id",
      "name": "식당명",
      "category": "카테고리",
      "reason": "이 식당만의 특징+문답 궁합 (1~2문장, 다른 pick과 다른 표현)",
      "tip": "꿀팁 (1문장, 없으면 null)",
      "walk_min": 5,
      "mood_match_score": 92
    }
  ],
  "weather_comment": "날씨 한 마디 (특이사항 없으면 null)"
}`

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function getKstNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
}

function buildWeatherExtra(weather: WeatherInfo | null): string {
  if (!weather) return ''

  const temp = weather.temp
  const desc = weather.description

  if (desc.includes('비') || desc.includes('소나기') || desc.includes('눈')) {
    return '(비/눈 — 실내·국물류 우선 고려)'
  }
  if (temp >= 33) return '(폭염 — 냉면·실내 우선 고려)'
  if (temp <= 5) return '(추위 — 따뜻한 국물 우선 고려)'
  return '(쾌청 — 날씨 제약 적음)'
}

function formatAddress(candidate: EnrichedCandidate): string {
  return candidate.road_address_name || candidate.address_name || '주소 정보 없음'
}

function shortCategory(categoryName: string): string {
  const parts = categoryName.split('>').map((p) => p.trim()).filter(Boolean)
  return parts[parts.length - 1] ?? categoryName
}

function formatReputation(candidate: EnrichedCandidate): string {
  const ratioPct = Math.round(candidate.blogPositiveRatio * 100)
  const keywords =
    candidate.blogTopKeywords.length > 0
      ? candidate.blogTopKeywords.slice(0, 3).join(', ')
      : '키워드 없음'

  return `호감도 ${ratioPct}% (긍정 ${candidate.blogPositiveCount}건 / 부정 ${candidate.blogNegativeCount}건 / 총 ${candidate.blogMentions}건) | 긍정 키워드: ${keywords} | 평판점수: ${Math.round(candidate.reputationScore)}`
}

function formatCandidateBlock(
  candidate: EnrichedCandidate,
  index: number,
  req: RecommendRequest,
): string {
  const distanceM = Math.round(Number(candidate.distance))
  const excellentLabel = candidate.excellentBonus ? 'O' : 'X'
  const blogMenuBlock = formatBlogMenuBlock({
    mentionCount: candidate.blogMentions,
    positiveCount: candidate.blogPositiveCount,
    negativeCount: candidate.blogNegativeCount,
    positiveRatio: candidate.blogPositiveRatio,
    topKeywords: candidate.blogTopKeywords,
    menuMentions: candidate.blogMenuMentions,
    blogSnippets: candidate.blogSnippets,
  })

  return `${index + 1}. [${candidate.place_name}]
   카테고리: ${candidate.category_name} (대표: ${shortCategory(candidate.category_name)})
   ${blogMenuBlock}
   거리: ${distanceM}m (도보 ${candidate.walkMin}분)
   주소: ${formatAddress(candidate)}
   블로그 평판: ${formatReputation(candidate)}
   모범음식점: ${excellentLabel}
   place_id: ${candidate.id}
   ※ 위 블로그 메뉴·후기를 보고 "${req.food.join(', ')}" 조건에 맞는지 판단할 것`
}

function buildUserPrompt(
  req: RecommendRequest,
  candidates: EnrichedCandidate[],
  weather: WeatherInfo | null,
): string {
  const kst = getKstNow()
  const weekday = WEEKDAYS[kst.getDay()]
  const hour = kst.getHours()

  const temp = weather ? Math.round(weather.temp) : null
  const weatherDesc = weather?.description ?? '정보 없음'
  const weatherExtra = buildWeatherExtra(weather)

  const foodVibe = resolveFoodVibe(req)
  const candidateBlocks = candidates
    .map((c, i) => formatCandidateBlock(c, i, req))
    .join('\n\n')

  return `=== 사용자 문답 (reason에 반드시 반영) ===
${buildQuizSummary(req)}
음식 결(foodVibe): ${foodVibe}

=== 자동 감지 정보 ===
현재 시간: ${weekday}요일 ${hour}시 (참고)
선택 식사 시간대: ${req.meal} (사용자 선택 — 추천·reason에 반영)
날씨: ${weatherDesc}, 기온 ${temp ?? '?'}°C ${weatherExtra}

=== 후보 식당 (${candidates.length}개) — 블로그 메뉴·후기(description)를 보고 문답 음식에 맞는 3곳 선정 ===
${candidateBlocks}

위 후보 중 블로그에 실제 언급된 메뉴가 사용자 문답(특히 음식)과 맞는 곳만 골라 3곳 순위 매겨줘.
블로그에 해당 메뉴 근거가 없으면 picks에 넣지 마.
picks[].reason에는 블로그에서 확인한 구체 메뉴명 + 5문답 연결. reason은 식당마다 다르게.
반드시 JSON만 반환.`
}

function parseGeminiJson(text: string): GeminiOutput {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim()
  return JSON.parse(cleaned) as GeminiOutput
}

function findCandidate(
  pick: Partial<GeminiPickDraft>,
  candidates: EnrichedCandidate[],
  index: number,
): EnrichedCandidate {
  const byId = candidates.find((c) => String(c.id) === String(pick.place_id))
  if (byId) return byId

  const byName = candidates.find((c) => c.place_name === pick.name)
  if (byName) return byName

  const target = pick.name?.replace(/\s/g, '') ?? ''
  const byPartial = candidates.find((c) => {
    const name = c.place_name.replace(/\s/g, '')
    return (
      name === target ||
      (target.length >= 2 && (name.includes(target) || target.includes(name)))
    )
  })
  if (byPartial) return byPartial

  return candidates[index] ?? candidates[0]
}

function isMetadataReason(text: string): boolean {
  return /음식점\s*>/.test(text) && /도보\s*\d+분/.test(text)
}

function isGenericReason(text: string): boolean {
  return /조건에\s*맞고\s*도보/.test(text) || /오늘\s*pick/.test(text)
}

function normalizeReasonKey(text: string): string {
  return text.replace(/\s/g, '').slice(0, 40)
}

function buildDistinctReason(
  req: RecommendRequest,
  candidate: EnrichedCandidate,
  rank: number,
  usedKeys: Set<string>,
): string {
  const blogMenus = candidate.blogMenuMentions.slice(0, 3).join('·')
  const menuLabel = blogMenus || shortCategory(candidate.category_name)
  const kw = candidate.blogTopKeywords.slice(0, 2).join('·')

  const variants = [
    buildQuizLinkedReason(req, candidate, rank),
    `${formatSituations(req)}에 ${req.food[0]?.includes('매운') ? '매운' : ''} ${menuLabel} — ${candidate.place_name}, 블로그 후기 기준 ${rank}순위.`,
    blogMenus
      ? `블로그에 '${blogMenus}' 언급 많은 ${candidate.place_name}. ${req.food.join(', ')} 조건에 맞아요.`
      : `${candidate.place_name} — ${formatSituations(req)}, 도보 ${candidate.walkMin}분.`,
    kw ? `'${kw}' 후기도 있는 ${candidate.place_name}. ${menuLabel} 중심이에요.` : '',
  ].filter(Boolean)

  for (const reason of variants) {
    const k = normalizeReasonKey(reason)
    if (!usedKeys.has(k)) {
      usedKeys.add(k)
      return reason
    }
  }

  const fallback = buildQuizLinkedReason(req, candidate, rank + 2)
  usedKeys.add(normalizeReasonKey(fallback))
  return fallback
}

function reasonMentionsUnverifiedMenu(
  reason: string,
  candidate: EnrichedCandidate,
): boolean {
  if (candidate.blogMenuMentions.length === 0) return false

  const mentioned = candidate.blogMenuMentions.filter(
    (menu) => menu.length >= 2 && reason.includes(menu),
  )
  if (mentioned.length > 0) return false

  return /찌개|볶음|탕|국밥|면|라멘|우동|돈까스|떡볶|마라|짬뽕|삼겹|갈비|초밥|파스타/.test(reason)
}

function normalizePick(
  pick: Partial<GeminiPickDraft>,
  fallback: EnrichedCandidate,
  rank: number,
  req: RecommendRequest,
  usedReasonKeys: Set<string>,
): GeminiPickDraft {
  const rawReason = pick.reason?.trim()
  let reason = rawReason && !isMetadataReason(rawReason) ? rawReason : ''

  const unverifiedMenu = reason && reasonMentionsUnverifiedMenu(reason, fallback)
  const needsQuizLink = !reason || !reasonLinksToQuiz(reason, req, fallback)

  if (
    !reason ||
    isGenericReason(reason) ||
    usedReasonKeys.has(normalizeReasonKey(reason)) ||
    needsQuizLink ||
    unverifiedMenu
  ) {
    reason = buildDistinctReason(req, fallback, rank, usedReasonKeys)
  } else {
    usedReasonKeys.add(normalizeReasonKey(reason))
  }

  return {
    rank: pick.rank ?? rank,
    place_id: String(fallback.id),
    name: pick.name ?? fallback.place_name,
    category: pick.category ?? fallback.category_name,
    reason,
    tip: pick.tip ?? null,
    walk_min: pick.walk_min ?? fallback.walkMin,
    mood_match_score: Math.min(100, Math.max(0, pick.mood_match_score ?? 80)),
  }
}

function normalizeOutput(
  output: GeminiOutput,
  candidates: EnrichedCandidate[],
  req: RecommendRequest,
): GeminiOutput {
  const usedReasonKeys = new Set<string>()

  const picks = (output.picks ?? [])
    .slice(0, 3)
    .map((pick, index) => {
      const fallback = findCandidate(pick, candidates, index)
      return normalizePick(pick, fallback, index + 1, req, usedReasonKeys)
    })

  return {
    greeting: output.greeting ?? '오늘 점심, 각 잡고 고르셨네요 🍽️',
    recommendation_reason:
      output.recommendation_reason ??
      '문답·평판·거리를 종합해 호감도 좋은 곳 위주로 골랐어요.',
    picks,
    weather_comment: output.weather_comment ?? null,
  }
}

export async function generateRecommendations(
  req: RecommendRequest,
  candidates: EnrichedCandidate[],
  weather: WeatherInfo | null,
  apiKey: string,
): Promise<GeminiOutput> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: { responseMimeType: 'application/json' },
  })

  const result = await model.generateContent(buildUserPrompt(req, candidates, weather))
  const text = result.response.text()
  return normalizeOutput(parseGeminiJson(text), candidates, req)
}

export function fallbackGeminiOutput(
  req: RecommendRequest,
  candidates: EnrichedCandidate[],
  weather: WeatherInfo | null,
): GeminiOutput {
  const top3 = [...candidates]
    .sort((a, b) => b.reputationScore - a.reputationScore)
    .slice(0, 3)

  if (top3.length === 0) {
    return {
      greeting: '근처에 딱 맞는 맛집이 없네요 😅',
      recommendation_reason: `'${resolveFoodVibe(req)}' 조건에 맞는 식당이 없어요.`,
      weather_comment: weather ? `지금 ${Math.round(weather.temp)}°C — ${weather.description}` : null,
      picks: [],
    }
  }

  const usedReasonKeys = new Set<string>()

  return {
    greeting: `${req.mood.some((m) => m.includes('스트레스')) ? '스트레스' : '오늘'}도 각 잡고 먹자 🍽️`,
    recommendation_reason: `${formatSituations(req)} · ${req.food.join(', ')} 조건에 맞고, 블로그 호감도 좋은 곳 위주로 골랐어요.`,
    weather_comment: weather ? `지금 ${Math.round(weather.temp)}°C — ${weather.description}` : null,
    picks: top3.map((p, index) => ({
      rank: index + 1,
      place_id: p.id,
      name: p.place_name,
      category: p.category_name,
      reason: buildDistinctReason(req, p, index + 1, usedReasonKeys),
      tip: null,
      walk_min: p.walkMin,
      mood_match_score: Math.max(70, 92 - index * 8),
    })),
  }
}
