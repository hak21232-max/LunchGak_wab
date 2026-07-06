import { Link } from 'react-router-dom'
import { usePageMeta } from '../hooks/usePageMeta'
import { GUIDES } from '../content/guides'

export default function GuideIndex() {
  usePageMeta({
    title: '점심 가이드',
    description:
      '직장인 점심·회식·혼밥·가성비 식당 선택 팁. 런치각이 제공하는 무료 점심 가이드 모음.',
    path: '/guide',
  })

  return (
    <div className="px-6 py-8">
      <h1 className="text-2xl font-bold text-primary">점심 가이드</h1>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">
        직장인 점심·회식을 위한 실용 정보입니다. 검색만을 위한 글이 아니라, 실제로
        식당을 고를 때 참고할 수 있도록 작성했습니다.
      </p>

      <ul className="mt-8 flex flex-col gap-4">
        {GUIDES.map((guide) => (
          <li key={guide.slug}>
            <Link
              to={`/guide/${guide.slug}`}
              className="block rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
            >
              <h2 className="font-semibold text-gray-800">{guide.title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">{guide.summary}</p>
              <p className="mt-2 text-[11px] text-accent">약 {guide.readMin}분 읽기 →</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
