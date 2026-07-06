import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import OfficeMapPicker from '../components/OfficeMapPicker'
import useLocation from '../hooks/useLocation'
import { usePageMeta } from '../hooks/usePageMeta'

export default function LocationSelect() {
  const navigate = useNavigate()
  const {
    lat,
    lng,
    loading,
    isFallback,
    failReason,
    accuracy,
    locationSource,
    savedOffice,
    setOfficeFromMap,
    useGpsLocation,
    clearOfficeLocation,
    retry,
  } = useLocation()

  const [mode, setMode] = useState(() => (savedOffice ? 'office' : 'gps'))
  const [officeDraft, setOfficeDraft] = useState(() =>
    savedOffice
      ? { lat: savedOffice.lat, lng: savedOffice.lng }
      : { lat: null, lng: null },
  )

  usePageMeta({
    title: '위치 선택',
    description: '현재 GPS 또는 카카오맵에서 회사 위치를 지정하고 맛집 추천을 받으세요.',
    path: '/location',
  })

  useEffect(() => {
    if (mode === 'gps') {
      return useGpsLocation()
    }

    const officeLat = officeDraft.lat ?? savedOffice?.lat
    const officeLng = officeDraft.lng ?? savedOffice?.lng
    if (officeLat != null && officeLng != null) {
      if (lat == null || lng == null || locationSource !== 'office') {
        setOfficeFromMap(officeLat, officeLng)
      }
      if (officeDraft.lat == null || officeDraft.lng == null) {
        setOfficeDraft({ lat: officeLat, lng: officeLng })
      }
    }
  }, [
    mode,
    savedOffice,
    officeDraft.lat,
    officeDraft.lng,
    lat,
    lng,
    locationSource,
    setOfficeFromMap,
    useGpsLocation,
  ])

  function handleOfficePick(pickLat, pickLng) {
    setOfficeDraft({ lat: pickLat, lng: pickLng })
    setOfficeFromMap(pickLat, pickLng)
  }

  function handleModeChange(next) {
    setMode(next)
    if (next === 'office' && savedOffice) {
      setOfficeDraft({ lat: savedOffice.lat, lng: savedOffice.lng })
      setOfficeFromMap(savedOffice.lat, savedOffice.lng)
    }
  }

  const canProceed =
    mode === 'gps'
      ? !loading && lat != null && lng != null
      : officeDraft.lat != null && officeDraft.lng != null

  function handleStartQuiz() {
    if (!canProceed) return

    flushSync(() => {
      if (mode === 'office' && officeDraft.lat != null && officeDraft.lng != null) {
        setOfficeFromMap(officeDraft.lat, officeDraft.lng)
      } else if (mode === 'gps') {
        useGpsLocation()
      }
    })

    navigate('/quiz')
  }

  const gpsLabel =
    loading && mode === 'gps'
      ? 'GPS 확인 중...'
      : isFallback
        ? `mock 좌표 (${lat?.toFixed(4)}, ${lng?.toFixed(4)})`
        : lat != null
          ? `(${lat.toFixed(4)}, ${lng.toFixed(4)})${accuracy ? ` · ±${Math.round(accuracy)}m` : ''}`
          : '위치 없음'

  return (
    <div className="px-6 py-8">
      <h1 className="text-xl font-bold text-primary">어디 기준으로 찾을까요?</h1>
      <p className="mt-1 text-sm text-gray-500">문답 전에 추천 기준 위치를 선택해 주세요.</p>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => handleModeChange('gps')}
          className={`min-h-[44px] flex-1 rounded-xl py-3 text-sm font-medium ${
            mode === 'gps'
              ? 'bg-primary text-white'
              : 'border border-gray-200 text-gray-600'
          }`}
        >
          📍 현재 위치
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('office')}
          className={`min-h-[44px] flex-1 rounded-xl py-3 text-sm font-medium ${
            mode === 'office'
              ? 'bg-primary text-white'
              : 'border border-gray-200 text-gray-600'
          }`}
        >
          🏢 회사 위치
        </button>
      </div>

      {mode === 'gps' && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold text-gray-800">현재 GPS 사용</p>
          <p className="mt-2 text-xs text-gray-500">{gpsLabel}</p>
          {isFallback && failReason && (
            <p className="mt-1 text-xs text-amber-600">{failReason}</p>
          )}
          <button
            type="button"
            onClick={retry}
            disabled={loading}
            className="mt-3 text-xs text-primary underline disabled:opacity-40"
          >
            GPS 다시 시도
          </button>
        </div>
      )}

      {mode === 'office' && (
        <div className="mt-6 space-y-3">
          <OfficeMapPicker
            key={savedOffice ? `office-${savedOffice.lat}-${savedOffice.lng}` : 'office-new'}
            lat={officeDraft.lat ?? savedOffice?.lat}
            lng={officeDraft.lng ?? savedOffice?.lng}
            onPick={handleOfficePick}
          />
          {officeDraft.lat != null && (
            <p className="text-center text-xs text-gray-500">
              회사 위치: ({officeDraft.lat.toFixed(4)}, {officeDraft.lng.toFixed(4)})
            </p>
          )}
          {savedOffice && (
            <button
              type="button"
              onClick={() => {
                clearOfficeLocation()
                setOfficeDraft({ lat: null, lng: null })
                setMode('gps')
              }}
              className="block w-full text-center text-xs text-gray-400 underline"
            >
              저장된 회사 위치 삭제
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleStartQuiz}
        disabled={!canProceed}
        className="mt-8 min-h-[48px] w-full rounded-xl bg-accent py-3 text-base font-semibold text-white disabled:opacity-40"
      >
        문답 시작 →
      </button>

      {(mode === 'office' || (locationSource && lat != null)) && (
        <p className="mt-3 text-center text-[11px] text-gray-400">
          선택됨: {mode === 'office' ? '회사 위치' : '현재 GPS'}
          {mode === 'office' && officeDraft.lat != null && (
            <span>
              {' '}
              ({officeDraft.lat.toFixed(4)}, {officeDraft.lng.toFixed(4)})
            </span>
          )}
        </p>
      )}
    </div>
  )
}
