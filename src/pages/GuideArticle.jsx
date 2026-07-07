import { Link, Navigate, useParams } from 'react-router-dom'
import ContentPage, { ContentSection } from '../components/ContentPage'
import { getGuideBySlug } from '../content/guides'

export default function GuideArticle() {
  const { slug } = useParams()
  const guide = getGuideBySlug(slug)

  if (!guide) return <Navigate to="/guide" replace />

  return (
    <ContentPage
      title={guide.title}
      description={guide.summary}
      path={`/guide/${guide.slug}`}
      backTo="/guide"
    >
      <p className="text-xs text-gray-400">약 {guide.readMin}분 읽기 · 직장인 점심 가이드</p>
      <p className="font-medium text-gray-600">{guide.summary}</p>

      {guide.sections.map((section) => (
        <ContentSection key={section.heading} title={section.heading}>
          <p>{section.body}</p>
        </ContentSection>
      ))}

      <section className="mt-8 rounded-xl bg-primary/5 p-4">
        <p className="text-sm font-semibold text-primary">직접 추천받아 보세요</p>
        <p className="mt-1 text-xs text-gray-600">
          가이드에서 읽은 기준을 런치각 6문답에 반영하면, 근처 맛집 3곳을 바로 추천해 드립니다.
        </p>
        <Link
          to="/quiz"
          className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-sm text-white"
        >
          🍽️ 지금 추천받기
        </Link>
      </section>
    </ContentPage>
  )
}
