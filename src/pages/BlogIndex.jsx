import { Link, useSearchParams } from 'react-router-dom'
import { usePageMeta } from '../hooks/usePageMeta'
import { BLOG_TOTAL, generateBlogPage } from '../content/blogReviews'

function StarRating({ rating }) {
  return (
    <span className="text-xs text-accent">
      ★ {rating.toFixed(1)}
    </span>
  )
}

function Pagination({ page, totalPages }) {
  const windowSize = 5
  let start = Math.max(1, page - Math.floor(windowSize / 2))
  let end = Math.min(totalPages, start + windowSize - 1)
  start = Math.max(1, end - windowSize + 1)

  const pages = []
  for (let i = start; i <= end; i++) pages.push(i)

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-1" aria-label="페이지">
      {page > 1 && (
        <Link
          to={`/blog?page=${page - 1}`}
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:border-primary"
        >
          ← 이전
        </Link>
      )}
      {start > 1 && (
        <>
          <Link to="/blog?page=1" className="rounded-lg px-2 py-2 text-xs text-gray-500">
            1
          </Link>
          {start > 2 && <span className="text-xs text-gray-300">…</span>}
        </>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          to={`/blog?page=${p}`}
          className={`min-w-[36px] rounded-lg px-2 py-2 text-center text-xs ${
            p === page
              ? 'bg-primary font-semibold text-white'
              : 'border border-gray-200 text-gray-600 hover:border-primary'
          }`}
        >
          {p}
        </Link>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="text-xs text-gray-300">…</span>}
          <Link
            to={`/blog?page=${totalPages}`}
            className="rounded-lg px-2 py-2 text-xs text-gray-500"
          >
            {totalPages}
          </Link>
        </>
      )}
      {page < totalPages && (
        <Link
          to={`/blog?page=${page + 1}`}
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:border-primary"
        >
          다음 →
        </Link>
      )}
    </nav>
  )
}

export default function BlogIndex() {
  const [params] = useSearchParams()
  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1)
  const { posts, totalPages, total } = generateBlogPage(page)

  usePageMeta({
    title: page > 1 ? `맛집 리뷰 블로그 (${page}페이지)` : '맛집 리뷰 블로그',
    description: `서울·직장인 점심 맛집 리뷰 ${total.toLocaleString()}편. 혼밥·팀점심·가성비 식당 후기 모음.`,
    path: page > 1 ? `/blog?page=${page}` : '/blog',
  })

  return (
    <div className="px-6 py-8">
      <h1 className="text-2xl font-bold text-primary">맛집 리뷰 블로그</h1>
      <p className="mt-2 text-sm text-gray-500">
        서울 직장인 점심·회식 맛집 후기 {total.toLocaleString()}편
        {page > 1 && ` · ${page}/${totalPages}페이지`}
      </p>

      <ul className="mt-8 flex flex-col gap-6">
        {posts.map((post) => (
          <li key={post.id}>
            <Link
              to={`/blog/${post.slug}`}
              className="group block overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md"
            >
              <img
                src={post.imageUrl}
                alt={`${post.district} ${post.category} 맛집`}
                className="h-44 w-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="p-4">
                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                  <span>{post.date}</span>
                  <span>·</span>
                  <span>{post.district}</span>
                  <span>·</span>
                  <span>{post.category}</span>
                </div>
                <h2 className="mt-1 text-sm font-semibold leading-snug text-gray-800 group-hover:text-primary">
                  {post.title}
                </h2>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-500">
                  {post.excerpt}
                </p>
                <StarRating rating={post.rating} />
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <Pagination page={page} totalPages={totalPages} />
    </div>
  )
}
