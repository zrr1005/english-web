import { Link, useLocation } from 'react-router-dom'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-indigo-400">
            <span className="text-2xl">🎙️</span>
            <span>SpeakEasy</span>
          </Link>
          <nav className="flex gap-6 text-sm">
            <Link
              to="/"
              className={pathname === '/' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}
            >
              Home
            </Link>
            <Link
              to="/library"
              className={pathname === '/library' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}
            >
              Library
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
