import { Link, useLocation } from 'react-router-dom'

const FOOTER_LINKS = [
  { to: '/about', label: '서비스 소개' },
  { to: '/blog', label: '맛집 블로그' },
  { to: '/guide', label: '점심 가이드' },
  { to: '/privacy', label: '개인정보처리방침' },
  { to: '/terms', label: '이용약관' },
  { to: '/contact', label: '문의하기' },
]

export default function SiteLayout({ children }) {
  const { pathname } = useLocation()
  const isAppFlow = pathname === '/quiz' || pathname === '/result'
  const isWide = /^\/(about|privacy|terms|contact|guide|blog|location|share)/.test(pathname)

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-gray-200/80 bg-bg/95 backdrop-blur-sm">
        <div
          className={`mx-auto flex items-center justify-between px-6 py-4 ${isWide ? 'max-w-2xl' : 'max-w-sm'}`}
        >
          <Link to="/" className="text-lg font-bold text-primary">
            런치각
          </Link>
          {!isAppFlow && (
            <nav className="flex gap-3 text-xs text-gray-600">
              <Link to="/quiz" className="hover:text-primary">
                추천받기
              </Link>
              <Link to="/guide" className="hover:text-primary">
                가이드
              </Link>
              <Link to="/blog" className="hover:text-primary">
                블로그
              </Link>
              <Link to="/about" className="hover:text-primary">
                소개
              </Link>
            </nav>
          )}
        </div>
      </header>

      <main className={`mx-auto w-full flex-1 ${isWide ? 'max-w-2xl' : 'max-w-sm'}`}>{children}</main>

      <footer className="mt-auto border-t border-gray-200 bg-white/60">
        <div className={`mx-auto px-6 py-8 ${isWide ? 'max-w-2xl' : 'max-w-sm'}`}>
          <p className="text-sm font-semibold text-primary">런치각 LunchGAK</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            직장인을 위한 점심·회식 맛집 추천 서비스입니다. 위치·날씨·기분에 맞는
            근처 식당을 AI가 골라 드립니다.
          </p>
          <nav className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
            {FOOTER_LINKS.map(({ to, label }) => (
              <Link key={to} to={to} className="underline-offset-2 hover:text-primary hover:underline">
                {label}
              </Link>
            ))}
          </nav>
          <p className="mt-4 text-[11px] text-gray-400">
            © {new Date().getFullYear()} LunchGAK. 카카오맵·네이버 검색 API·Google Gemini를
            활용합니다.
          </p>
        </div>
      </footer>
    </div>
  )
}
