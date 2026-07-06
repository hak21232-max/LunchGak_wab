import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuiz } from '../context/QuizContext'
import KakaoMap from '../components/KakaoMap'
import LocationSummary from '../components/LocationSummary'
import RestaurantCard from '../components/RestaurantCard'
import useLocation from '../hooks/useLocation'
import useRecommend from '../hooks/useRecommend'
import { usePageMeta } from '../hooks/usePageMeta'
import { shareToKakaoTalk } from '../utils/kakaoShare'
import { shareRecommendResult } from '../utils/shareResult'

export default function Result() {
  const navigate = useNavigate()
  const { answers, resetAnswers } = useQuiz()
  const { lat, lng, loading: locLoading } = useLocation()
  const { data, loading, error, retry } = useRecommend(answers, lat, lng)
  const [shareMsg, setShareMsg] = useState(null)

  usePageMeta({
    title: '추천 결과',
    description: '런치각 맛집 추천 결과',
    path: '/result',
    noindex: true,
  })

  async function handleShare() {
    if (!data) return
    const result = await shareRecommendResult(data)
    if (result.method === 'share') {
      setShareMsg('공유했어요!')
    } else if (result.method === 'clipboard') {
      setShareMsg('클립보드에 복사했어요. 팀 채팅에 붙여넣기 하세요.')
    } else if (result.method !== 'cancel') {
      setShareMsg('공유에 실패했어요. 다시 시도해 주세요.')
    }
    if (result.ok) setTimeout(() => setShareMsg(null), 3000)
  }

  async function handleKakaoShare() {
    if (!data) return
    try {
      await shareToKakaoTalk(data)
      setShareMsg('카카오톡 공유 창을 열었어요!')
      setTimeout(() => setShareMsg(null), 3000)
    } catch (err) {
      if (err?.message === 'NO_KEY') {
        setShareMsg('카카오 공유 설정이 필요해요. (VITE_KAKAO_JS_KEY)')
      } else {
        setShareMsg('카카오톡 공유에 실패했어요. 다시 시도해 주세요.')
      }
      setTimeout(() => setShareMsg(null), 4000)
    }
  }

  if (locLoading || loading) {
    return (
      <div className="bg-bg px-6 py-8">
        <LocationSummary />
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-gray-500">맛집 추천 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-bg px-6 py-8">
        <LocationSummary />
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <p className="text-center text-sm text-gray-600">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="min-h-[44px] rounded-xl bg-primary px-6 py-3 text-white"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  if (data.nearby_no_match || data.picks.length === 0) {
    return (
      <div className="bg-bg px-6 py-8">
        <LocationSummary />
        <p className="mt-4 text-lg font-bold text-primary">{data.greeting}</p>
        <p className="mt-2 text-sm text-gray-500">{data.recommendation_reason}</p>
        {data.weather_comment && (
          <p className="mt-3 text-xs text-gray-400">{data.weather_comment}</p>
        )}
        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              resetAnswers()
              navigate('/quiz')
            }}
            className="min-h-[44px] rounded-xl bg-primary px-6 py-3 text-white"
          >
            다른 메뉴로 다시 고르기
          </button>
          <button
            type="button"
            onClick={retry}
            className="min-h-[44px] rounded-xl border border-gray-200 py-3 text-gray-600"
          >
            같은 조건으로 다시 검색
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-bg px-6 py-8">
      <LocationSummary />

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleShare}
          className="min-h-[40px] flex-1 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          📤 공유하기
        </button>
        <button
          type="button"
          onClick={handleKakaoShare}
          className="min-h-[40px] flex-1 rounded-xl bg-[#FEE500] px-4 py-2 text-sm font-medium text-[#191919]"
        >
          💬 카카오톡
        </button>
      </div>
      {shareMsg && (
        <p className="mt-2 text-center text-xs text-primary">{shareMsg}</p>
      )}

      <KakaoMap picks={data.picks} userLat={lat} userLng={lng} />

      <p className="mt-4 text-lg font-bold text-primary">{data.greeting}</p>
      <p className="mt-2 text-sm text-gray-500">{data.recommendation_reason}</p>

      <div className="mt-6 flex flex-col gap-4">
        {data.picks.map((pick) => (
          <RestaurantCard key={pick.place_id} pick={pick} userLat={lat} userLng={lng} />
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          resetAnswers()
          navigate('/quiz')
        }}
        className="mt-8 min-h-[44px] w-full rounded-xl border border-gray-200 py-3 text-gray-600"
      >
        ← 다시 추천받기
      </button>
    </div>
  )
}
