import { GoogleGenerativeAI } from '@google/generative-ai'
import type {
  GeminiOutput,
  RecommendRequest,
  ScoredPlace,
  WeatherInfo,
} from './types'

function buildPrompt(
  req: RecommendRequest,
  candidates: ScoredPlace[],
  weather: WeatherInfo | null,
): string {
  const candidateLines = candidates
    .slice(0, 8)
    .map((p, i) => {
      const distanceM = Math.round(Number(p.distance))
      const excellentLabel = p.excellentBonus ? 'O' : 'X'
      return `${i + 1}. id=${p.id} | ${p.place_name} | ${p.category_name} | 거리: ${distanceM}m | 도보 ${p.walkMin}분 | 네이버 블로그: ${p.blogMentions}건 | 모범음식점: ${excellentLabel} | score=${Math.round(p.score)}`
    })
    .join('\n')

  const weatherLine = weather
    ? `날씨: ${Math.round(weather.temp)}°C, ${weather.description}`
    : '날씨: 정보 없음'

  return `당신은 직장인 점심·회식 맞춤 AI "런치각"입니다.
톤: 친근하고 짧고 명쾌하게. 직장인 밈 활용.

## 중요 규칙
- 베이커리·제과·디저트·아이스크림 전문점은 절대 추천하지 마세요.
- 카페·커피 전문점은 "미팅" 상황이 아니면 추천하지 마세요.
- 한 끼 식사(점심·저녁)가 가능한 식당만 골라주세요.

## 사용자 조건
- 상황: ${req.situation}
- 기분: ${req.mood}
- 음식: ${req.food.join(', ')}
- 시간: ${req.time}
- 예산: ${req.budget}
- ${weatherLine}

## 후보 식당 (5문항 필터 통과 + score 순)
${candidateLines}

위 후보 중 정확히 3곳을 골라 JSON만 출력하세요.
반드시 후보 id(place_id)를 그대로 사용하세요.

JSON 스키마:
{
  "greeting": "한 줄 인사 (이모지 1개 포함)",
  "recommendation_reason": "2~3문장 추천 배경",
  "weather_comment": "날씨 한 줄 코멘트 또는 null",
  "picks": [
    { "place_id": "카카오 id", "reason": "1~2문장", "tip": "팁 또는 null" }
  ]
}`
}

function parseGeminiJson(text: string): GeminiOutput {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim()
  return JSON.parse(cleaned) as GeminiOutput
}

export async function generateRecommendations(
  req: RecommendRequest,
  candidates: ScoredPlace[],
  weather: WeatherInfo | null,
  apiKey: string,
): Promise<GeminiOutput> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' },
  })

  const result = await model.generateContent(buildPrompt(req, candidates, weather))
  const text = result.response.text()
  return parseGeminiJson(text)
}

export function fallbackGeminiOutput(
  req: RecommendRequest,
  candidates: ScoredPlace[],
  weather: WeatherInfo | null,
): GeminiOutput {
  const top3 = candidates.slice(0, 3)
  return {
    greeting: `${req.mood.includes('스트레스') ? '스트레스' : '오늘'}엔 든든하게 🍽️`,
    recommendation_reason: `${req.time} 조건에 맞춰 가까운 곳 위주로 골랐어요. ${req.budget} 예산도 고려했습니다.`,
    weather_comment: weather ? `지금 ${Math.round(weather.temp)}°C — ${weather.description}` : null,
    picks: top3.map((p) => ({
      place_id: p.id,
      reason: `${p.category_name} 카테고리, 도보 ${p.walkMin}분 거리예요.`,
      tip: p.blogMentions > 100 ? '블로그 언급 많은 곳 — 웨이팅 있을 수 있어요.' : null,
    })),
  }
}
