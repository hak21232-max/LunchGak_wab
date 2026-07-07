import { useCallback, useEffect, useState } from 'react'
import { resolveFunctionUrl } from '../utils/functionsUrl'
import { normalizeRecommendResponse } from '../utils/normalizePick'

const MOOD_MAP = {
  스트레스: '스트레스가 심한 상태',
  피곤: '몸이 많이 피곤한 상태',
  기분좋음: '기분이 좋고 에너지가 넘치는 상태',
  평범: '특별한 감정 없이 평범한 상태',
  몸안좋음: '몸이 좋지 않고 컨디션이 안 좋은 상태',
}

const FOOD_MAP = {
  매운: '매운 음식',
  국물: '따뜻하고 든든한 국물 음식',
  면류: '면 요리(라멘·칼국수·파스타 등)',
  밥류: '밥·덮밥·비빔밥 등',
  고기: '고기류(삼겹살·갈비·스테이크 등)',
  가벼운: '가볍고 깔끔한 음식',
  자유: '날씨와 기분 고려해 AI가 자유 선택',
}

const TIME_MAP = {
  '30분이내': '30분 이내 (반경 400m)',
  '1시간정도': '1시간 정도 (반경 700m)',
  '1시간이상': '1시간 이상 (반경 1km)',
}

const BUDGET_MAP = {
  '1만이하': '1만원 이하',
  '1~2만': '1~2만원',
  '법카': '제한 없음 (법인카드)',
}

const MOCK_DATA = {
  greeting: '평범한 하루, 그래도 고기는 먹어줘야죠 🥩',
  recommendation_reason:
    '30분 안에 혼자 빠르게 고기 한 끼 해결할 수 있는 곳 위주로 골랐어요. 1만원 이하라 점심특선 있는 곳 우선입니다.',
  picks: [
    {
      rank: 1,
      place_id: '56701241',
      name: '동탄 돼지국밥',
      category: '한식 > 국밥',
      reason: '혼밥하기 좋은 카운터석에 8천원 돼지국밥, 10분이면 나와요.',
      tip: '수육 추가는 3천원 — 오늘같은 날 강추예요.',
      walk_min: 3,
      mood_match_score: 91,
      place_url: 'http://place.map.kakao.com/56701241',
      blog_count: 1240,
      is_exemplary: true,
      lat: 37.2636,
      lng: 127.0632,
    },
    {
      rank: 2,
      place_id: '1227289113',
      name: '고기야 점심특선',
      category: '한식 > 고기',
      reason: '평일 점심 삼겹살 특선 9,900원. 1인 세트 있어서 혼밥도 부담 없어요.',
      tip: '12시 넘으면 웨이팅 있으니 11:50에 가세요.',
      walk_min: 5,
      mood_match_score: 83,
      place_url: 'http://place.map.kakao.com/1227289113',
      blog_count: 856,
      is_exemplary: false,
      lat: 37.2645,
      lng: 127.0641,
    },
    {
      rank: 3,
      place_id: '992975482',
      name: '김씨 순대국',
      category: '한식 > 국밥',
      reason: '8,000원 순대국, 30분 안에 여유있게 먹고 돌아올 수 있어요.',
      tip: null,
      walk_min: 4,
      mood_match_score: 74,
      place_url: 'http://place.map.kakao.com/992975482',
      blog_count: 312,
      is_exemplary: false,
      lat: 37.2628,
      lng: 127.0625,
    },
  ],
  weather_comment: null,
}

function buildBody(answers, lat, lng) {
  return {
    situation: answers.situation,
    mood: MOOD_MAP[answers.mood],
    food: answers.food ? [FOOD_MAP[answers.food] ?? answers.food] : [],
    time: TIME_MAP[answers.time],
    budget: BUDGET_MAP[answers.budget],
    lat,
    lng,
  }
}

function isReady(answers, lat, lng) {
  return (
    answers?.situation &&
    answers?.mood &&
    answers?.food != null &&
    answers?.time &&
    answers?.budget &&
    lat != null &&
    lng != null
  )
}

function resolveFunctionsUrl(raw) {
  if (!raw?.trim() || raw.includes('YOUR_PROJECT')) return null
  return resolveFunctionUrl('getRecommendation')
}

export default function useRecommend(answers, lat, lng) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fetchKey, setFetchKey] = useState(0)

  const retry = useCallback(() => {
    setFetchKey((k) => k + 1)
  }, [])

  useEffect(() => {
    if (!isReady(answers, lat, lng)) return

    let cancelled = false

    async function fetchRecommendation() {
      setLoading(true)
      setError(null)

      try {
        const endpoint = resolveFunctionsUrl(import.meta.env.VITE_FIREBASE_FUNCTIONS_URL)

        if (!endpoint) {
          if (!cancelled) setData(normalizeRecommendResponse(MOCK_DATA))
          return
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildBody(answers, lat, lng)),
        })

        if (!response.ok) {
          throw new Error(`추천 요청에 실패했어요. (${response.status})`)
        }

        const json = await response.json()
        if (!cancelled) setData(normalizeRecommendResponse(json))
      } catch (err) {
        if (!cancelled) {
          setError(err.message ?? '추천을 불러오지 못했어요.')
          setData(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchRecommendation()

    return () => {
      cancelled = true
    }
  }, [answers, lat, lng, fetchKey])

  return { data, loading, error, retry }
}
