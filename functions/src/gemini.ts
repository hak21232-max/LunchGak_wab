import { GoogleGenerativeAI } from '@google/generative-ai'
import type {
  EnrichedCandidate,
  GeminiOutput,
  GeminiPickDraft,
  RecommendRequest,
  WeatherInfo,
} from './types'

const SYSTEM_PROMPT = `당신은 대한민국 직장인의 점심·회식 맛집을 추천하는 AI 어시스턴트 "각이"입니다.

[역할]
제공된 모든 정보(문답 결과, 날씨, 식당 목록, 블로그 언급 수, 모범음식점 여부)를
종합적으로 판단해서 최적의 식당 3곳을 직접 선정하고 순위를 매겨줘.

[순위 결정 기준 — 중요도 순]
1. 사용자 문답 (자리/기분/음식/시간/예산) — 가장 중요
   - 혼밥이면 혼자 먹기 편한 곳 우선
   - 30분이내면 가까운 곳 절대 우선
   - 법카면 가격 제한 없이 분위기 있는 곳
   - 기분/음식 궁합이 맞는 카테고리 우선

2. 날씨 — 중요
   - 비: 실내, 국물류 우선
   - 폭염(33도↑): 냉면, 실내 에어컨 우선
   - 추위(5도↓): 따뜻한 국물 우선
   - 쾌청: 제한 없음

3. 거리 — 중요
   - 30분이내 선택 시 400m 이내 절대 우선
   - 1시간이면 700m 이내

4. 네이버 블로그 언급 수 — 참고
   - 언급 수가 많을수록 인기 있는 곳
   - 단, 거리·문답 조건이 맞으면 언급 수가 적어도 추천 가능

5. 모범음식점 인증 — 가점 요소
   - 위생·서비스 검증된 곳이므로 동점일 때 우선
   - 추천 이유에 자연스럽게 언급

[제약]
- 반드시 제공된 후보 목록 안에서만 선정 (없는 식당 지어내기 절대 금지)
- 추천 이유는 위 기준과 반드시 연결
- 직장인 언어로 짧고 명쾌하게
- 이모지 1~2개 적절히 사용
- 베이커리·디저트·카페(미팅 제외)는 한 끼 식사 후보에서 제외

[출력 — 반드시 JSON만, 마크다운 없이]
{
  "greeting": "오늘 상황 공감 한 마디 (1문장, 이모지 1개)",
  "recommendation_reason": "선정 배경 요약 (2문장 이내)",
  "picks": [
    {
      "rank": 1,
      "place_id": "카카오 id",
      "name": "식당명",
      "category": "카테고리",
      "reason": "1순위 선정 이유 — 문답·날씨·거리·인기도를 연결해서 (1~2문장)",
      "tip": "꿀팁 (1문장, 없으면 null)",
      "walk_min": 5,
      "mood_match_score": 92
    },
    { "rank": 2, "...": "..." },
    { "rank": 3, "...": "..." }
  ],
  "weather_comment": "날씨 한 마디 (특이사항 없으면 null)"
}`

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function getKstNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
}

function resolveMealType(hour: number): string {
  if (hour >= 17) return '저녁'
  if (hour >= 11) return '점심'
  if (hour >= 5) return '브런치·점심'
  return '야식·새벽'
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

function formatCandidateBlock(candidate: EnrichedCandidate, index: number): string {
  const distanceM = Math.round(Number(candidate.distance))
  const excellentLabel = candidate.excellentBonus ? 'O' : 'X'

  return `${index + 1}. [${candidate.place_name}]
   카테고리: ${candidate.category_name}
   거리: ${distanceM}m (도보 ${candidate.walkMin}분)
   주소: ${formatAddress(candidate)}
   네이버 블로그 언급: ${candidate.blogMentions}건
   모범음식점: ${excellentLabel}
   카카오맵: ${candidate.place_url}
   place_id: ${candidate.id}`
}

function buildUserPrompt(
  req: RecommendRequest,
  candidates: EnrichedCandidate[],
  weather: WeatherInfo | null,
): string {
  const kst = getKstNow()
  const weekday = WEEKDAYS[kst.getDay()]
  const hour = kst.getHours()
  const mealType = resolveMealType(hour)

  const temp = weather ? Math.round(weather.temp) : null
  const weatherDesc = weather?.description ?? '정보 없음'
  const weatherExtra = buildWeatherExtra(weather)

  const candidateBlocks = candidates.map(formatCandidateBlock).join('\n\n')

  return `=== 사용자 문답 ===
자리: ${req.situation}
기분: ${req.mood}
땡기는 음식: ${req.food.join(', ')}
가용 시간: ${req.time}
예산: ${req.budget}

=== 자동 감지 정보 ===
현재 시간: ${weekday}요일 ${hour}시 (${mealType})
날씨: ${weatherDesc}, 기온 ${temp ?? '?'}°C ${weatherExtra}
위치: 현재 위치 기준

=== 후보 식당 전체 목록 (${candidates.length}개) ===
${candidateBlocks}

위 정보를 종합해서 오늘 이 사람에게 가장 잘 맞는 식당 3곳을 직접 골라줘.
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
  return (
    candidates.find((c) => String(c.id) === String(pick.place_id)) ??
    candidates.find((c) => c.place_name === pick.name) ??
    candidates[index] ??
    candidates[0]
  )
}

function isMetadataReason(text: string): boolean {
  return /음식점\s*>/.test(text) && /도보\s*\d+분/.test(text)
}

function buildFallbackReason(
  req: RecommendRequest,
  candidate: EnrichedCandidate,
): string {
  const foodHint = req.food[0]?.replace(/\(.*\)/, '').trim() ?? '한 끼'
  return `${req.situation} · ${foodHint} 조건에 맞고 도보 ${candidate.walkMin}분 거리라 오늘 pick이에요.`
}

function normalizePick(
  pick: Partial<GeminiPickDraft>,
  fallback: EnrichedCandidate,
  rank: number,
  req?: RecommendRequest,
): GeminiPickDraft {
  const rawReason = pick.reason?.trim()
  const reason =
    rawReason && !isMetadataReason(rawReason)
      ? rawReason
      : req
        ? buildFallbackReason(req, fallback)
        : `${fallback.place_name} — 도보 ${fallback.walkMin}분 거리의 추천이에요.`

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
  const picks = (output.picks ?? [])
    .slice(0, 3)
    .map((pick, index) => {
      const fallback = findCandidate(pick, candidates, index)
      return normalizePick(pick, fallback, index + 1, req)
    })

  return {
    greeting: output.greeting ?? '오늘 점심, 각 잡고 고르셨네요 🍽️',
    recommendation_reason:
      output.recommendation_reason ?? '문답·날씨·거리를 종합해 골랐어요.',
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
  const top3 = candidates.slice(0, 3)

  return {
    greeting: `${req.mood.includes('스트레스') ? '스트레스' : '오늘'}도 각 잡고 먹자 🍽️`,
    recommendation_reason: `${req.situation} · ${req.food.join(', ')} 조건에 맞춰 가까운 곳 위주로 골랐어요.`,
    weather_comment: weather ? `지금 ${Math.round(weather.temp)}°C — ${weather.description}` : null,
    picks: top3.map((p, index) => ({
      rank: index + 1,
      place_id: p.id,
      name: p.place_name,
      category: p.category_name,
      reason: buildFallbackReason(req, p),
      tip: p.blogMentions > 100 ? '블로그 언급 많은 곳 — 웨이팅 있을 수 있어요.' : null,
      walk_min: p.walkMin,
      mood_match_score: Math.max(70, 92 - index * 8),
    })),
  }
}
