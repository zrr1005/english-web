import { Link, useLocation } from 'react-router-dom'
import { hasLLM } from '../utils/llm'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <div className="min-h-screen flex flex-col">
      <header className={`
        sticky top-0 z-50 transition-all duration-300
        ${isHome
          ? 'bg-paper-100/80 backdrop-blur-sm'
          : 'bg-white/90 backdrop-blur-sm border-b border-paper-300 shadow-sm'
        }
      `}>
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <span className="text-2xl transition-transform group-hover:scale-110 duration-200">
              📖
            </span>
            <span className="font-display text-xl font-bold text-ink-700 tracking-tight">
              SpeakEasy
            </span>
          </Link>
          <nav className="flex gap-6 text-sm font-medium items-center">
            <Link
              to="/"
              className={`transition-colors duration-200 ${
                pathname === '/'
                  ? 'text-amber-500'
                  : 'text-ink-300 hover:text-ink-600'
              }`}
            >
              首页
            </Link>
            <Link
              to="/library"
              className={`transition-colors duration-200 ${
                pathname === '/library'
                  ? 'text-amber-500'
                  : 'text-ink-300 hover:text-ink-600'
              }`}
            >
              素材库
            </Link>
            <Link
              to="/settings"
              className={`transition-colors duration-200 text-lg ${
                pathname === '/settings'
                  ? 'text-amber-500'
                  : hasLLM()
                  ? 'text-sage-500'
                  : 'text-ink-300 hover:text-ink-600'
              }`}
              title="设置"
            >
              ⚙
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-4xl mx-auto px-6 py-8 w-full">
        {children}
      </main>
      <footer className="text-center py-6 text-xs text-ink-200 font-medium tracking-wide">
        SpeakEasy — 用你喜欢的内容练英语口语
      </footer>
    </div>
  )
}
