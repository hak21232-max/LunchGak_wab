import { useNavigate } from 'react-router-dom'
import { useQuiz } from '../context/QuizContext'
import KakaoMap from '../components/KakaoMap'
import RestaurantCard from '../components/RestaurantCard'
import useLocation from '../hooks/useLocation'
import useRecommend from '../hooks/useRecommend'

import { usePageMeta } from '../hooks/usePageMeta'

export default function Result() {
  const navigate = useNavigate()
  const { answers, resetAnswers } = useQuiz()
  const { lat, lng, loading: locLoading } = useLocation()
  const { data, loading, error, retry } = useRecommend(answers, lat, lng)
  usePageMeta({ title: '추천 결과', description: '런치각 맛집 추천 결과', path: '/result', noindex: true })

  if (locLoading || loading) {
    return (
      <div className="mx-auto flex items-center justify-center bg-bg px-6 py-16">
        <p className="text-sm text-gray-500">맛집 추천 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto flex flex-col items-center justify-center gap-4 bg-bg px-6 py-16">
        <p className="text-center text-sm text-gray-600">{error}</p>
        <button
          type="button"
          onClick={retry}
          className="min-h-[44px] rounded-xl bg-primary px-6 py-3 text-white"
        >
          다시 시도
        </button>
      </div>
    )
  }

  if (!data) return null

  if (data.nearby_no_match || data.picks.length === 0) {
    return (
      <div className="bg-bg px-6 py-8">
        <p className="text-lg font-bold text-primary">{data.greeting}</p>
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
      <KakaoMap picks={data.picks} userLat={lat} userLng={lng} />

      <p className="mt-4 text-lg font-bold text-primary">{data.greeting}</p>
      <p className="mt-2 text-sm text-gray-500">{data.recommendation_reason}</p>

      <div className="mt-6 flex flex-col gap-4">
        {data.picks.map((pick) => (
          <RestaurantCard key={pick.place_id} pick={pick} />
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
