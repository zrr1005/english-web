import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMaterial, saveRecord } from '../utils/storage'
import SentencePractice from '../components/SentencePractice'
import ShadowMode from '../components/ShadowMode'
import type { TextMaterial, PracticeMode, SentenceAction, WordResult } from '../types'

export default function PracticePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [material, setMaterial] = useState<TextMaterial | null>(null)
  const [mode, setMode] = useState<PracticeMode>('practice')
  const [currentIdx, setCurrentIdx] = useState(0)
  const [actionsMap, setActionsMap] = useState<Map<number, SentenceAction[]>>(new Map())
  const [startTime] = useState(Date.now())

  useEffect(() => {
    if (id) getMaterial(id).then(m => { if (m) setMaterial(m); else navigate('/') })
  }, [id, navigate])

  const handleActionComplete = useCallback((action: SentenceAction) => {
    setActionsMap(prev => {
      const next = new Map(prev)
      const existing = next.get(action.sentenceIndex) || []
      next.set(action.sentenceIndex, [...existing.filter(a => a.actionType !== action.actionType), action])
      return next
    })
  }, [])

  function handleNext() {
    if (currentIdx < (material?.sentences.length || 0) - 1) setCurrentIdx(i => i + 1)
    else finishPractice()
  }

  function handlePrev() { if (currentIdx > 0) setCurrentIdx(i => i - 1) }

  function handleShadowComplete(results: { sentenceIndex: number; userInput: string; wordResults: WordResult[]; accuracy: number }[]) {
    const map = new Map<number, SentenceAction[]>()
    for (const r of results) map.set(r.sentenceIndex, [{ sentenceIndex: r.sentenceIndex, actionType: 'speak', userInput: r.userInput, wordResults: r.wordResults, accuracy: r.accuracy, timestamp: Date.now() }])
    setActionsMap(map); setMode('practice'); setCurrentIdx(0)
  }

  async function finishPractice() {
    const all: SentenceAction[] = []; for (const acts of actionsMap.values()) all.push(...acts)
    all.sort((a, b) => a.sentenceIndex - b.sentenceIndex)
    const score = all.length > 0 ? Math.round(all.reduce((s, a) => s + a.accuracy, 0) / all.length) : 0
    const record = { id: crypto.randomUUID(), materialId: material!.id, actions: all, overallScore: score, duration: Date.now() - startTime, createdAt: Date.now() }
    await saveRecord(record); navigate(`/report/${record.id}`)
  }

  if (!material) return <div className="text-center py-24 text-ink-300 font-display text-lg">Loading…</div>

  const sentences = material.sentences

  function dotState(idx: number): 'empty' | 'partial' | 'done' {
    const acts = actionsMap.get(idx)
    if (!acts || acts.length === 0) return 'empty'
    if (acts.length >= 3) return 'done'
    return 'partial'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <button onClick={() => navigate('/library')} className="text-sm text-ink-300 hover:text-ink-600 transition-colors shrink-0">
            ← Library
          </button>
          <h1 className="font-display text-xl font-bold text-ink-700 truncate">{material.title}</h1>
        </div>
        <button onClick={() => setMode(mode === 'shadow' ? 'practice' : 'shadow')}
          className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
            mode === 'shadow'
              ? 'bg-ink-700 text-white border-ink-700'
              : 'bg-white text-ink-400 border-paper-300 hover:border-amber-300 hover:text-ink-600'
          }`}>
          {mode === 'shadow' ? '📖 Sentence Mode' : '🎭 Shadow Mode'}
        </button>
      </div>

      {mode === 'shadow' ? (
        <ShadowMode key={`shadow-${startTime}`} sentences={sentences} onComplete={handleShadowComplete} />
      ) : (
        <>
          <SentencePractice
            key={`sp-${currentIdx}`}
            sentence={sentences[currentIdx]}
            sentenceIndex={currentIdx}
            totalSentences={sentences.length}
            existingActions={actionsMap.get(currentIdx) || []}
            onActionComplete={handleActionComplete}
            onNext={handleNext}
            onPrev={handlePrev}
          />

          {/* Sentence dots */}
          <div className="flex justify-center gap-1.5 flex-wrap pt-4">
            {sentences.map((_, i) => {
              const s = dotState(i)
              return (
                <button key={i} onClick={() => setCurrentIdx(i)}
                  className={`rounded-full transition-all duration-200 ${
                    i === currentIdx
                      ? 'w-2.5 h-2.5 bg-ink-700 scale-125 ring-2 ring-amber-200'
                      : s === 'done' ? 'w-2 h-2 bg-sage-400'
                      : s === 'partial' ? 'w-2 h-2 bg-amber-400'
                      : 'w-2 h-2 bg-paper-300 hover:bg-paper-400'
                  }`}
                  title={`Sentence ${i + 1}${s === 'done' ? ' ✓' : s === 'partial' ? ' ~' : ''}`} />
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
