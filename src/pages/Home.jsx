import { Link, useNavigate } from 'react-router-dom'
import { useQuiz } from '../context/QuizContext'
import useExcludedRestaurants from '../hooks/useExcludedRestaurants'
import { usePageMeta, DEFAULT_DESC } from '../hooks/usePageMeta'
import { GUIDES } from '../content/guides'

export default function Home() {
  const navigate = useNavigate()
  const { resetAnswers } = useQuiz()
  const { count: excludedCount } = useExcludedRestaurants()
  usePageMeta({ title: null, description: DEFAULT_DESC, path: '/' })

  function handleStart() {
    resetAnswers()
    navigate('/location')
  }

  const featuredGuides = GUIDES.slice(0, 3)

  return (
    <div className="px-6 py-8">
      <section className="text-center">
        <h1 className="text-4xl font-bold text-primary">런치각</h1>
        <p className="text-sm tracking-widest text-accent">LunchGAK</p>
        <p className="mt-3 text-base leading-relaxed text-gray-600">
          직장인 점심·회식, 6가지 질문으로 끝.
          <br />
          GPS·날씨·블로그 후기까지 반영해 근처 맛집 3곳을 추천합니다.
        </p>
        <button
          type="button"
          onClick={handleStart}
          className="mt-8 min-h-[44px] rounded-2xl bg-primary px-10 py-4 text-lg text-white transition-colors hover:bg-accent"
        >
          🍽️ 지금 추천받기
        </button>
        <Link
          to="/excluded"
          className="mt-3 inline-block text-sm text-gray-500 underline"
        >
          🚫 내 제외식당{excludedCount > 0 ? ` (${excludedCount})` : ''}
        </Link>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-bold text-gray-800">이렇게 작동해요</h2>
        <ol className="mt-4 space-y-4 text-sm text-gray-600">
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              1
            </span>
            <span>
              <strong className="text-gray-800">6가지 질문</strong> — 점심/저녁, 자리, 기분,
              음식, 거리, 예산을 선택합니다.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              2
            </span>
            <span>
              <strong className="text-gray-800">근처 식당 검색</strong> — 카카오맵·블로그 후기로
              메뉴를 검증합니다.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              3
            </span>
            <span>
              <strong className="text-gray-800">AI 3곳 추천</strong> — 지도·도보 거리·이유와 함께
              결과를 보여줍니다.
            </span>
          </li>
        </ol>
        <Link to="/guide/how-it-works" className="mt-3 inline-block text-xs text-primary underline">
          자세한 설명 보기 →
        </Link>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-bold text-gray-800">점심 가이드</h2>
        <p className="mt-1 text-xs text-gray-500">직장인을 위한 무료 콘텐츠</p>
        <ul className="mt-4 space-y-3">
          {featuredGuides.map((g) => (
            <li key={g.slug}>
              <Link
                to={`/guide/${g.slug}`}
                className="block rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm hover:border-accent"
              >
                {g.title}
              </Link>
            </li>
          ))}
        </ul>
        <Link to="/guide" className="mt-3 inline-block text-xs text-primary underline">
          전체 가이드 보기 →
        </Link>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-bold text-gray-800">자주 묻는 질문</h2>
        <dl className="mt-4 space-y-4 text-sm">
          <div>
            <dt className="font-semibold text-gray-800">무료인가요?</dt>
            <dd className="mt-1 text-gray-600">네, 맛집 추천과 가이드 콘텐츠는 무료입니다.</dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-800">위치 정보가 필요한가요?</dt>
            <dd className="mt-1 text-gray-600">
              근처 식당 추천을 위해 GPS 허용을 권장합니다. 위치는 추천 처리에만 사용됩니다.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-800">거리는 어떻게 정하나요?</dt>
            <dd className="mt-1 text-gray-600">
              도보 4분(300m), 8분(600m), 13분(1km) 중에서 고릅니다. 가까울수록 후보가
              정확하고, 멀수록 선택지가 넓어집니다.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-800">추천이 항상 정확한가요?</dt>
            <dd className="mt-1 text-gray-600">
              AI·공개 데이터 기반 참고 정보입니다. 방문 전 영업 시간·메뉴를 직접 확인해 주세요.
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs text-gray-500">
        <span>📍 GPS 자동감지</span>
        <span>🌤️ 날씨 반영</span>
        <span>📝 블로그 검증</span>
      </div>
    </div>
  )
}
