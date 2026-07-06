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
제공된 모든 정보(문답 결과, 날씨, 식당 목록, 블로그 평판, 모범음식점 여부)를
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

3. 블로그 평판(호감도) — 매우 중요
   - blogPositiveRatio(호감도 %)가 높은 곳 우선
   - 긍정 키워드(맛있, 재방문, 강추 등)가 많은 곳 우선
   - 언급 수만 많고 호감도 낮거나 부정 후기 많은 곳은 순위 낮춤
   - 카카오맵 별점이 낮을 가능성 있는 곳(부정 후기 다수)은 피할 것

4. 거리 — 중요
   - 30분이내 선택 시 400m 이내 우선
   - 1시간이면 700m 이내

5. 모범음식점 인증 — 가점 요소

[reason 작성 규칙 — 필수]
- picks 3개의 reason은 절대 같은 문장·같은 패턴을 쓰지 말 것
- 각 reason은 해당 식당만의 특징을 반드시 포함: 카테고리/대표 메뉴 추정, 블로그 긍정 키워드, 호감도, 모범음식점, 혼밥·회식 적합성 등
- "조건에 맞고 도보 N분" 같은 공통 문구만 반복 금지
- 카테고리·블로그 건수·도보 시간 나열만 하면 안 됨

[제약]
- 반드시 제공된 후보 목록 안에서만 선정
- picks[].reason: 이 식당을 고른 이유 (1~2문장, 식당별 고유)
- picks[].tip: 방문 꿀팁 (없으면 null). reason과 다른 내용
- 직장인 언어로 짧고 명쾌하게
- 베이커리·디저트·카페(미팅 제외)는 한 끼 식사 후보에서 제외

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

function formatCandidateBlock(candidate: EnrichedCandidate, index: number): string {
  const distanceM = Math.round(Number(candidate.distance))
  const excellentLabel = candidate.excellentBonus ? 'O' : 'X'

  return `${index + 1}. [${candidate.place_name}]
   카테고리: ${candidate.category_name} (대표: ${shortCategory(candidate.category_name)})
   거리: ${distanceM}m (도보 ${candidate.walkMin}분)
   주소: ${formatAddress(candidate)}
   블로그 평판: ${formatReputation(candidate)}
   모범음식점: ${excellentLabel}
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

=== 후보 식당 (${candidates.length}개, 평판점수 순) ===
${candidateBlocks}

위 정보를 종합해서 오늘 이 사람에게 가장 잘 맞는 식당 3곳을 직접 골라줘.
호감도 낮고 부정 후기 많은 곳은 피하고, picks[].reason은 식당마다 반드시 다르게 써줘.
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
  const cat = shortCategory(candidate.category_name)
  const ratioPct = Math.round(candidate.blogPositiveRatio * 100)
  const kw = candidate.blogTopKeywords.slice(0, 2).join('·')
  const foodHint = req.food[0]?.replace(/\(.*\)/, '').trim() ?? ''

  const variants: string[] = []

  if (candidate.excellentBonus) {
    variants.push(
      `${candidate.place_name}은 모범음식점 ${cat}집 — 위생·서비스 검증됐고 ${req.situation}에도 부담 없어요.`,
    )
  }

  if (candidate.blogPositiveRatio >= 0.6 && candidate.blogMentions >= 3) {
    variants.push(
      kw
        ? `${cat} ${candidate.place_name}, 블로그에서 '${kw}' 후기가 많고 호감도 ${ratioPct}%예요. ${foodHint} 땡길 때 무난해요.`
        : `${candidate.place_name} — 최근 블로그 호감도 ${ratioPct}%로 후기가 괜찮은 ${cat}집이에요.`,
    )
  } else if (candidate.blogMentions >= 5 && candidate.blogPositiveRatio < 0.4) {
    variants.push(
      `${candidate.place_name}은 ${cat}인데, 가까워서 ${rank}순위로 넣었어요. 혼잡할 수 있으니 참고하세요.`,
    )
  }

  if (req.situation === '혼밥') {
    variants.push(
      `${candidate.place_name} — ${cat} 혼밥하기 편한 편이고 도보 ${candidate.walkMin}분 거리예요. ${req.mood.includes('스트레스') ? '스트레스 풀기 좋은' : '오늘'} 한 끼로 OK.`,
    )
  }

  variants.push(
    `${candidate.place_name}: ${cat} 전문점인데 ${foodHint || '한 끼'}랑 잘 맞고, 도보 ${candidate.walkMin}분이면 ${req.time.includes('30분') ? '점심 타임에' : '여유롭게'} 다녀올 수 있어요.`,
  )

  if (kw) {
    variants.push(
      `'${kw}' 언급 많은 ${candidate.place_name} — ${cat}계에서 ${req.situation}하기 괜찮은 선택이에요.`,
    )
  }

  for (const reason of variants) {
    const key = normalizeReasonKey(reason)
    if (!usedKeys.has(key)) {
      usedKeys.add(key)
      return reason
    }
  }

  const fallback = `${candidate.place_name}(${cat}) — ${rank}순위 추천, 도보 ${candidate.walkMin}분.`
  usedKeys.add(normalizeReasonKey(fallback))
  return fallback
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

  if (!reason || isGenericReason(reason) || usedReasonKeys.has(normalizeReasonKey(reason))) {
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

  const usedReasonKeys = new Set<string>()

  return {
    greeting: `${req.mood.includes('스트레스') ? '스트레스' : '오늘'}도 각 잡고 먹자 🍽️`,
    recommendation_reason: `${req.situation} · ${req.food.join(', ')} 조건에 맞고, 블로그 호감도 좋은 곳 위주로 골랐어요.`,
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
