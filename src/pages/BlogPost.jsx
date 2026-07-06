import { Link, Navigate, useParams } from 'react-router-dom'
import { usePageMeta } from '../hooks/usePageMeta'
import { BLOG_TOTAL, getBlogPostBySlug } from '../content/blogReviews'

export default function BlogPost() {
  const { slug } = useParams()
  const post = getBlogPostBySlug(slug)

  usePageMeta({
    title: post?.title ?? '맛집 리뷰',
    description: post?.excerpt ?? '런치각 맛집 리뷰 블로그',
    path: post ? `/blog/${post.slug}` : '/blog',
  })

  if (!post) return <Navigate to="/blog" replace />

  const listPage = Math.ceil(post.id / 24)

  return (
    <article className="px-6 py-8">
      <Link to={`/blog?page=${listPage}`} className="text-xs text-gray-400 hover:text-primary">
        ← 블로그 목록
      </Link>

      <img
        src={post.imageUrl}
        alt={`${post.restaurant} ${post.menus[0]} 사진`}
        className="mt-4 w-full rounded-xl object-cover"
        width={640}
        height={400}
      />

      <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
        {post.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
            #{tag}
          </span>
        ))}
      </div>

      <h1 className="mt-3 text-xl font-bold leading-snug text-gray-900">{post.title}</h1>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
        <span>{post.date}</span>
        <span>·</span>
        <span>{post.author}</span>
        <span>·</span>
        <span>★ {post.rating.toFixed(1)}</span>
        <span>·</span>
        <span>{post.price.toLocaleString()}원대</span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-3 text-xs">
        <div>
          <dt className="text-gray-400">식당</dt>
          <dd className="font-medium text-gray-800">{post.restaurant}</dd>
        </div>
        <div>
          <dt className="text-gray-400">지역</dt>
          <dd className="font-medium text-gray-800">{post.district}</dd>
        </div>
        <div>
          <dt className="text-gray-400">종류</dt>
          <dd className="font-medium text-gray-800">{post.category}</dd>
        </div>
        <div>
          <dt className="text-gray-400">웨이팅</dt>
          <dd className="font-medium text-gray-800">
            {post.waitMin > 10 ? `약 ${post.waitMin}분` : '거의 없음'}
          </dd>
        </div>
      </dl>

      <div className="mt-6 space-y-4 text-sm leading-relaxed text-gray-700">
        {post.body.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      <p className="mt-6 text-[11px] text-gray-400">
        리뷰 #{post.id} / {BLOG_TOTAL.toLocaleString()} · 본 글은 런치각 편집팀의 가상 체험
        리뷰입니다.
      </p>

      <div className="mt-8 flex gap-3">
        {post.id > 1 && (
          <Link
            to={`/blog/review-${post.id - 1}`}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-center text-xs text-gray-600"
          >
            ← 이전 글
          </Link>
        )}
        {post.id < BLOG_TOTAL && (
          <Link
            to={`/blog/review-${post.id + 1}`}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-center text-xs text-gray-600"
          >
            다음 글 →
          </Link>
        )}
      </div>
    </article>
  )
}
