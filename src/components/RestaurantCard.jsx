import { getPickComment, shouldShowTip } from '../utils/pickReason'
import { kakaoRouteUrl, naverWalkRouteUrl, openExternal } from '../utils/mapLinks'

function openKakaoPlace(url) {
  openExternal(url)
}

function hasCoords(pick) {
  return Number.isFinite(Number(pick.lat)) && Number.isFinite(Number(pick.lng))
}

function hasKakaoRoute(pick) {
  return hasCoords(pick) || /^\d+$/.test(String(pick.place_id ?? ''))
}

export default function RestaurantCard({
  pick,
  userLat,
  userLng,
  selectable = false,
  selected = false,
  onSelect,
  isExcluded = false,
}) {
  const blogCount = pick.blog_count ?? 0
  const mapUrl = pick.place_url
  const comment = getPickComment(pick)
  const showTip = shouldShowTip(pick, comment)
  const canNavigate = hasCoords(pick)
  const canKakaoRoute = hasKakaoRoute(pick)

  function handleKakaoRoute() {
    openExternal(
      kakaoRouteUrl(userLat, userLng, pick.name, pick.lat, pick.lng, pick.place_id),
    )
  }

  function handleNaverRoute() {
    openExternal(naverWalkRouteUrl(userLat, userLng, pick.name, pick.lat, pick.lng))
  }

  return (
    <div
      role={selectable ? 'button' : undefined}
      tabIndex={selectable ? 0 : undefined}
      onClick={selectable ? onSelect : undefined}
      onKeyDown={
        selectable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect?.()
              }
            }
          : undefined
      }
      className={`rounded-2xl border p-4 transition-colors ${
        selected
          ? 'border-accent bg-accent/5 ring-2 ring-accent/30'
          : 'border-gray-200'
      } ${selectable ? 'cursor-pointer hover:border-accent/50' : ''}`}
    >
      {selectable && (
        <p className="mb-2 text-[11px] font-medium text-gray-500">
          {selected ? '✓ 선택됨 — 아래 버튼으로 제외 추가' : '탭해서 선택'}
        </p>
      )}
      {isExcluded && (
        <span className="mb-2 inline-block rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
          제외 목록에 있음
        </span>
      )}
      <p className="text-xs font-medium text-accent">{pick.rank}위</p>

      <div className="mt-1 flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold text-gray-800">{pick.name}</h3>
        {pick.is_exemplary && (
          <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
            ✓ 모범음식점
          </span>
        )}
      </div>

      <p className="mt-1 text-xs text-gray-400">{pick.category}</p>

      <ul className="mt-3 space-y-1.5 border-t border-gray-100 pt-3 text-xs text-gray-600">
        <li className="flex justify-between gap-4">
          <span className="text-gray-400">블로그</span>
          <span className="font-medium">{blogCount.toLocaleString()}건</span>
        </li>
        <li className="flex justify-between gap-4">
          <span className="text-gray-400">거리</span>
          <span className="font-medium">도보 {pick.walk_min}분</span>
        </li>
        <li className="flex justify-between gap-4">
          <span className="shrink-0 text-gray-400">카카오맵</span>
          {mapUrl ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                openKakaoPlace(mapUrl)
              }}
              className="truncate text-right font-medium text-primary underline"
            >
              상세페이지 →
            </button>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </li>
      </ul>

      {canKakaoRoute && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleKakaoRoute()
            }}
            className="min-h-[36px] flex-1 rounded-lg bg-primary py-2 text-xs font-medium text-white"
          >
            🚶 카카오 길찾기
          </button>
          {canNavigate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleNaverRoute()
              }}
              className="min-h-[36px] flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-700"
            >
              네이버 길찾기
            </button>
          )}
        </div>
      )}

      <div className="mt-3 rounded-xl bg-primary/5 px-3 py-2.5">
        <p className="text-xs font-medium text-primary/70">각이의 한마디</p>
        <p className="mt-1 text-sm leading-relaxed text-gray-700">
          {comment ?? '이 식당을 오늘 조건에 맞게 골랐어요.'}
        </p>
      </div>

      {showTip && (
        <p className="mt-1.5 text-xs text-gray-400">💡 {pick.tip}</p>
      )}
    </div>
  )
}
