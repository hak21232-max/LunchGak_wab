import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuiz } from '../context/QuizContext'
import KakaoMap from '../components/KakaoMap'
import RestaurantCard from '../components/RestaurantCard'
import useLocation from '../hooks/useLocation'
import useRecommend from '../hooks/useRecommend'

function StatusBadge({ ok, label, detail }) {
  return (
    <div
      className={`rounded-xl px-3 py-2 text-xs ${
        ok ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-800'
      }`}
    >
      <p className="font-semibold">{label}</p>
      {detail && <p className="mt-0.5 opacity-80">{detail}</p>}
    </div>
  )
}

export default function Result() {
  const navigate = useNavigate()
  const { answers, resetAnswers } = useQuiz()
  const { lat, lng, loading: locLoading, isFallback, failReason, accuracy, retry: retryLocation } =
    useLocation()
  const { data, loading, error, retry } = useRecommend(answers, lat, lng)
  const [mapStatus, setMapStatus] = useState('loading')

  if (locLoading || loading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm items-center justify-center bg-bg px-6">
        <p className="text-sm text-gray-500">맛집 추천 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 bg-bg px-6">
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
      <div className="mx-auto flex min-h-screen max-w-sm flex-col bg-bg px-6 py-8">
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

  const gpsDetail = isFallback
    ? `${failReason} → mock 좌표(${lat?.toFixed(4)}, ${lng?.toFixed(4)}) 사용`
    : `GPS (${lat?.toFixed(4)}, ${lng?.toFixed(4)})${accuracy ? ` · ±${Math.round(accuracy)}m` : ''}`

  const mapOk = mapStatus === 'ready'
  const mapDetail =
    mapStatus === 'ready'
      ? '카카오맵 정상 로드'
      : mapStatus === 'no_key'
        ? 'VITE_KAKAO_JS_KEY 미설정'
        : mapStatus === 'timeout'
          ? 'SDK 로드 시간 초과 — dev 서버 재시작·광고차단 확인'
          : mapStatus === 'script_error'
            ? 'SDK 스크립트 차단 — 광고차단·확장 프로그램 확인'
          : mapStatus === 'domain_error'
          ? `카카오 콘솔 Web 도메인에 ${window.location.origin} 등록 필요`
          : mapStatus === 'init_error'
              ? '지도 초기화 실패 — JS키 타입·도메인 등록 확인'
              : mapStatus === 'error'
                ? 'SDK 로드 실패 — 카카오 개발자 콘솔에서 JS키·도메인 확인'
                : '로딩 중...'

  return (
    <div className="mx-auto min-h-screen max-w-sm bg-bg px-6 py-8">
      <div className="mb-4 flex flex-col gap-2">
        <StatusBadge
          ok={!isFallback}
          label={isFallback ? '📍 GPS: mock 좌표 사용 중' : '📍 GPS: 실제 위치 사용 중'}
          detail={gpsDetail}
        />
        <StatusBadge
          ok={mapOk}
          label={mapOk ? '🗺️ 카카오맵: 정상' : '🗺️ 카카오맵: 로드 실패'}
          detail={mapDetail}
        />
        {isFallback && (
          <button
            type="button"
            onClick={retryLocation}
            className="min-h-[44px] text-xs text-primary underline"
          >
            GPS 다시 시도
          </button>
        )}
      </div>

      <KakaoMap
        picks={data.picks}
        userLat={lat}
        userLng={lng}
        onStatusChange={setMapStatus}
      />

      <p className="text-lg font-bold text-primary">{data.greeting}</p>
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
