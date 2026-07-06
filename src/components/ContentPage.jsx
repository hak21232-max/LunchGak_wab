import { Link } from 'react-router-dom'
import { usePageMeta } from '../hooks/usePageMeta'

export default function ContentPage({ title, description, path, children, backTo = '/guide' }) {
  usePageMeta({ title, description, path })

  return (
    <article className="px-6 py-8">
      {backTo && (
        <Link to={backTo} className="text-xs text-gray-400 hover:text-primary">
          ← 목록으로
        </Link>
      )}
      <h1 className="mt-2 text-2xl font-bold text-primary">{title}</h1>
      <div className="prose-lunch mt-6 space-y-4 text-sm leading-relaxed text-gray-700">
        {children}
      </div>
    </article>
  )
}

export function ContentSection({ title, children }) {
  return (
    <section>
      {title && <h2 className="mb-2 text-base font-bold text-gray-800">{title}</h2>}
      {children}
    </section>
  )
}

export function ContentList({ items }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}
