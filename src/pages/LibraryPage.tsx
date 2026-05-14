import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllMaterials, deleteMaterial, getDictationScore, getShadowScore } from '../utils/storage'
import type { MaterialWithScores, TextMaterial } from '../types'

export default function LibraryPage() {
  const [materials, setMaterials] = useState<MaterialWithScores[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const raw = await getAllMaterials()
      const enriched = await Promise.all(
        raw.map(async (m) => ({
          ...m,
          dictationScore: await getDictationScore(m.id),
          shadowScore: await getShadowScore(m.id),
        }))
      )
      setMaterials(enriched)
      setLoading(false)
    }
    load()
  }, [])

  async function handleDelete(id: string) {
    await deleteMaterial(id)
    setMaterials((prev) => prev.filter((m) => m.id !== id))
  }

  if (loading) {
    return <div className="text-center py-24 text-ink-300 font-display text-lg">Loading…</div>
  }

  if (materials.length === 0) {
    return (
      <div className="text-center py-24 space-y-5">
        <div className="text-6xl">📚</div>
        <h2 className="font-display text-2xl font-bold text-ink-600">Your library is empty</h2>
        <p className="text-ink-300">Import some content to get started.</p>
        <button onClick={() => navigate('/')}
          className="inline-block px-6 py-3 bg-ink-700 hover:bg-ink-800 text-white rounded-full text-sm font-semibold transition-all hover:shadow-lg">
          Import Content →
        </button>
      </div>
    )
  }

  const sourceIcon: Record<string, string> = { paste: '✏️', srt: '🎬', vtt: '🎬', txt: '📄', bilibili: '📺' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-ink-700">My Materials</h1>
        <button onClick={() => navigate('/')}
          className="px-5 py-2.5 bg-ink-700 hover:bg-ink-800 text-white rounded-full text-sm font-semibold transition-all hover:shadow-lg">
          + Import
        </button>
      </div>

      <div className="grid gap-3">
        {materials.map((m) => (
          <div key={m.id}
            className="group bg-white rounded-xl border border-paper-300 hover:border-amber-300 hover:shadow-md transition-all duration-200"
          >
            {/* Main row: click name → full-text listening */}
            <div
              onClick={() => navigate(`/listen/${m.id}`)}
              className="flex items-center justify-between p-5 cursor-pointer"
            >
              <div className="space-y-1 min-w-0">
                <h3 className="font-display text-lg font-bold text-ink-700 group-hover:text-amber-600 transition-colors">
                  {m.title}
                </h3>
                <p className="text-xs text-ink-300 flex items-center gap-2">
                  <span>{sourceIcon[m.source] || '📄'}</span>
                  <span>{m.sentences.length} sentences</span>
                  <span>·</span>
                  <span>{m.totalWords} words</span>
                  <span>·</span>
                  <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                </p>
              </div>

              {/* Scores */}
              <div className="flex items-center gap-6 shrink-0 ml-4">
                <ScoreBadge label="Dictation" score={m.dictationScore}
                  onClick={(e) => { e.stopPropagation(); navigate(`/listen/${m.id}?mode=dictation`) }} />
                <ScoreBadge label="Shadow" score={m.shadowScore}
                  onClick={(e) => { e.stopPropagation(); navigate(`/listen/${m.id}?mode=shadow`) }} />
              </div>
            </div>

            {/* Delete button — visible on hover */}
            <div className="px-5 pb-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(m.id) }}
                className="text-xs text-ink-300 hover:text-rust-500 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScoreBadge({ label, score, onClick }: { label: string; score: number | null; onClick: (e: React.MouseEvent) => void }) {
  return (
    <div onClick={onClick} className="text-center cursor-pointer hover:scale-105 transition-transform">
      <div className={`text-xl font-bold font-mono ${
        score !== null
          ? score >= 80 ? 'text-sage-600' : score >= 50 ? 'text-amber-600' : 'text-rust-500'
          : 'text-ink-200'
      }`}>
        {score !== null ? `${score}%` : '—'}
      </div>
      <div className="text-[10px] text-ink-300 uppercase tracking-wider font-semibold">{label}</div>
    </div>
  )
}
