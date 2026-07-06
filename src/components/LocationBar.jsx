import useLocation from '../hooks/useLocation'

export default function LocationBar({ compact = false }) {
  const {
    lat,
    lng,
    loading,
    isFallback,
    locationSource,
    savedOffice,
    saveCurrentAsOffice,
    useOfficeLocation,
    useGpsLocation,
    clearOfficeLocation,
    retry,
  } = useLocation()

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-400">
        📍 위치 확인 중...
      </div>
    )
  }

  const isOffice = locationSource === 'office'
  const coordText =
    lat != null && lng != null ? `(${lat.toFixed(4)}, ${lng.toFixed(4)})` : ''

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-primary">
            {isOffice ? '🏢 회사 위치' : isFallback ? '📍 mock 좌표' : '📍 현재 GPS'}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-gray-500">
            {isOffice && savedOffice?.label ? savedOffice.label : ''}
            {coordText}
            {isFallback && !isOffice && ' · GPS 실패'}
          </p>
        </div>
        {!compact && savedOffice && (
          <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent">
            저장됨
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {savedOffice && !isOffice && (
          <button
            type="button"
            onClick={useOfficeLocation}
            className="rounded-lg bg-primary px-2.5 py-1.5 text-[11px] text-white"
          >
            회사 위치 사용
          </button>
        )}
        {isOffice && (
          <button
            type="button"
            onClick={useGpsLocation}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] text-gray-600"
          >
            GPS 사용
          </button>
        )}
        {!isOffice && !isFallback && lat != null && (
          <button
            type="button"
            onClick={() => saveCurrentAsOffice()}
            className="rounded-lg border border-primary/30 px-2.5 py-1.5 text-[11px] text-primary"
          >
            여기를 회사로 저장
          </button>
        )}
        {isFallback && !isOffice && (
          <button
            type="button"
            onClick={retry}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] text-gray-600"
          >
            GPS 다시 시도
          </button>
        )}
        {savedOffice && (
          <button
            type="button"
            onClick={clearOfficeLocation}
            className="rounded-lg px-2 py-1.5 text-[11px] text-gray-400 underline"
          >
            회사 위치 삭제
          </button>
        )}
      </div>
    </div>
  )
}
