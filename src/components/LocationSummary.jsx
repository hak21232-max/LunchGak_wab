import { Link } from 'react-router-dom'
import useLocation from '../hooks/useLocation'

/** 퀴즈/결과 화면용 — 위치 요약 + 변경 링크 */
export default function LocationSummary() {
  const { lat, lng, loading, isFallback, locationSource, savedOffice } = useLocation()

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-400">
        📍 위치 확인 중...
      </div>
    )
  }

  const isOffice = locationSource === 'office'
  const label = isOffice
    ? `🏢 ${savedOffice?.label ?? '회사'}`
    : isFallback
      ? '📍 mock 좌표'
      : '📍 현재 GPS'
  const coord =
    lat != null && lng != null ? `(${lat.toFixed(4)}, ${lng.toFixed(4)})` : ''

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-primary">{label}</p>
        <p className="truncate text-[11px] text-gray-500">{coord}</p>
      </div>
      <Link to="/location" className="shrink-0 text-[11px] text-accent underline">
        변경
      </Link>
    </div>
  )
}
