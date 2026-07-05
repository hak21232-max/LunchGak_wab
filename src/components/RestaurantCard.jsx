function openKakaoPlace(url) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

export default function RestaurantCard({ pick }) {
  const blogCount = pick.blog_count ?? 0
  const mapUrl = pick.place_url

  return (
    <div className="rounded-2xl border border-gray-200 p-4">
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
              onClick={() => openKakaoPlace(mapUrl)}
              className="truncate text-right font-medium text-primary underline"
            >
              상세페이지 →
            </button>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </li>
      </ul>

      {pick.reason && (
        <p className="mt-3 text-sm leading-relaxed text-gray-600">{pick.reason}</p>
      )}
      {pick.tip && (
        <p className="mt-1.5 text-xs text-gray-400">💡 {pick.tip}</p>
      )}
    </div>
  )
}
