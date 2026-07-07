import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuiz } from '../context/QuizContext'
import KakaoMap from '../components/KakaoMap'
import LocationSummary from '../components/LocationSummary'
import RestaurantCard from '../components/RestaurantCard'
import useLocation from '../hooks/useLocation'
import useRecommend from '../hooks/useRecommend'
import useExcludedRestaurants from '../hooks/useExcludedRestaurants'
import { usePageMeta } from '../hooks/usePageMeta'
import { shareRecommendResult } from '../utils/shareResult'
import {
  addExcludedRestaurant,
  isPlaceExcluded,
  pickToExcludedEntry,
} from '../utils/excludedRestaurants'

export default function Result() {
  const navigate = useNavigate()
  const { answers, resetAnswers } = useQuiz()
  const { lat, lng, loading: locLoading } = useLocation()
  const { data, loading, error, retry, recommendAgain } = useRecommend(answers, lat, lng)
  const { count: excludedCount } = useExcludedRestaurants()
  const [shareMsg, setShareMsg] = useState(null)
  const [sharing, setSharing] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [excludeMsg, setExcludeMsg] = useState(null)

  usePageMeta({
    title: '추천 결과',
    description: '런치각 맛집 추천 결과',
    path: '/result',
    noindex: true,
  })

  async function handleShare() {
    if (!data || sharing) return
    setSharing(true)
    try {
      const result = await shareRecommendResult(data, { lat, lng })
      if (result.method === 'share') {
        setShareMsg('공유했어요!')
      } else if (result.method === 'clipboard') {
        setShareMsg('클립보드에 복사했어요. 팀 채팅에 붙여넣기 하세요.')
      } else if (result.method !== 'cancel') {
        setShareMsg('공유에 실패했어요. 다시 시도해 주세요.')
      }
      if (result.ok) setTimeout(() => setShareMsg(null), 3000)
    } catch {
      setShareMsg('공유 링크를 만들지 못했어요. 다시 시도해 주세요.')
      setTimeout(() => setShareMsg(null), 4000)
    } finally {
      setSharing(false)
    }
  }

  function handleAddExcluded() {
    if (!selectedId || !data) return
    const pick = data.picks.find((p) => String(p.place_id) === String(selectedId))
    if (!pick) return

    const result = addExcludedRestaurant(pickToExcludedEntry(pick))
    if (result.ok) {
      setExcludeMsg(`"${pick.name}"을(를) 제외식당에 추가했어요.`)
      setSelectedId(null)
      retry()
    } else if (result.reason === 'duplicate') {
      setExcludeMsg('이미 제외 목록에 있는 식당이에요.')
    }
    setTimeout(() => setExcludeMsg(null), 3000)
  }

  function handleRecommendAgain() {
    if (!data?.picks?.length || loading) return
    setSelectedId(null)
    recommendAgain(data.picks.map((p) => p.place_id))
  }

  if (locLoading || loading) {
    return (
      <div className="bg-bg px-6 py-8">
        <LocationSummary />
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-gray-500">
            {data ? '다른 맛집 찾는 중…' : '맛집 추천 중…'}
          </p>
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
          disabled={sharing}
          className="min-h-[44px] flex-1 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {sharing ? '공유 준비 중…' : '📤 결과 공유하기'}
        </button>
        <Link
          to="/excluded"
          className="flex min-h-[44px] shrink-0 items-center justify-center rounded-xl border border-gray-200 px-3 text-xs font-medium text-gray-600"
        >
          🚫 제외 {excludedCount > 0 ? `(${excludedCount})` : ''}
        </Link>
      </div>
      {shareMsg && (
        <p className="mt-2 text-center text-xs text-primary">{shareMsg}</p>
      )}

      <KakaoMap picks={data.picks} userLat={lat} userLng={lng} />

      <p className="mt-4 text-lg font-bold text-primary">{data.greeting}</p>
      <p className="mt-2 text-sm text-gray-500">{data.recommendation_reason}</p>

      <div className="mt-6 flex flex-col gap-4">
        {data.picks.map((pick) => {
          const id = String(pick.place_id)
          return (
            <RestaurantCard
              key={id}
              pick={pick}
              userLat={lat}
              userLng={lng}
              selectable
              selected={selectedId === id}
              onSelect={() => setSelectedId((prev) => (prev === id ? null : id))}
              isExcluded={isPlaceExcluded(id)}
            />
          )
        })}
      </div>

      <button
        type="button"
        onClick={handleAddExcluded}
        disabled={!selectedId || isPlaceExcluded(selectedId)}
        className="mt-4 min-h-[44px] w-full rounded-xl border-2 border-primary py-3 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
      >
        {selectedId ? '🚫 선택한 식당 제외식당 추가' : '카드를 선택한 뒤 제외식당 추가'}
      </button>
      {excludeMsg && (
        <p className="mt-2 text-center text-xs text-primary">{excludeMsg}</p>
      )}

      <button
        type="button"
        onClick={handleRecommendAgain}
        disabled={loading}
        className="mt-3 min-h-[44px] w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        🔄 다른 곳 재추천 (현재 {data.picks.length}곳 제외)
      </button>

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
