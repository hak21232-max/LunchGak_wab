import { useState } from 'react'
import { Link } from 'react-router-dom'
import useExcludedRestaurants from '../hooks/useExcludedRestaurants'
import { usePageMeta } from '../hooks/usePageMeta'

export default function ExcludedRestaurants() {
  const { list, count, removeByIds } = useExcludedRestaurants()
  const [selected, setSelected] = useState(new Set())
  const [msg, setMsg] = useState(null)

  usePageMeta({
    title: '내 제외식당',
    description: '런치각 추천에서 제외한 식당 목록을 관리합니다.',
    path: '/excluded',
    noindex: true,
  })

  function toggleOne(placeId) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(placeId)) next.delete(placeId)
      else next.add(placeId)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === list.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(list.map((item) => String(item.place_id))))
    }
  }

  function handleRemove() {
    const ids = [...selected]
    if (ids.length === 0) return
    removeByIds(ids)
    setSelected(new Set())
    setMsg(`${ids.length}곳 제외 해제했어요.`)
    setTimeout(() => setMsg(null), 2500)
  }

  return (
    <div className="px-6 py-8">
      <h1 className="text-2xl font-bold text-primary">내 제외식당</h1>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">
        여기 등록된 식당은 추천 결과에 나오지 않습니다. 이 기기의 브라우저에만 저장됩니다.
      </p>

      {count === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center">
          <p className="text-sm text-gray-500">제외한 식당이 없어요.</p>
          <p className="mt-1 text-xs text-gray-400">
            추천 결과에서 카드를 선택하고 &quot;제외식당 추가&quot;를 눌러 보세요.
          </p>
          <Link
            to="/"
            className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm text-white"
          >
            추천받기
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">총 {count}곳</p>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs text-primary underline"
            >
              {selected.size === list.length ? '전체 해제' : '전체 선택'}
            </button>
          </div>

          <ul className="mt-3 flex flex-col gap-2">
            {list.map((item) => {
              const id = String(item.place_id)
              const checked = selected.has(id)
              return (
                <li key={id}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                      checked ? 'border-accent bg-accent/5' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOne(id)}
                      className="mt-1 h-4 w-4 accent-primary"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-gray-800">{item.name}</span>
                      {item.category && (
                        <span className="mt-0.5 block text-xs text-gray-400">{item.category}</span>
                      )}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>

          <button
            type="button"
            onClick={handleRemove}
            disabled={selected.size === 0}
            className="mt-6 min-h-[44px] w-full rounded-xl border border-gray-300 py-3 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            선택한 식당 제외 해제 ({selected.size})
          </button>
        </>
      )}

      {msg && <p className="mt-3 text-center text-xs text-primary">{msg}</p>}

      <Link
        to="/"
        className="mt-8 block text-center text-sm text-gray-500 underline"
      >
        ← 홈으로
      </Link>
    </div>
  )
}
