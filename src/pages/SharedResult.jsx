import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import KakaoMap from '../components/KakaoMap'
import RestaurantCard from '../components/RestaurantCard'
import { usePageMeta } from '../hooks/usePageMeta'
import { normalizeRecommendResponse } from '../utils/normalizePick'
import { resolveSharedResult } from '../utils/shareResult'

export default function SharedResult() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const encoded = searchParams.get('d')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  usePageMeta({
    title: data?.greeting ?? '공유된 추천',
    description: data?.recommendation_reason ?? '런치각 맛집 추천 결과',
    path: id ? `/share/${id}` : '/share',
    noindex: true,
  })

  useEffect(() => {
    if (!id && !encoded) {
      setError('공유 링크가 올바르지 않아요.')
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const json = await resolveSharedResult(id, encoded)
        if (!cancelled) setData(normalizeRecommendResponse(json))
      } catch (err) {
        if (!cancelled) {
          setError(err.message ?? '공유 결과를 불러오지 못했어요.')
          setData(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id, encoded])

  if (loading) {
    return (
      <div className="bg-bg px-6 py-8">
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-gray-500">공유된 추천 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-bg px-6 py-8">
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-sm text-gray-600">{error ?? '공유 결과를 찾을 수 없어요.'}</p>
          <Link to="/location" className="min-h-[44px] rounded-xl bg-primary px-6 py-3 text-white">
            나도 추천 받기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-bg px-6 py-8">
      <p className="text-center text-[11px] text-gray-400">친구가 공유한 런치각 추천</p>

      <KakaoMap picks={data.picks} userLat={data.lat} userLng={data.lng} />

      <p className="mt-4 text-lg font-bold text-primary">{data.greeting}</p>
      <p className="mt-2 text-sm text-gray-500">{data.recommendation_reason}</p>
      {data.weather_comment && (
        <p className="mt-2 text-xs text-gray-400">🌤 {data.weather_comment}</p>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {data.picks.map((pick) => (
          <RestaurantCard
            key={pick.place_id}
            pick={pick}
            userLat={data.lat}
            userLng={data.lng}
          />
        ))}
      </div>

      <Link
        to="/location"
        className="mt-8 flex min-h-[44px] w-full items-center justify-center rounded-xl bg-accent py-3 text-white"
      >
        나도 추천 받기 →
      </Link>
    </div>
  )
}
